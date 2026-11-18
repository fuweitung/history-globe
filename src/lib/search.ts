import { EVENTS, PEOPLE, PERSON_ROLES, POLITIES, POLITY_BY_ID, ROUTES, ROUTE_KINDS, eventDetails, formatSpan, formatYear, getLoadedPolity, isActive, loadAllPolities, loadEventDetails, loadPeopleDetails, personDetails } from './data';
import type { KnownForKind } from '../types';
import { CHECKLIST_SCHEMA } from './checklistSchema';

/** Lower-case, strip accents and Polynesian/okina marks so "dai viet" finds "Đại Việt" and "tui tonga" finds "Tuʻi Tonga". */
export function norm(s: string): string {
  return s
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ʻʼ’‘'`]/g, '')
    .toLowerCase();
}

export type SearchHit =
  | { kind: 'polity'; id: string; title: string; sub: string; score: number }
  | { kind: 'known'; polityId: string; kfKind: KnownForKind; title: string; sub: string; year?: number; score: number }
  | { kind: 'event'; id: string; title: string; sub: string; year: number; score: number }
  | { kind: 'route'; id: string; title: string; sub: string; year: number; score: number }
  | { kind: 'person'; id: string; title: string; sub: string; year: number; score: number }
  | { kind: 'fact'; polityId: string; category: string; title: string; sub: string; text: string; score: number };

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

interface Doc {
  hit: DistributiveOmit<SearchHit, 'score'>;
  title: string; // normalised
  body: string; // normalised
  /** Years in which the thing existed or happened, for ranking hits from the selected year first. */
  span?: [number, number];
}

function buildIndex(): Doc[] {
  const docs: Doc[] = [];
  for (const p of POLITIES) {
    docs.push({
      hit: { kind: 'polity', id: p.id, title: p.name, sub: `${formatSpan(p)} · ${p.region}` },
      title: norm(p.name),
      span: [p.startYear, p.endYear ?? Infinity],
      // Long texts (summary, known-for notes, descriptions) are included once loaded; see loadFactIndex.
      body: norm([p.region, p.capital, getLoadedPolity(p.id)?.summary ?? '', ...(p.knownFor ?? []).map((k) => k.label)].join(' ')),
    });
    for (const k of p.knownFor ?? []) {
      docs.push({
        hit: { kind: 'known', polityId: p.id, kfKind: k.kind, title: k.label, sub: p.name, year: k.year },
        title: norm(k.label),
        body: norm(`${getLoadedPolity(p.id)?.knownFor?.find((x) => x.label === k.label)?.note ?? ''} ${p.name}`),
      });
    }
  }
  for (const e of EVENTS) {
    const names = e.relatedPolityIds.map((id) => POLITY_BY_ID.get(id)?.name ?? '').join(' ');
    docs.push({
      hit: { kind: 'event', id: e.id, title: e.title, sub: formatYear(e.year, e.yearApproximate), year: e.year },
      title: norm(e.title),
      span: [e.year, e.endYear ?? e.year],
      body: norm(`${eventDetails(e.id)?.description ?? ''} ${names}`),
    });
  }
  for (const p of PEOPLE) {
    docs.push({
      hit: { kind: 'person', id: p.id, title: p.name, sub: `${PERSON_ROLES[p.role].label} · ${formatYear(p.born)} – ${formatYear(p.died)}`, year: p.born },
      title: norm(p.name),
      span: [p.born, p.died],
      body: norm(`${personDetails(p.id)?.description ?? ''} ${PERSON_ROLES[p.role].label} ${p.polityIds.map((id) => POLITY_BY_ID.get(id)?.name ?? '').join(' ')}`),
    });
  }
  for (const r of ROUTES) {
    docs.push({
      hit: { kind: 'route', id: r.id, title: r.name, sub: `${ROUTE_KINDS[r.kind].label} · ${formatYear(r.from)} – ${formatYear(r.to)}`, year: r.from },
      title: norm(r.name),
      span: [r.from, r.to],
      body: norm(`${r.description} ${r.goods ?? ''} ${ROUTE_KINDS[r.kind].label}`),
    });
  }
  return docs;
}

// Checklist answers (“El Niño” → Valdivia › Disasters) need every civilisation's full
// file, so they are indexed separately once those have loaded. Data-quality notes are left out.
let FACTS: Doc[] | null = null;
let factsPromise: Promise<void> | null = null;

/** Loads all checklists and long texts, indexes checklist answers and refreshes the main index (once). */
export function loadFactIndex(): Promise<void> {
  factsPromise ??= Promise.all([loadAllPolities(), loadEventDetails(), loadPeopleDetails()]).then(([all]) => {
    INDEX = null; // rebuild the main index with the long texts that have now loaded
    const docs: Doc[] = [];
    for (const p of all) {
      for (const cat of CHECKLIST_SCHEMA) {
        if (cat.key === 'dataQuality') continue;
        for (const f of cat.fields) {
          const it = (p.checklist[cat.key] as unknown as Record<string, { value: unknown } | undefined>)[f.key];
          const text = it?.value == null ? '' : String(it.value);
          if (!text.trim()) continue;
          docs.push({
            hit: { kind: 'fact', polityId: p.id, category: cat.key, title: `${p.name} · ${f.label}`, sub: cat.label, text },
            title: '',
            body: norm(text),
          });
        }
      }
    }
    FACTS = docs;
  });
  factsPromise.catch(() => (factsPromise = null));
  return factsPromise;
}

export const factIndexReady = () => FACTS !== null;

let INDEX: Doc[] | null = null;

const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Every word of the query must appear somewhere; title matches rank higher, and so do things
 * that exist in `year`. Titles match at the start of a word (so "byzan" finds the Byzantine Empire
 * while typing); longer texts only match whole words, with a plural "s"/"es" allowed, so "Ming"
 * no longer finds "coming" or "Domingo". Words of five letters or more also match the start of a
 * word in longer texts ("indigen" finds "indigenous").
 */
export function search(query: string, year?: number): { polities: SearchHit[]; known: SearchHit[]; events: SearchHit[]; routes: SearchHit[]; people: SearchHit[]; facts: SearchHit[] } {
  const words = norm(query).split(/\s+/).filter(Boolean);
  const out = { polities: [] as SearchHit[], known: [] as SearchHit[], events: [] as SearchHit[], routes: [] as SearchHit[], people: [] as SearchHit[], facts: [] as SearchHit[] };
  if (!words.length) return out;
  INDEX ??= buildIndex();
  // One word-start pattern per query word (not per document).
  const starts = words.map((w) => new RegExp(`(^|[^a-z0-9])${escape(w)}`));
  const wholeWords = words.map((w) => new RegExp(`(^|[^a-z0-9])${escape(w)}(s|es)?($|[^a-z0-9])`));
  const phrase = words.join(' ');
  for (const d of FACTS ? [INDEX, FACTS] : [INDEX]) for (const doc of d) scoreDoc(doc);
  function scoreDoc(d: Doc) {
    let score = 0;
    let all = true;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (d.title.startsWith(w)) score += 6;
      else if (wholeWords[i].test(d.title)) score += 5;
      else if (starts[i].test(d.title)) score += 4;
      else if (wholeWords[i].test(d.body) || (w.length >= 5 && starts[i].test(d.body))) score += 1;
      else {
        all = false;
        break;
      }
    }
    if (!all) return;
    // Whole phrase found together ranks higher (“el nino” beats “el … nino”).
    if (words.length > 1 && d.body.includes(phrase)) score += 2;
    // Things that exist in the selected year come first.
    if (year !== undefined && d.span && year >= d.span[0] && year <= d.span[1]) score += 3;
    else if (year !== undefined && d.hit.kind === 'known' && isActive(POLITY_BY_ID.get(d.hit.polityId)!, year)) score += 3;
    const hit = { ...d.hit, score } as SearchHit;
    if (hit.kind === 'polity') out.polities.push(hit);
    else if (hit.kind === 'known') out.known.push(hit);
    else if (hit.kind === 'route') out.routes.push(hit);
    else if (hit.kind === 'person') out.people.push(hit);
    else if (hit.kind === 'fact') out.facts.push(hit);
    else out.events.push(hit);
  }
  const by = (a: SearchHit, b: SearchHit) => b.score - a.score || a.title.localeCompare(b.title);
  out.polities.sort(by);
  out.known.sort(by);
  out.events.sort(by);
  out.routes.sort(by);
  out.people.sort(by);
  out.facts.sort(by);
  return out;
}

/** A short piece of `text` around the first query word, for showing a checklist match. */
export function snippet(text: string, query: string, radius = 60): string {
  const words = norm(query).split(/\s+/).filter(Boolean);
  // Normalise character by character, remembering where each normalised character
  // came from: removed marks (ʻ, ’, accents) would otherwise shift the position.
  let n = '';
  const origin: number[] = [];
  for (let i = 0; i < text.length; ) {
    const ch = String.fromCodePoint(text.codePointAt(i)!);
    const m = norm(ch);
    for (let k = 0; k < m.length; k++) origin.push(i);
    n += m;
    i += ch.length;
  }
  origin.push(text.length);
  const hitAt = Math.min(...words.map((w) => n.indexOf(w)).filter((i) => i >= 0), n.length);
  const at = origin[hitAt] ?? 0;
  if (text.length <= radius * 2) return text;
  const from = Math.max(0, at - radius);
  const to = Math.min(text.length, at + radius);
  return `${from > 0 ? '…' : ''}${text.slice(from, to).trim()}${to < text.length ? '…' : ''}`;
}

import { EVENTS, PEOPLE, PERSON_ROLES, POLITIES, POLITY_BY_ID, ROUTES, ROUTE_KINDS, formatSpan, formatYear, loadAllPolities } from './data';
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
}

function buildIndex(): Doc[] {
  const docs: Doc[] = [];
  for (const p of POLITIES) {
    docs.push({
      hit: { kind: 'polity', id: p.id, title: p.name, sub: `${formatSpan(p)} · ${p.region}` },
      title: norm(p.name),
      body: norm([p.region, p.capital, p.summary ?? '', ...(p.knownFor ?? []).map((k) => k.label)].join(' ')),
    });
    for (const k of p.knownFor ?? []) {
      docs.push({
        hit: { kind: 'known', polityId: p.id, kfKind: k.kind, title: k.label, sub: p.name, year: k.year },
        title: norm(k.label),
        body: norm(`${k.note ?? ''} ${p.name}`),
      });
    }
  }
  for (const e of EVENTS) {
    const names = e.relatedPolityIds.map((id) => POLITY_BY_ID.get(id)?.name ?? '').join(' ');
    docs.push({
      hit: { kind: 'event', id: e.id, title: e.title, sub: formatYear(e.year, e.yearApproximate), year: e.year },
      title: norm(e.title),
      body: norm(`${e.description} ${names}`),
    });
  }
  for (const p of PEOPLE) {
    docs.push({
      hit: { kind: 'person', id: p.id, title: p.name, sub: `${PERSON_ROLES[p.role].label} · ${formatYear(p.born)} – ${formatYear(p.died)}`, year: p.born },
      title: norm(p.name),
      body: norm(`${p.description} ${PERSON_ROLES[p.role].label} ${p.polityIds.map((id) => POLITY_BY_ID.get(id)?.name ?? '').join(' ')}`),
    });
  }
  for (const r of ROUTES) {
    docs.push({
      hit: { kind: 'route', id: r.id, title: r.name, sub: `${ROUTE_KINDS[r.kind].label} · ${formatYear(r.from)} – ${formatYear(r.to)}`, year: r.from },
      title: norm(r.name),
      body: norm(`${r.description} ${r.goods ?? ''} ${ROUTE_KINDS[r.kind].label}`),
    });
  }
  return docs;
}

// Checklist answers (“El Niño” → Valdivia › Disasters) need every civilisation's full
// file, so they are indexed separately once those have loaded. Data-quality notes are left out.
let FACTS: Doc[] | null = null;
let factsPromise: Promise<void> | null = null;

/** Loads all checklists and indexes their answers (once). */
export function loadFactIndex(): Promise<void> {
  factsPromise ??= loadAllPolities().then((all) => {
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

/** Every word of the query must appear somewhere; title matches rank higher. */
export function search(query: string): { polities: SearchHit[]; known: SearchHit[]; events: SearchHit[]; routes: SearchHit[]; people: SearchHit[]; facts: SearchHit[] } {
  const words = norm(query).split(/\s+/).filter(Boolean);
  const out = { polities: [] as SearchHit[], known: [] as SearchHit[], events: [] as SearchHit[], routes: [] as SearchHit[], people: [] as SearchHit[], facts: [] as SearchHit[] };
  if (!words.length) return out;
  INDEX ??= buildIndex();
  // One word-start pattern per query word (not per document).
  const starts = words.map((w) => new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  const phrase = words.join(' ');
  for (const d of FACTS ? [INDEX, FACTS] : [INDEX]) for (const doc of d) scoreDoc(doc);
  function scoreDoc(d: Doc) {
    let score = 0;
    let all = true;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (d.title.startsWith(w)) score += 6;
      else if (starts[i].test(d.title)) score += 4;
      else if (d.title.includes(w)) score += 2;
      else if (d.body.includes(w)) score += 1;
      else {
        all = false;
        break;
      }
    }
    if (!all) return;
    // Whole phrase found together ranks higher (“el nino” beats “el … nino”).
    if (words.length > 1 && d.body.includes(phrase)) score += 2;
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
  const n = norm(text);
  const at = Math.max(0, Math.min(...words.map((w) => n.indexOf(w)).filter((i) => i >= 0), n.length));
  if (text.length <= radius * 2) return text;
  const from = Math.max(0, at - radius);
  const to = Math.min(text.length, at + radius);
  return `${from > 0 ? '…' : ''}${text.slice(from, to).trim()}${to < text.length ? '…' : ''}`;
}

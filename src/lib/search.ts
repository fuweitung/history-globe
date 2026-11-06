import { EVENTS, POLITIES, POLITY_BY_ID, formatSpan, formatYear } from './data';
import type { KnownForKind } from '../types';

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
  | { kind: 'event'; id: string; title: string; sub: string; year: number; score: number };

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
  return docs;
}

let INDEX: Doc[] | null = null;

/** Every word of the query must appear somewhere; title matches rank higher. */
export function search(query: string): { polities: SearchHit[]; known: SearchHit[]; events: SearchHit[] } {
  const words = norm(query).split(/\s+/).filter(Boolean);
  const out = { polities: [] as SearchHit[], known: [] as SearchHit[], events: [] as SearchHit[] };
  if (!words.length) return out;
  INDEX ??= buildIndex();
  for (const d of INDEX) {
    let score = 0;
    let all = true;
    for (const w of words) {
      if (d.title.startsWith(w)) score += 6;
      else if (new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(d.title)) score += 4;
      else if (d.title.includes(w)) score += 2;
      else if (d.body.includes(w)) score += 1;
      else {
        all = false;
        break;
      }
    }
    if (!all) continue;
    const hit = { ...d.hit, score } as SearchHit;
    if (hit.kind === 'polity') out.polities.push(hit);
    else if (hit.kind === 'known') out.known.push(hit);
    else out.events.push(hit);
  }
  const by = (a: SearchHit, b: SearchHit) => b.score - a.score || a.title.localeCompare(b.title);
  out.polities.sort(by);
  out.known.sort(by);
  out.events.sort(by);
  return out;
}

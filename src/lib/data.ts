import type { EventType, HistoryEvent, Polity, PolityLink } from '../types';
import { normaliseChecklist } from './checklistSchema';
import eventsJson from '../data/events.json';
import linksJson from '../data/links.json';

// Every file in src/data/polities/*.json becomes a polity.
// To add a civilisation, drop a new JSON file in that folder.
const polityModules = import.meta.glob<Polity>('../data/polities/*.json', {
  eager: true,
  import: 'default',
});

export const POLITIES: Polity[] = Object.values(polityModules)
  .map((p) => ({ ...p, checklist: normaliseChecklist(p.checklist) }))
  .sort((a, b) => a.startYear - b.startYear || a.name.localeCompare(b.name));

export const POLITY_BY_ID = new Map(POLITIES.map((p) => [p.id, p]));

export const EVENTS: HistoryEvent[] = (eventsJson as HistoryEvent[]).slice().sort((a, b) => a.year - b.year);
export const EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]));

export const LINKS: PolityLink[] = linksJson as PolityLink[];

export const MIN_YEAR = 1500;
export const MAX_YEAR = 2025;

export const ERA_BANDS = [
  { id: 'early_modern', label: 'Early Modern', from: 1500, to: 1800 },
  { id: 'modern', label: 'Modern', from: 1800, to: MAX_YEAR },
] as const;

export function isActive(p: Polity, year: number): boolean {
  return p.startYear <= year && (p.endYear ?? Infinity) >= year;
}

/** Distance in years from `year` to the polity's lifespan (0 if inside). */
export function yearsOutside(p: Polity, year: number): number {
  if (year < p.startYear) return p.startYear - year;
  const end = p.endYear ?? Infinity;
  if (year > end) return year - end;
  return 0;
}

export function eventsForPolity(id: string): HistoryEvent[] {
  return EVENTS.filter((e) => e.relatedPolityIds.includes(id));
}

export function linksForPolity(id: string) {
  return LINKS.filter((l) => l.fromPolityId === id || l.toPolityId === id);
}

export function formatYear(y: number | null | undefined, approximate = false): string {
  if (y === null || y === undefined) return 'present';
  const s = y < 0 ? `${-y} BCE` : String(y);
  return approximate ? `c. ${s}` : s;
}

export function formatSpan(p: Pick<Polity, 'startYear' | 'endYear' | 'datesApproximate'>): string {
  const a = p.datesApproximate ? '≈ ' : '';
  return `${a}${formatYear(p.startYear)} – ${formatYear(p.endYear)}`;
}

export const EVENT_TYPES: Record<EventType, { label: string; color: string; glyph: string }> = {
  war: { label: 'War & conflict', color: '#e0564b', glyph: '⚔' },
  invention: { label: 'Invention & science', color: '#3fa7d6', glyph: '✦' },
  person: { label: 'Key person', color: '#a77de8', glyph: '●' },
  disaster: { label: 'Disaster & disease', color: '#f0a43a', glyph: '▲' },
  trade: { label: 'Trade & economy', color: '#3dbf8a', glyph: '◆' },
  culture: { label: 'Culture & religion', color: '#e877b8', glyph: '❖' },
};

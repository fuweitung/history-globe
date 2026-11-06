import type { EventType, HistoryEvent, HistoryRoute, Person, PersonRole, Polity, PolityLink, RouteKind, Story, WikiImage } from '../types';
import { normaliseChecklist } from './checklistSchema';
import eventsJson from '../data/events.json';
import routesJson from '../data/routes.json';
import linksJson from '../data/links.json';
import imagesJson from '../data/images.json';
import peopleJson from '../data/people.json';
import storiesJson from '../data/stories.json';

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

const IMAGES = imagesJson as unknown as { polities: Record<string, WikiImage>; known: Record<string, WikiImage | null> };
export const polityImage = (id: string): WikiImage | undefined => IMAGES.polities[id];
export const knownImage = (polityId: string, label: string): WikiImage | undefined => IMAGES.known[`${polityId}|${label}`] ?? undefined;
export const wikiUrl = (title: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

export const PEOPLE: Person[] = (peopleJson as unknown as Person[]).slice().sort((a, b) => a.born - b.born);
export const PERSON_BY_ID = new Map(PEOPLE.map((p) => [p.id, p]));
export const peopleForPolity = (id: string) => PEOPLE.filter((p) => p.polityIds.includes(id));
export const PERSON_ROLES: Record<PersonRole, { label: string; icon: string }> = {
  ruler: { label: 'Ruler', icon: '👑' },
  military: { label: 'Military leader', icon: '⚔️' },
  thinker: { label: 'Thinker', icon: '💭' },
  religious: { label: 'Religious figure', icon: '🕊️' },
  scientist: { label: 'Scientist & inventor', icon: '🔭' },
  writer: { label: 'Writer', icon: '✒️' },
  artist: { label: 'Artist', icon: '🎨' },
  explorer: { label: 'Explorer', icon: '🧭' },
};

export const STORIES: Story[] = storiesJson as unknown as Story[];
export const STORY_BY_ID = new Map(STORIES.map((s) => [s.id, s]));

export const ROUTES: HistoryRoute[] = routesJson as unknown as HistoryRoute[];
export const ROUTE_BY_ID = new Map(ROUTES.map((r) => [r.id, r]));

/**
 * Route styling. Colours are the first three validated categorical slots (dark steps),
 * and every kind also has its own dash pattern so identity never relies on colour alone.
 */
export const ROUTE_KINDS: Record<RouteKind, { label: string; color: string; dash: number[] | null; sample: string }> = {
  trade: { label: 'Trade route', color: '#d95926', dash: null, sample: '──────' },
  voyage: { label: 'Voyage / exploration', color: '#3987e5', dash: [2.5, 1.5], sample: '─ ─ ─ ─' },
  migration: { label: 'Migration', color: '#199e70', dash: [0.3, 1.8], sample: '· · · · ·' },
  forced: { label: 'Forced migration', color: '#199e70', dash: [3, 1.2, 0.3, 1.2], sample: '── · ── ·' },
};

export { MIN_YEAR, MAX_YEAR, ERAS } from './timeScale';
import { ERAS } from './timeScale';

export const ERA_LABEL: Record<string, string> = Object.fromEntries(ERAS.map((e) => [e.id, e.label]));

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

/** 1250 BCE · 618 CE · 1644. "CE" is only added below 1000 to avoid ambiguity. */
export function formatYear(y: number | null | undefined, approximate = false): string {
  if (y === null || y === undefined) return 'present';
  const s = y < 0 ? `${-y} BCE` : y < 1000 ? `${y} CE` : String(y);
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

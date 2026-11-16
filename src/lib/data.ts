import type { EventSummary, EventType, FullPolity, HistoryEvent, HistoryRoute, Person, PersonRole, PersonSummary, Polity, PolityLink, PolitySummary, RouteKind, Story, WikiImage } from '../types';
import { normaliseChecklist } from './checklistSchema';
import polityIndex from 'virtual:polity-index';
import polityLoaders from 'virtual:polity-loaders';
import eventIndex from 'virtual:event-index';
import routesJson from '../data/routes.json';
import linksJson from '../data/links.json';
import personIndex from 'virtual:person-index';
import storiesJson from '../data/stories.json';

// ── Civilisations ────────────────────────────────────────────
// Every file in src/data/polities/*.json is a civilisation. To add one, drop a new
// JSON file in that folder. At startup only a small index of each file is loaded
// (see the polity-index plugin in vite.config.ts); the full checklist is fetched
// on demand with loadPolity().

export const POLITIES: PolitySummary[] = (polityIndex as PolitySummary[])
  .slice()
  .sort((a, b) => a.startYear - b.startYear || a.name.localeCompare(b.name));

export const POLITY_BY_ID = new Map(POLITIES.map((p) => [p.id, p]));

// Each civilisation's file arrives with its own picture credits (see vite.config.ts).
type PolityFile = { data: Polity; image: WikiImage | null; known: Record<string, WikiImage> };
const POLITY_PICTURES = new Map<string, Omit<PolityFile, 'data'>>();
const fullPolities = new Map<string, FullPolity>();
const pendingPolities = new Map<string, Promise<FullPolity>>();

/** The full civilisation if it has already been loaded, else undefined. */
export const getLoadedPolity = (id: string): FullPolity | undefined => fullPolities.get(id);

/** Loads one civilisation's full checklist and time series (cached). */
export function loadPolity(id: string): Promise<FullPolity> {
  const done = fullPolities.get(id);
  if (done) return Promise.resolve(done);
  let p = pendingPolities.get(id);
  if (!p) {
    const summary = POLITY_BY_ID.get(id);
    const loader = (polityLoaders as Record<string, () => Promise<{ default: PolityFile }>>)[id];
    if (!summary || !loader) return Promise.reject(new Error(`Unknown civilisation "${id}"`));
    p = loader().then(({ default: { data: raw, image, known } }) => {
      POLITY_PICTURES.set(id, { image, known });
      // The file's own fields win (the index drops long texts such as known-for notes).
      const full: FullPolity = { ...summary, ...raw, checklist: normaliseChecklist(raw.checklist), series: raw.series };
      fullPolities.set(id, full);
      return full;
    });
    p.finally(() => pendingPolities.delete(id)).catch(() => {});
    pendingPolities.set(id, p);
  }
  return p;
}

/** Loads every civilisation (used by checklist search). */
export const loadAllPolities = (): Promise<FullPolity[]> => Promise.all(POLITIES.map((p) => loadPolity(p.id)));

export const EVENTS: EventSummary[] = (eventIndex as EventSummary[]).slice().sort((a, b) => a.year - b.year);
export const EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]));

export const LINKS: PolityLink[] = linksJson as PolityLink[];

// ── Long texts of events and people (loaded on demand) ───────
type EventDetails = Pick<HistoryEvent, 'description' | 'source'>;
type PersonDetails = Pick<Person, 'description' | 'wikiTitle' | 'source' | 'image'>;
let EVENT_DETAILS: Map<string, EventDetails> | null = null;
let PERSON_DETAILS: Map<string, PersonDetails> | null = null;
let eventDetailsPromise: Promise<void> | null = null;
let personDetailsPromise: Promise<void> | null = null;

let EVENT_PICTURES: Record<string, WikiImage> = {};
let PERSON_PICTURES: Record<string, WikiImage> = {};

/** Loads every event's description, source and picture credit (one file, cached). */
export function loadEventDetails(): Promise<void> {
  eventDetailsPromise ??= import('virtual:event-details').then((m) => {
    const { details, images } = m.default as { details: Record<string, EventDetails>; images: Record<string, WikiImage> };
    EVENT_DETAILS = new Map(Object.entries(details));
    EVENT_PICTURES = images;
  });
  eventDetailsPromise.catch(() => (eventDetailsPromise = null));
  return eventDetailsPromise;
}
/** Loads every person's description, Wikipedia title, source and picture (one file, cached). */
export function loadPeopleDetails(): Promise<void> {
  personDetailsPromise ??= import('virtual:person-details').then((m) => {
    const { details, images } = m.default as { details: Record<string, PersonDetails>; images: Record<string, WikiImage> };
    PERSON_DETAILS = new Map(Object.entries(details));
    PERSON_PICTURES = images;
  });
  personDetailsPromise.catch(() => (personDetailsPromise = null));
  return personDetailsPromise;
}
export const eventDetailsLoaded = () => EVENT_DETAILS !== null;
export const peopleDetailsLoaded = () => PERSON_DETAILS !== null;
export const eventDetails = (id: string): EventDetails | undefined => EVENT_DETAILS?.get(id);
export const personDetails = (id: string): PersonDetails | undefined => PERSON_DETAILS?.get(id);

// ── Pictures (credits arrive with each on-demand file above) ───
/** undefined until that civilisation has loaded; null when it has no picture. */
export const polityImage = (id: string): WikiImage | null | undefined => (POLITY_PICTURES.has(id) ? POLITY_PICTURES.get(id)!.image : undefined);
export const knownImage = (polityId: string, label: string): WikiImage | undefined => POLITY_PICTURES.get(polityId)?.known[label];
export const personImage = (id: string): WikiImage | undefined => PERSON_PICTURES[id];
export const eventImage = (id: string): WikiImage | undefined => EVENT_PICTURES[id];
export const wikiUrl = (title: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

export const PEOPLE: PersonSummary[] = (personIndex as PersonSummary[]).slice().sort((a, b) => a.born - b.born);
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

export function isActive(p: Pick<Polity, 'startYear' | 'endYear'>, year: number): boolean {
  return p.startYear <= year && (p.endYear ?? Infinity) >= year;
}

/** Distance in years from `year` to the polity's lifespan (0 if inside). */
export function yearsOutside(p: Pick<Polity, 'startYear' | 'endYear'>, year: number): number {
  if (year < p.startYear) return p.startYear - year;
  const end = p.endYear ?? Infinity;
  if (year > end) return year - end;
  return 0;
}

export function eventsForPolity(id: string): EventSummary[] {
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

// ─────────────────────────────────────────────────────────────
// Core data model for History Globe.
// All data is static JSON for now; these types are the contract.
// ─────────────────────────────────────────────────────────────

/** Eras covered (see lib/timeScale.ts for their year ranges). */
export type Era = 'prehistory' | 'ancient' | 'medieval' | 'early_modern' | 'modern';

export type Certainty = 'confirmed' | 'estimated' | 'disputed';

/** One fact in a checklist. `value` empty/null means "not filled in yet". */
export interface ChecklistItem {
  value: string | number | null;
  /** Year (or start year) the fact refers to, if relevant. Negative = BCE. */
  year?: number | null;
  certainty?: Certainty;
  source?: string;
}

// ── The 10 checklist categories ──────────────────────────────

export interface GeographyEnvironment {
  location: ChecklistItem;
  terrain: ChecklistItem; // rivers, coastline, terrain
  climate: ChecklistItem; // climate and climate shifts
  resources: ChecklistItem;
  disasters: ChecklistItem;
}

export interface PopulationHealth {
  population: ChecklistItem; // size and growth
  urbanisation: ChecklistItem;
  disease: ChecklistItem;
  migration: ChecklistItem;
}

export interface Economy {
  economicBase: ChecklistItem;
  tradeRoutes: ChecklistItem; // routes and partners
  wealth: ChecklistItem; // GDP per person estimate
  moneyAndTax: ChecklistItem; // currency / taxes / debt / inflation
  inequality: ChecklistItem;
}

export interface PoliticsGovernment {
  governmentType: ChecklistItem;
  keyRulers: ChecklistItem;
  succession: ChecklistItem;
  institutions: ChecklistItem; // laws and institutions
  stability: ChecklistItem; // revolts, civil wars, coups
  eliteConflict: ChecklistItem; // corruption and elite infighting
}

export interface MilitaryConflict {
  armyAndTech: ChecklistItem;
  majorWars: ChecklistItem;
  territoryChange: ChecklistItem;
  alliancesRivals: ChecklistItem;
}

export interface TechnologyKnowledge {
  inventions: ChecklistItem; // key inventions or adoptions
  scienceEducation: ChecklistItem; // science / education / literacy
  openness: ChecklistItem; // openness to outside ideas
  communicationTransport: ChecklistItem; // roads, ships, messengers, post, telegraph
}

export interface CultureSociety {
  religion: ChecklistItem;
  languageWriting: ChecklistItem;
  artsArchitecture: ChecklistItem;
  socialStructure: ChecklistItem; // classes, slavery
  sharedIdentity: ChecklistItem;
  dailyLife: ChecklistItem; // housing, food, clothing, an ordinary day
}

export interface Connections {
  neighbours: ChecklistItem;
  ideasReligions: ChecklistItem;
  colonisation: ChecklistItem;
}

export interface RiseFall {
  riseSignals: ChecklistItem;
  peakPeriod: ChecklistItem;
  declineSignals: ChecklistItem;
  outcome: ChecklistItem; // collapse / conquest / transformation / successor
}

export interface DataQuality {
  sources: ChecklistItem;
  overallCertainty: ChecklistItem;
}

export interface Checklist {
  geography: GeographyEnvironment;
  population: PopulationHealth;
  economy: Economy;
  politics: PoliticsGovernment;
  military: MilitaryConflict;
  technology: TechnologyKnowledge;
  culture: CultureSociety;
  connections: Connections;
  riseFall: RiseFall;
  dataQuality: DataQuality;
}

export type CategoryKey = keyof Checklist;

// ── Polity ───────────────────────────────────────────────────

/** Reserved for the "rise-and-fall charts" phase (Maddison / OWID). */
export interface SeriesPoint {
  year: number;
  value: number;
  /** Range when the source gives one (value is then the midpoint). */
  low?: number;
  high?: number;
  /** True when the source gives only a century, so the year is a midpoint. */
  approxYear?: boolean;
  certainty?: Certainty;
}
export interface PolitySeries {
  population?: SeriesPoint[];
  territoryKm2?: SeriesPoint[];
  gdpPerCapita?: SeriesPoint[];
  sources?: string[];
  /** Caveats about what the figures cover. */
  notes?: string[];
}

/** Kinds of signature things a civilisation is remembered for. */
export type KnownForKind =
  | 'textile'      // special cloth or dress (silk, kente, cotton)
  | 'troops'       // special soldiers or units (legions, janissaries)
  | 'weapon'       // weapons and military tools
  | 'tool'         // inventions, tools, techniques
  | 'monument'     // buildings and monuments
  | 'art'          // artworks, crafts, music
  | 'idea'         // laws, writing, religions, philosophies
  | 'food'         // crops, foods and drinks
  | 'person';      // famous people

export interface KnownForItem {
  label: string;
  kind: KnownForKind;
  /** Approximate year, if useful. */
  year?: number;
  /** One short neutral sentence. */
  note?: string;
}

export interface Polity {
  id: string;
  name: string;
  era: Era;
  region: string;
  startYear: number;
  endYear: number | null; // null = still exists
  /** True when the start/end years are conventional or debated. */
  datesApproximate?: boolean;
  capital: string;
  /** [lng, lat] of the capital, used to fly the map to the polity. */
  capitalCoords?: [number, number];
  /** One- or two-sentence neutral summary. */
  summary?: string;
  /**
   * Names used for this polity in the historical-basemaps GeoJSON
   * (matched against NAME and SUBJECTO, case-insensitive).
   */
  borderNames?: string[];
  /**
   * Optional strict [from, to] window of snapshot years in which borderNames
   * apply. Use it when a name is shared across eras (e.g. "China", "France").
   * Without it, names match within the polity's lifetime ±10 years.
   */
  borderYears?: [number, number | null];
  /**
   * Optional per-name windows that override borderYears for one name, e.g.
   * { "Kenya": [1895, 1963] } on the British Empire. The name does not need to
   * be repeated in borderNames.
   */
  borderNameYears?: Record<string, [number, number | null]>;
  /**
   * Shapes that name this polity as their overlord (SUBJECTO) count as part of it
   * even when they have their own entry, e.g. the Mongol Empire and its khanates.
   * The shape keeps its own colour, label and click target. Opt-in, because the
   * source maps' overlord field is not always reliable.
   */
  includesSubjects?: boolean;
  /** Too small for the border maps: draw a clickable dot at the capital while the polity exists. */
  mapDot?: boolean;
  /** English Wikipedia article title (for links and pictures). */
  wikiTitle?: string;
  /** Brand colour used for the map highlight. */
  color?: string;
  checklist: Checklist;
  /** Signature culture: cloth, troops, tools, monuments… shown as chips. */
  knownFor?: KnownForItem[];
  /** Later phase: time series for charts. */
  series?: PolitySeries;
}

/** Completion of a checklist (filled items out of the template's total). */
export interface ChecklistCompletion {
  filled: number;
  total: number;
  ratio: number;
}

/**
 * What the app knows about every civilisation at startup (built by the
 * `virtual:polity-index` plugin in vite.config.ts): everything except the
 * checklist and the time series, plus a few values computed from them.
 */
export type PolitySummary = Omit<Polity, 'checklist' | 'series' | 'summary'> & {
  /** Year of the checklist's peak period, if it is a single number. */
  peakYear: number | null;
  completion: ChecklistCompletion;
};

/** A civilisation with its full checklist loaded (see loadPolity). */
export type FullPolity = PolitySummary & Polity;

// ── Events & Links ───────────────────────────────────────────

export type EventType = 'war' | 'invention' | 'person' | 'disaster' | 'trade' | 'culture';

export interface HistoryEvent {
  id: string;
  year: number;
  /** Optional end year for multi-year events (wars, famines). */
  endYear?: number;
  yearApproximate?: boolean;
  lat: number;
  lng: number;
  type: EventType;
  title: string;
  description: string;
  relatedPolityIds: string[];
  /** Where the facts come from (e.g. "Wikipedia: Korean War (checked 6 Nov 2026)"). */
  source?: string;
}

/** What the app knows about every event at startup (description and source load on demand). */
export type EventSummary = Omit<HistoryEvent, 'description' | 'source'>;

export type LinkRelation = 'succeeded' | 'conquered' | 'colonised' | 'traded_with' | 'allied_with';

export interface PolityLink {
  fromPolityId: string;
  toPolityId: string;
  relation: LinkRelation;
  year?: number;
  note?: string;
}

// ── Routes (trade, voyages, migrations) ──────────────────────

export type RouteKind = 'trade' | 'voyage' | 'migration' | 'forced';

export interface HistoryRoute {
  id: string;
  name: string;
  kind: RouteKind;
  from: number;
  to: number;
  datesApproximate?: boolean;
  /** One or more polylines of [lng, lat]; longitudes may exceed ±180 to cross the Pacific. */
  paths: [number, number][][];
  description: string;
  goods?: string;
  relatedPolityIds: string[];
  source: string;
}

// ── Pictures (Wikimedia Commons, freely licensed) ────────────

export interface WikiImage {
  src: string;
  file: string;
  /** Commons file page (credits and full licence). */
  page: string;
  artist: string;
  license: string;
  licenseUrl: string | null;
  caption: string | null;
  /** Wikipedia article the picture was taken from. */
  article: string;
}

// ── People ───────────────────────────────────────────────────

export type PersonRole = 'ruler' | 'military' | 'thinker' | 'religious' | 'scientist' | 'writer' | 'artist' | 'explorer';

export interface Person {
  id: string;
  name: string;
  born: number;
  died: number;
  datesApproximate?: boolean;
  role: PersonRole;
  /** Short description from Wikipedia. */
  description: string;
  polityIds: string[];
  /** [lng, lat] of the main place associated with them. */
  place: [number, number];
  wikiTitle: string;
  source: string;
  image?: WikiImage;
}

/** What the app knows about every person at startup (long texts load on demand). */
export type PersonSummary = Omit<Person, 'description' | 'wikiTitle' | 'source' | 'image'>;

// ── Stories (guided tours) ───────────────────────────────────

export interface StoryStep {
  title: string;
  year: number;
  text: string;
  /** What to show: the map flies to the first of route, person, event, polity, center. */
  polity?: string;
  event?: string;
  route?: string;
  person?: string;
  center?: [number, number];
  zoom?: number;
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  icon: string;
  steps: StoryStep[];
}

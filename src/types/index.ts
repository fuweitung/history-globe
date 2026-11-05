// ─────────────────────────────────────────────────────────────
// Core data model for History Globe.
// All data is static JSON for now; these types are the contract.
// ─────────────────────────────────────────────────────────────

/** Eras covered. Extend with "ancient" | "classical" | "medieval" later. */
export type Era = 'early_modern' | 'modern';

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
}

export interface CultureSociety {
  religion: ChecklistItem;
  languageWriting: ChecklistItem;
  artsArchitecture: ChecklistItem;
  socialStructure: ChecklistItem; // classes, slavery
  sharedIdentity: ChecklistItem;
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
  certainty?: Certainty;
}
export interface PolitySeries {
  population?: SeriesPoint[];
  territoryKm2?: SeriesPoint[];
  gdpPerCapita?: SeriesPoint[];
  sources?: string[];
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
  /** Brand colour used for the map highlight. */
  color?: string;
  checklist: Checklist;
  /** Later phase: time series for charts. */
  series?: PolitySeries;
}

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
}

export type LinkRelation = 'succeeded' | 'conquered' | 'colonised' | 'traded_with' | 'allied_with';

export interface PolityLink {
  fromPolityId: string;
  toPolityId: string;
  relation: LinkRelation;
  year?: number;
  note?: string;
}

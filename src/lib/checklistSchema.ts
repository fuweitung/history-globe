import type { CategoryKey, Checklist, ChecklistItem } from '../types';

/**
 * Single source of truth for the checklist's shape, labels and order.
 * The UI, the empty-template generator and the data validator all read this.
 */
export interface FieldDef {
  key: string;
  label: string;
  hint: string;
}
export interface CategoryDef {
  key: CategoryKey;
  label: string;
  icon: string;
  question: string; // the guiding "why" question for students
  fields: FieldDef[];
}

export const CHECKLIST_SCHEMA: CategoryDef[] = [
  {
    key: 'geography',
    label: 'Geography & environment',
    icon: '🗺️',
    question: 'What did the land, water and climate make possible — or difficult?',
    fields: [
      { key: 'location', label: 'Location', hint: 'Where was it centred?' },
      { key: 'terrain', label: 'Rivers, coastline & terrain', hint: 'Key rivers, coasts, mountains, chokepoints' },
      { key: 'climate', label: 'Climate & climate shifts', hint: 'Typical climate and any notable shifts' },
      { key: 'resources', label: 'Natural resources', hint: 'Farmland, metals, timber, spices…' },
      { key: 'disasters', label: 'Disasters', hint: 'Earthquakes, floods, droughts, famines' },
    ],
  },
  {
    key: 'population',
    label: 'Population & health',
    icon: '👥',
    question: 'How many people, where did they live, and what threatened them?',
    fields: [
      { key: 'population', label: 'Population size & growth', hint: 'Estimate at peak, with year' },
      { key: 'urbanisation', label: 'Urbanisation', hint: 'Major cities and their size' },
      { key: 'disease', label: 'Disease & plagues', hint: 'Epidemics and their impact' },
      { key: 'migration', label: 'Migration in & out', hint: 'Who arrived, who left, why' },
    ],
  },
  {
    key: 'economy',
    label: 'Economy',
    icon: '💰',
    question: 'How did it make, move and tax its wealth?',
    fields: [
      { key: 'economicBase', label: 'Economic base', hint: 'Agriculture, trade, manufacturing…' },
      { key: 'tradeRoutes', label: 'Trade routes & partners', hint: 'Main routes, goods and partners' },
      { key: 'wealth', label: 'Wealth (GDP per person)', hint: 'Estimate, e.g. Maddison Project' },
      { key: 'moneyAndTax', label: 'Currency, taxes, debt & inflation', hint: 'Fiscal system and money' },
      { key: 'inequality', label: 'Inequality', hint: 'How wealth was distributed' },
    ],
  },
  {
    key: 'politics',
    label: 'Politics & government',
    icon: '🏛️',
    question: 'Who ruled, how was power passed on, and how stable was it?',
    fields: [
      { key: 'governmentType', label: 'Government type', hint: 'Monarchy, republic, empire…' },
      { key: 'keyRulers', label: 'Key rulers', hint: 'Most significant leaders' },
      { key: 'succession', label: 'Succession method', hint: 'How power changed hands' },
      { key: 'institutions', label: 'Laws & institutions', hint: 'Legal codes, bureaucracy, councils' },
      { key: 'stability', label: 'Stability', hint: 'Revolts, civil wars, coups' },
      { key: 'eliteConflict', label: 'Corruption & elite infighting', hint: 'Factions and rivalries at the top' },
    ],
  },
  {
    key: 'military',
    label: 'Military & conflict',
    icon: '⚔️',
    question: 'How did it fight, and what did war win or lose?',
    fields: [
      { key: 'armyAndTech', label: 'Army size & military tech', hint: 'Size, organisation, weapons' },
      { key: 'majorWars', label: 'Major wars', hint: 'The wars that mattered most' },
      { key: 'territoryChange', label: 'Territory gained or lost', hint: 'Key expansions and losses' },
      { key: 'alliancesRivals', label: 'Alliances & rivals', hint: 'Main friends and enemies' },
    ],
  },
  {
    key: 'technology',
    label: 'Technology & knowledge',
    icon: '🔭',
    question: 'What did it invent, adopt, or refuse to adopt?',
    fields: [
      { key: 'inventions', label: 'Key inventions or adoptions', hint: 'Technologies created or borrowed' },
      { key: 'scienceEducation', label: 'Science, education & literacy', hint: 'Schools, scholars, literacy' },
      { key: 'openness', label: 'Openness to outside ideas', hint: 'Receptive or restrictive?' },
      { key: 'communicationTransport', label: 'Communication & transport', hint: 'Roads, ships, messengers, post, railways, telegraph, internet' },
    ],
  },
  {
    key: 'culture',
    label: 'Culture & society',
    icon: '🎭',
    question: 'What held people together, and what divided them?',
    fields: [
      { key: 'religion', label: 'Religion', hint: 'Main faiths and religious policy' },
      { key: 'languageWriting', label: 'Language & writing', hint: 'Languages and scripts' },
      { key: 'artsArchitecture', label: 'Art, architecture & literature', hint: 'Signature achievements' },
      { key: 'socialStructure', label: 'Social structure', hint: 'Classes, castes, slavery' },
      { key: 'sharedIdentity', label: 'Shared identity', hint: 'What made people feel they belonged' },
      { key: 'dailyLife', label: 'Housing & daily life', hint: 'Homes, food, clothing and an ordinary day' },
    ],
  },
  {
    key: 'connections',
    label: 'Connections',
    icon: '🔗',
    question: 'Who did it trade with, fight, learn from — or colonise?',
    fields: [
      { key: 'neighbours', label: 'Neighbours', hint: 'Trade, war and diplomacy' },
      { key: 'ideasReligions', label: 'Spread of ideas & religions', hint: 'What flowed in and out' },
      { key: 'colonisation', label: 'Colonisation', hint: 'As coloniser or colonised' },
    ],
  },
  {
    key: 'riseFall',
    label: 'Rise & fall markers',
    icon: '📈',
    question: 'What signals came before the rise — and before the decline?',
    fields: [
      { key: 'riseSignals', label: 'Rise signals', hint: 'Expanding territory, growing trade, strong institutions, new tech, population growth' },
      { key: 'peakPeriod', label: 'Peak period', hint: 'When and why it peaked' },
      { key: 'declineSignals', label: 'Decline signals', hint: 'Overstretched borders, fiscal crisis, elite conflict, plague, climate stress, invasion' },
      { key: 'outcome', label: 'Outcome', hint: 'Collapse, conquest, transformation, successor' },
    ],
  },
  {
    key: 'dataQuality',
    label: 'Data quality',
    icon: '🧾',
    question: 'How much do we really know, and from whom?',
    fields: [
      { key: 'sources', label: 'Overall sources', hint: 'Main references used' },
      { key: 'overallCertainty', label: 'Overall certainty', hint: 'How reliable is this entry overall?' },
    ],
  },
];

export const emptyItem = (): ChecklistItem => ({ value: null, year: null, certainty: undefined, source: '' });

/** Builds a fully-shaped empty checklist from the schema. */
export function emptyChecklist(): Checklist {
  const out: Record<string, Record<string, ChecklistItem>> = {};
  for (const cat of CHECKLIST_SCHEMA) {
    out[cat.key] = {};
    for (const f of cat.fields) out[cat.key][f.key] = emptyItem();
  }
  return out as unknown as Checklist;
}

/** Fills in any missing categories/items so partial JSON is always safe to render. */
export function normaliseChecklist(input: unknown): Checklist {
  const base = emptyChecklist() as unknown as Record<string, Record<string, ChecklistItem>>;
  const src = (input ?? {}) as Record<string, Record<string, Partial<ChecklistItem>> | undefined>;
  for (const cat of CHECKLIST_SCHEMA) {
    for (const f of cat.fields) {
      const given = src[cat.key]?.[f.key];
      if (given) base[cat.key][f.key] = { ...base[cat.key][f.key], ...given };
    }
  }
  return base as unknown as Checklist;
}

export function getItem(checklist: Checklist, cat: CategoryKey, field: string): ChecklistItem {
  return (checklist[cat] as unknown as Record<string, ChecklistItem>)[field];
}

export function isFilled(item: ChecklistItem | undefined): boolean {
  if (!item) return false;
  const v = item.value;
  return v !== null && v !== undefined && String(v).trim() !== '';
}

export interface Completion {
  filled: number;
  total: number;
  ratio: number;
}

export function categoryCompletion(checklist: Checklist, cat: CategoryDef): Completion {
  const total = cat.fields.length;
  const filled = cat.fields.filter((f) => isFilled(getItem(checklist, cat.key, f.key))).length;
  return { filled, total, ratio: total ? filled / total : 0 };
}

export function overallCompletion(checklist: Checklist): Completion {
  let filled = 0;
  let total = 0;
  for (const cat of CHECKLIST_SCHEMA) {
    const c = categoryCompletion(checklist, cat);
    filled += c.filled;
    total += c.total;
  }
  return { filled, total, ratio: total ? filled / total : 0 };
}

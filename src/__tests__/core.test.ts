import { describe, expect, it } from 'vitest';
import { ERAS, MAX_YEAR, MIN_YEAR, eraOf, fracToYear, normaliseYear, stepYear, yearToFrac } from '../lib/timeScale';
import { EVENT_BY_ID, POLITY_BY_ID, eventDetails, formatYear, isActive, loadEventDetails, loadPolity } from '../lib/data';
import { loadFactIndex, norm, search, snippet } from '../lib/search';
import { candidatesFor, nearestSnapshot, resolvePolity } from '../lib/borders';
import { TERRITORY, niceTicks } from '../components/TerritoryChart';
import { facesViewer, placeMarkers, type PlaceItem } from '../lib/declutter';

describe('time scale', () => {
  it('era shares fill the whole slider', () => {
    expect(ERAS.reduce((s, e) => s + e.share, 0)).toBeCloseTo(1, 6);
    for (let i = 1; i < ERAS.length; i++) expect(ERAS[i].from).toBe(ERAS[i - 1].to);
  });

  it('never produces year 0', () => {
    expect(normaliseYear(0)).toBe(1);
    expect(normaliseYear(0, -1)).toBe(-1);
    expect(stepYear(-1, 1)).not.toBe(0);
    expect(stepYear(1, -1)).not.toBe(0);
  });

  it('crosses from BCE to CE without stopping at 0', () => {
    expect(stepYear(-5, 1)).toBe(6); // 10-year steps in the ancient era: -5 + 10 = 5, skip 0 → 6
  });

  it('maps years to the slider and back', () => {
    for (const y of [MIN_YEAR, -9000, -3500, -500, 1, 500, 1066, 1500, 1789, 1914, MAX_YEAR]) {
      const back = fracToYear(yearToFrac(y));
      expect(Math.abs(back - y)).toBeLessThanOrEqual(2);
    }
  });

  it('positions increase with time', () => {
    let last = -1;
    for (let y = MIN_YEAR; y <= MAX_YEAR; y += 37) {
      const f = yearToFrac(y);
      expect(f).toBeGreaterThanOrEqual(last);
      last = f;
    }
  });

  it('assigns eras at the boundaries', () => {
    expect(eraOf(-9000).id).toBe('prehistory');
    expect(eraOf(-3500).id).toBe('ancient');
    expect(eraOf(499).id).toBe('ancient');
    expect(eraOf(500).id).toBe('medieval');
    expect(eraOf(2025).id).toBe('modern');
  });
});

describe('data helpers', () => {
  it('formats BCE and CE years', () => {
    expect(formatYear(-500)).toBe('500 BCE');
    expect(formatYear(476)).toBe('476 CE');
    expect(formatYear(1453)).toBe('1453');
    expect(formatYear(1453, true)).toBe('c. 1453');
    expect(formatYear(null)).toBe('present');
  });

  it('knows when a civilisation exists', () => {
    const rome = POLITY_BY_ID.get('roman-empire')!;
    expect(isActive(rome, 100)).toBe(true);
    expect(isActive(rome, -100)).toBe(false);
  });
});

describe('search', () => {
  it('ignores accents and okina marks', () => {
    expect(norm('Đại Việt')).toBe('dai viet');
    expect(norm('Tuʻi Tonga')).toBe('tui tonga');
  });

  it('finds civilisations, known-for items, people and routes', () => {
    expect(search('dai viet').polities[0]).toMatchObject({ id: 'dai-viet' });
    expect(search('kente').known.some((h) => h.kind === 'known' && h.polityId === 'ashanti-empire')).toBe(true);
    expect(search('zheng he').people[0]).toMatchObject({ id: 'zheng-he' });
    expect(search('silk road').routes[0]).toMatchObject({ id: 'silk-road' });
  });

  it('finds words inside checklist answers', async () => {
    await loadFactIndex();
    const hit = search('el nino').facts.find((h) => h.kind === 'fact' && h.polityId === 'valdivia');
    expect(hit).toMatchObject({ category: 'geography' });
  });

  it('centres snippets on the match even after okina and accents', () => {
    const text = `${'Tuʻi Haʻatakalaua ʻOhoʻiʻuʻaʻeʻoʻuʻiʻ '.repeat(6)}the kava ceremony mattered a lot to everyone in the court.`;
    expect(snippet(text, 'kava', 20)).toContain('kava');
  });

  it('searches event descriptions once the long texts have loaded', async () => {
    await loadFactIndex();
    expect(search('maize indigenous').events.some((h) => h.kind === 'event' && h.id === 'maize-domesticated')).toBe(true);
  });

  it('requires every word to match', () => {
    expect(search('rome xyzzyq').polities).toHaveLength(0);
  });
});

describe('data loading', () => {
  it('keeps long texts out of the startup index and loads them on demand', async () => {
    const before = EVENT_BY_ID.get('maize-domesticated')!;
    expect('description' in before).toBe(false);
    await loadEventDetails();
    expect(eventDetails('maize-domesticated')?.description).toBeTruthy();
  });

  it('loads a full civilisation on demand, keeping the startup index fields', async () => {
    const summary = POLITY_BY_ID.get('roman-empire')!;
    const full = await loadPolity('roman-empire');
    expect(full.name).toBe(summary.name);
    expect(full.checklist.riseFall).toBeDefined();
    expect(full.completion).toEqual(summary.completion);
    expect(full.peakYear).toBe(summary.peakYear);
    await expect(loadPolity('no-such-place')).rejects.toThrow();
  });
});

describe('border matching', () => {
  const ids = (name: string, year: number) => candidatesFor({ NAME: name }, year).list.map((p) => p.id);

  it('uses strict year windows for shared names', () => {
    expect(ids('Liao', 1100)).toContain('liao-dynasty');
    expect(ids('Liao', 1200)).toContain('jurchen-jin'); // the maps still call Jin territory "Liao" in 1200
    expect(ids('Sweden', 1650)).toContain('swedish-empire');
    expect(ids('Sweden', 1900)).not.toContain('swedish-empire');
  });

  it('applies a name’s own date window', () => {
    expect(ids('Kenya', 1930)).toContain('british-empire');
    expect(ids('Kenya', 1994)).not.toContain('british-empire');
  });

  it('lets colonies inherit their overlord', () => {
    const r = candidatesFor({ NAME: 'Some colony', SUBJECTO: 'United Kingdom of Great Britain and Ireland' }, 1914);
    expect(r.viaName).toBe(false);
    expect(r.list.map((p) => p.id)).toContain('british-empire');
  });

  it('counts subjects with their own entry as part of an including overlord', () => {
    const horde = candidatesFor({ NAME: 'Khanate of the Golden Horde', SUBJECTO: 'Mongol Empire' }, 1279);
    expect(horde.viaName).toBe(true);
    expect(horde.list.map((p) => p.id)).toEqual(['golden-horde', 'mongol-empire']);
    const congo = candidatesFor({ NAME: 'Belgian Congo', SUBJECTO: 'Belgium' }, 1914);
    expect(congo.list.map((p) => p.id)).toEqual(['dr-congo', 'belgium']);
    const hk = candidatesFor({ NAME: 'Hong Kong', SUBJECTO: 'United Kingdom' }, 1914);
    expect(hk.list.map((p) => p.id)).toEqual(['hong-kong', 'british-empire']);
    // Overlords without includesSubjects keep the old behaviour.
    const parma = candidatesFor({ NAME: 'Parma', SUBJECTO: 'Austrian Empire' }, 1815);
    expect(parma.list.map((p) => p.id)).toEqual(['italian-states']);
  });

  it('opens the shape\'s own civilisation, not the including overlord', () => {
    expect(resolvePolity('|yuan|mongol-empire|', 1279)?.id).toBe('yuan');
  });

  it('picks the nearest snapshot, earlier on a tie', () => {
    expect(nearestSnapshot(150, [100, 200])).toBe(100);
    expect(nearestSnapshot(160, [100, 200])).toBe(200);
  });
});

describe('charts', () => {
  it('the top axis tick always covers the data', () => {
    for (const max of [1, 9, 57.6e6, 172.8e6, 4.93e6, 1.2e9]) {
      const t = niceTicks(max);
      expect(t[t.length - 1]).toBeGreaterThanOrEqual(max);
      expect(t[0]).toBe(0);
    }
  });

  it('territory figures are in a believable range', () => {
    const peak = (id: string) => Math.max(...(TERRITORY[id] ?? [[0, 0]]).map((p) => p[1]));
    expect(peak('roman-empire')).toBeGreaterThan(4e6);
    expect(peak('roman-empire')).toBeLessThan(6e6);
    for (const pts of Object.values(TERRITORY)) for (const [, km2] of pts) expect(km2).toBeLessThan(36e6);
  });
});

describe('map declutter', () => {
  const view = { w: 800, h: 600 };
  const at = (id: string, x: number, y: number, priority: number, extra: Partial<PlaceItem> = {}): PlaceItem => ({
    id,
    box: { x, y, w: 26, h: 26 },
    priority,
    visible: true,
    ...extra,
  });

  it('keeps the higher-priority marker when two overlap', () => {
    const r = placeMarkers([at('low', 100, 100, 1), at('high', 110, 105, 5), at('apart', 400, 300, 1)], view);
    expect(r.get('high')).toBe('full');
    expect(r.get('low')).toBe('crowded');
    expect(r.get('apart')).toBe('full');
  });

  it('always shows the selected marker', () => {
    const r = placeMarkers([at('big', 100, 100, 99), at('sel', 105, 100, 0, { must: true })], view);
    expect(r.get('sel')).toBe('full');
    expect(r.get('big')).toBe('crowded');
  });

  it('falls back to the small box (icon without name) when the full one does not fit', () => {
    const person = at('p', 200, 200, 1, { box: { x: 200, y: 200, w: 120, h: 24 }, small: { x: 200, y: 200, w: 24, h: 24 } });
    const r = placeMarkers([at('e', 260, 200, 5), person], view);
    expect(r.get('p')).toBe('small');
  });

  it('hides markers off screen or behind the globe', () => {
    const r = placeMarkers([at('off', -100, 100, 5), at('back', 100, 100, 5, { visible: false })], view);
    expect(r.get('off')).toBe('hidden');
    expect(r.get('back')).toBe('hidden');
  });

  it('knows which side of the globe faces the viewer', () => {
    expect(facesViewer([10, 45], [0, 40])).toBe(true);
    expect(facesViewer([180, -40], [0, 40])).toBe(false);
  });
});

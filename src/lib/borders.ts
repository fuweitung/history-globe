import polylabel from 'polylabel';
import type { Feature, FeatureCollection, Geometry, Polygon, Position } from 'geojson';
import { POLITIES, isActive, yearsOutside } from './data';
import type { Polity } from '../types';

/**
 * Border snapshots from the open-source historical-basemaps project
 * (github.com/aourednik/historical-basemaps, GPL-3.0).
 * Files live in public/data/borders and are listed in manifest.json
 * (written by `npm run fetch-borders`).
 */

const BASE = import.meta.env.BASE_URL;

export interface BorderProps {
  NAME: string | null;
  SUBJECTO?: string | null;
  PARTOF?: string | null;
  BORDERPRECISION?: number | null;
  /** "|id1|id2|" — every polity in our dataset this polygon can belong to. */
  _pids: string;
  /** Colour key: the overlord (SUBJECTO) if any, so empires read as one block. */
  _color: string;
  /** 1 if this polygon is linked to a polity in our dataset. */
  _linked: number;
  _fid: number;
}

export interface Snapshot {
  year: number;
  borders: FeatureCollection<Geometry, BorderProps>;
  labels: FeatureCollection<Geometry, { name: string; linked: number; rank: number }>;
  /** Full, untouched properties by feature id (rendered features can drop fields). */
  byFid: Map<number, BorderProps>;
}

let manifestPromise: Promise<number[]> | null = null;

export function loadManifest(): Promise<number[]> {
  manifestPromise ??= fetch(`${BASE}data/borders/manifest.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`manifest.json: HTTP ${r.status}`);
      return r.json() as Promise<{ years: number[] }>;
    })
    .then((m) => m.years.slice().sort((a, b) => a - b));
  return manifestPromise;
}

/** The snapshot year closest to `year`; on a tie, the earlier snapshot. */
export function nearestSnapshot(year: number, years: number[]): number {
  let best = years[0];
  for (const y of years) {
    if (Math.abs(y - year) < Math.abs(best - year)) best = y;
  }
  return best;
}

// ── Name → polity resolution ─────────────────────────────────

const norm = (s: string) => s.trim().toLowerCase();

const NAME_INDEX = new Map<string, Polity[]>();
for (const p of POLITIES) {
  for (const n of p.borderNames ?? []) {
    const k = norm(n);
    const list = NAME_INDEX.get(k) ?? [];
    if (!list.includes(p)) list.push(p);
    NAME_INDEX.set(k, list);
  }
}

/** How far (in years) a snapshot is from the window in which a polity's names apply. */
function matchDistance(p: Polity, snapYear: number): number {
  if (p.borderYears) {
    const [from, to] = p.borderYears;
    return snapYear >= from && snapYear <= (to ?? Infinity) ? 0 : Infinity; // strict window
  }
  const d = yearsOutside(p, snapYear);
  return d <= matchTolerance(snapYear) ? d : Infinity;
}
/** Older snapshots are further apart, so allow a wider margin around a polity's lifetime. */
const matchTolerance = (y: number) => (y < 500 ? 50 : y < 1500 ? 25 : 10);

/**
 * Candidate polities for one polygon, closest-in-time first.
 * `viaName` is true when the polygon's own NAME matched (not its overlord's).
 */
function candidatesFor(
  props: { NAME?: string | null; SUBJECTO?: string | null },
  snapYear: number,
): { list: Polity[]; viaName: boolean } {
  // The polygon's own name wins; fall back to its overlord (for colonies/vassals).
  for (const [key, viaName] of [[props.NAME, true], [props.SUBJECTO, false]] as const) {
    if (!key) continue;
    const list = NAME_INDEX.get(norm(key));
    if (!list) continue;
    const near = list.filter((p) => matchDistance(p, snapYear) !== Infinity);
    if (near.length) return { list: near.sort((a, b) => matchDistance(a, snapYear) - matchDistance(b, snapYear)), viaName };
  }
  return { list: [], viaName: false };
}

/** Pick the best polity for a clicked polygon at the slider's year. */
export function resolvePolity(pids: string, year: number): Polity | null {
  const ids = pids.split('|').filter(Boolean);
  if (!ids.length) return null;
  const list = POLITIES.filter((p) => ids.includes(p.id));
  return list.find((p) => isActive(p, year)) ?? list.sort((a, b) => yearsOutside(a, year) - yearsOutside(b, year))[0] ?? null;
}

// ── Loading & preprocessing ─────────────────────────────────

const cache = new Map<number, Promise<Snapshot>>();

export function loadSnapshot(year: number): Promise<Snapshot> {
  let p = cache.get(year);
  if (!p) {
    const file = year < 0 ? `world_bc${-year}.geojson` : `world_${year}.geojson`;
    p = fetch(`${BASE}data/borders/${file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
        return r.json() as Promise<FeatureCollection<Geometry, Partial<BorderProps>>>;
      })
      .then((fc) => prepare(year, fc));
    p.catch(() => cache.delete(year));
    cache.set(year, p);
  }
  return p;
}

function ringArea(ring: Position[]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}

function largestPolygon(g: Geometry): { coords: Position[][]; area: number } | null {
  if (g.type === 'Polygon') return { coords: g.coordinates, area: ringArea(g.coordinates[0]) };
  if (g.type === 'MultiPolygon') {
    let best: { coords: Position[][]; area: number } | null = null;
    for (const poly of g.coordinates) {
      const area = ringArea(poly[0]);
      if (!best || area > best.area) best = { coords: poly, area };
    }
    return best;
  }
  return null;
}

function prepare(year: number, fc: FeatureCollection<Geometry, Partial<BorderProps>>): Snapshot {
  const features: Feature<Geometry, BorderProps>[] = [];
  const byFid = new Map<number, BorderProps>();
  // One label per name, placed on that name's largest piece of land.
  const labelByName = new Map<string, { coords: Position[][]; area: number; linked: number }>();

  fc.features.forEach((f, i) => {
    if (!f.geometry || !f.properties) return;
    const NAME = f.properties.NAME ?? null;
    const SUBJECTO = f.properties.SUBJECTO ?? null;
    const { list: cands, viaName } = candidatesFor({ NAME, SUBJECTO }, year);
    const linked = cands.length ? 1 : 0;
    // Label linked territories with our civilisation's name (fixes dataset spellings
    // like "Zhoa" and shows e.g. "Yuan Dynasty" instead of "Great Khanate").
    const labelName = viaName && cands[0] ? cands[0].name : NAME;
    const props: BorderProps = {
      NAME,
      SUBJECTO,
      PARTOF: f.properties.PARTOF ?? null,
      BORDERPRECISION: f.properties.BORDERPRECISION ?? null,
      _pids: cands.length ? `|${cands.map((c) => c.id).join('|')}|` : '',
      _color: colorFor(cands[0]?.color, SUBJECTO || NAME || `#${i}`),
      _linked: linked,
      _fid: i,
    };
    features.push({ type: 'Feature', id: i, geometry: f.geometry, properties: props });
    byFid.set(i, props);

    if (labelName) {
      const lp = largestPolygon(f.geometry);
      if (lp) {
        const prev = labelByName.get(labelName);
        if (!prev || lp.area > prev.area) labelByName.set(labelName, { ...lp, linked });
      }
    }
  });

  const labels: Snapshot['labels'] = { type: 'FeatureCollection', features: [] };
  for (const [name, { coords, area, linked }] of labelByName) {
    if (area < 0.05 && !linked) continue; // skip tiny unlinked specks
    const precision = Math.max(0.05, Math.sqrt(area) / 50);
    const pt = polylabel(coords as Polygon['coordinates'], precision);
    labels.features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pt[0], pt[1]] },
      properties: { name, linked, rank: area },
    });
  }

  return { year, borders: { type: 'FeatureCollection', features }, labels, byFid };
}

// ── Colour ──────────────────────────────────────────────────

/** A muted, map-friendly palette (parchment atlas style). */
const PALETTE = [
  '#c9844f', '#7fa36b', '#c0a14a', '#6f93b5', '#b36d6d', '#8b7fb8',
  '#5fa39a', '#d0956c', '#9aaa5a', '#b98aa8', '#7d9c86', '#c47c5a',
  '#6a8fa0', '#a8865f', '#8aa4c4', '#b0a070', '#a06c8c', '#6f9f6f',
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function colorFor(explicit: string | undefined, key: string): string {
  return explicit ?? PALETTE[hash(key) % PALETTE.length];
}

/** Bounding box of every polygon that can belong to `polityId` in a snapshot. */
export function boundsForPolity(snap: Snapshot, polityId: string): [number, number, number, number] | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const needle = `|${polityId}|`;
  const visit = (c: Position) => {
    if (c[0] < minX) minX = c[0];
    if (c[1] < minY) minY = c[1];
    if (c[0] > maxX) maxX = c[0];
    if (c[1] > maxY) maxY = c[1];
  };
  const matches = snap.borders.features.filter((f) => f.properties._pids.includes(needle));
  // Prefer the homeland (polygons whose own NAME matched), so far-flung
  // colonies matched via SUBJECTO don't zoom the camera out to the whole planet.
  const home = matches.filter((f) => !f.properties.SUBJECTO || f.properties.SUBJECTO === f.properties.NAME);
  for (const f of home.length ? home : matches) {
    const g = f.geometry;
    if (g.type === 'Polygon') g.coordinates[0].forEach(visit);
    else if (g.type === 'MultiPolygon') g.coordinates.forEach((p) => p[0].forEach(visit));
  }
  return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null;
}

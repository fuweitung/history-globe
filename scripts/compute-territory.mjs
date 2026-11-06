// Measures each civilisation's territory (km²) in every border snapshot,
// using the same name-matching rules as the map (src/lib/borders.ts).
// Output: src/data/territory.json  →  { [polityId]: [[year, km2], ...] }
// Run after changing borderNames/borderYears:  npm run compute-territory
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const polDir = path.join(root, 'src/data/polities');
const bordersDir = path.join(root, 'public/data/borders');

const polities = fs.readdirSync(polDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(polDir, f), 'utf8')));
const { years } = JSON.parse(fs.readFileSync(path.join(bordersDir, 'manifest.json'), 'utf8'));

const MAX_YEAR = 2025;
const norm = (s) => s.trim().toLowerCase();
const yearsOutside = (p, y) => (y < p.startYear ? p.startYear - y : y > (p.endYear ?? MAX_YEAR) ? y - (p.endYear ?? MAX_YEAR) : 0);
const tolerance = (y) => (y < 500 ? 50 : y < 1500 ? 25 : 10);
function distance(p, y) {
  if (p.borderYears) {
    const [from, to] = p.borderYears;
    return y >= from && y <= (to ?? Infinity) ? 0 : Infinity;
  }
  const d = yearsOutside(p, y);
  return d <= tolerance(y) ? d : Infinity;
}

const index = new Map();
for (const p of polities) for (const n of p.borderNames ?? []) index.set(norm(n), [...(index.get(norm(n)) ?? []), p]);

function owners(props, y) {
  for (const key of [props.NAME, props.SUBJECTO]) {
    if (!key) continue;
    const near = (index.get(norm(key)) ?? []).filter((p) => distance(p, y) !== Infinity);
    if (!near.length) continue;
    const best = Math.min(...near.map((p) => distance(p, y)));
    const top = near.filter((p) => distance(p, y) === best);
    const active = top.filter((p) => yearsOutside(p, y) === 0);
    return active.length ? active : [top[0]];
  }
  return [];
}

// Spherical polygon area (same method as Mapbox's geojson-area), in km².
const R = 6378.137;
const rad = (d) => (d * Math.PI) / 180;
function ringArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [l1, p1] = ring[i];
    const [l2, p2] = ring[(i + 1) % ring.length];
    let dl = l2 - l1; // unwrap rings that cross the antimeridian
    if (dl > 180) dl -= 360;
    else if (dl < -180) dl += 360;
    a += rad(dl) * (2 + Math.sin(rad(p1)) + Math.sin(rad(p2)));
  }
  return Math.abs((a * R * R) / 2);
}
const polyArea = (rings) => Math.max(0, ringArea(rings[0]) - rings.slice(1).reduce((s, r) => s + ringArea(r), 0));
const polys = (g) => (!g ? [] : g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
// The source maps occasionally contain the same polygon twice; count it once.
function bboxKey(rings) {
  let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
  for (const [x, y] of rings[0]) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return [x0, x1, y0, y1].map(Math.round).join(',');
}

const out = {};
for (const y of years) {
  const file = y < 0 ? `world_bc${-y}.geojson` : `world_${y}.geojson`;
  const fc = JSON.parse(fs.readFileSync(path.join(bordersDir, file), 'utf8'));
  const totals = new Map();
  const seen = new Map(); // polityId -> [{key, area}]
  for (const f of fc.features) {
    const own = owners(f.properties ?? {}, y);
    if (!own.length) continue;
    for (const rings of polys(f.geometry)) {
      const a = polyArea(rings);
      const key = bboxKey(rings);
      for (const p of own) {
        const list = seen.get(p.id) ?? [];
        if (list.some((o) => o.key === key && Math.abs(o.area - a) <= 0.15 * Math.max(o.area, a))) continue;
        list.push({ key, area: a });
        seen.set(p.id, list);
        totals.set(p.id, (totals.get(p.id) ?? 0) + a);
      }
    }
  }
  for (const [id, km2] of totals) (out[id] ??= []).push([y, Math.round(km2 / 1000) * 1000]);
}

// Drop isolated dips caused by gaps in the source maps (e.g. a missing main polygon in one snapshot).
const dropped = [];
for (const [id, pts] of Object.entries(out)) {
  out[id] = pts.filter(([y, v], i) => {
    const prev = pts[i - 1]?.[1];
    const next = pts[i + 1]?.[1];
    const dip = prev !== undefined && next !== undefined && v < 0.25 * Math.min(prev, next);
    if (dip) dropped.push(`${id}@${y}`);
    return !dip;
  });
}
if (dropped.length) console.log(`Skipped isolated map gaps: ${dropped.join(', ')}`);

const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
fs.writeFileSync(path.join(root, 'src/data/territory.json'), JSON.stringify(sorted) + '\n');
const missing = polities.filter((p) => !out[p.id]).map((p) => p.id);
console.log(`Territory measured for ${Object.keys(out).length} civilisations; no polygons for ${missing.length}: ${missing.join(', ')}`);
for (const id of ['roman-empire', 'mongol-empire', 'british-empire', 'han-china', 'ottoman-empire']) {
  const s = out[id] ?? [];
  const peak = s.reduce((m, v) => (v[1] > m[1] ? v : m), [0, 0]);
  console.log(`  ${id}: peak ${(peak[1] / 1e6).toFixed(2)}M km² in ${peak[0]} (${s.length} points)`);
}

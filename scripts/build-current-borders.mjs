// Builds a present-day border map (world_2025.geojson) from Natural Earth's country outlines,
// because historical-basemaps stops at 2010 (so South Sudan, independent since 2011, is missing).
//
// Each Natural Earth country takes the names (NAME, SUBJECTO, PARTOF) of the 2010 shape under its
// label point, so it links to the same civilisations as on the 2010 map. Countries that are new
// since 2010 (NEW_SINCE_2010) keep their own name. Coordinates are rounded to 0.01° (about 1 km);
// neighbours share their border points in Natural Earth, so rounding keeps the borders identical.
//
//   npm run build-current-borders   (also run by fetch-borders)
//
// Countries: https://www.naturalearthdata.com/ (public domain), 1:50m admin-0 countries.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public', 'data', 'borders');
export const CURRENT_YEAR = 2025;
export const COUNTRIES_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
// Kept out of public/: only the built map is served.
export const COUNTRIES_CACHE = join(root, 'scripts', '.cache', 'ne_50m_admin_0_countries.geojson');

/** Natural Earth ADMIN name → the name to use, for countries that the 2010 map does not have. */
const NEW_SINCE_2010 = { 'South Sudan': 'South Sudan' };
/** Left out, as on the 2010 map. */
const SKIP = new Set(['Antarctica']);

const polys = (g) => (!g ? [] : g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
const inRing = (pt, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const contains = (g, pt) => polys(g).some((p) => inRing(pt, p[0]) && !p.slice(1).some((h) => inRing(pt, h)));
const ringArea = (r) => Math.abs(r.reduce((a, [x, y], i) => { const [px, py] = r[i ? i - 1 : r.length - 1]; return a + (px * y - x * py); }, 0) / 2);

const round = (v) => Math.round(v * 100) / 100;
function roundRing(ring) {
  const out = [];
  for (const [x, y] of ring) {
    const p = [round(x), round(y)];
    const last = out.at(-1);
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  if (out.length && (out[0][0] !== out.at(-1)[0] || out[0][1] !== out.at(-1)[1])) out.push(out[0]);
  return out.length >= 4 ? out : null;
}
function roundGeometry(g) {
  const ps = polys(g)
    .map((p) => p.map(roundRing).filter(Boolean))
    .filter((p) => p.length && ringArea(p[0]) > 0);
  if (!ps.length) return null;
  return ps.length === 1 ? { type: 'Polygon', coordinates: ps[0] } : { type: 'MultiPolygon', coordinates: ps };
}

/** The 2010 shape nearest to `pt` (by vertex), for small islands that its coarser coastline misses. */
function nearest(features, pt, maxDeg = 1.5) {
  let best = null, bestD = maxDeg * maxDeg;
  for (const f of features) {
    if (!f.geometry || !f.properties?.NAME) continue;
    for (const p of polys(f.geometry))
      for (const [x, y] of p[0]) {
        const d = (x - pt[0]) ** 2 + (y - pt[1]) ** 2;
        if (d < bestD) { bestD = d; best = f; }
      }
  }
  return best;
}

/** A point inside the country: Natural Earth's label point, else a vertex-free point of its largest piece. */
function insidePoint(f) {
  const p = f.properties;
  if (Number.isFinite(p.LABEL_X) && contains(f.geometry, [p.LABEL_X, p.LABEL_Y])) return [p.LABEL_X, p.LABEL_Y];
  const big = polys(f.geometry).sort((a, b) => ringArea(b[0]) - ringArea(a[0]))[0];
  const xs = big[0].map((c) => c[0]), ys = big[0].map((c) => c[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (let n = 4; n <= 64; n *= 2)
    for (let i = 1; i < n; i++)
      for (let j = 1; j < n; j++) {
        const pt = [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * j) / n];
        if (contains({ type: 'Polygon', coordinates: big }, pt)) return pt;
      }
  return big[0][0];
}

/**
 * Natural Earth draws Crimea inside Russia (its "on the ground" rule). Most governments and the UN
 * General Assembly treat it as part of Ukraine, so the map follows that majority view: the Crimea
 * piece moves from Russia to Ukraine. The disputed status is explained in the app text, not drawn.
 */
export function moveCrimeaToUkraine(features) {
  const russia = features.find((f) => f.properties.NE_ADMIN === 'Russia');
  const ukraine = features.find((f) => f.properties.NE_ADMIN === 'Ukraine');
  if (!russia || !ukraine) return false;
  const inCrimea = (poly) => {
    const xs = poly[0].map((c) => c[0]), ys = poly[0].map((c) => c[1]);
    return Math.min(...xs) > 32 && Math.max(...xs) < 37 && Math.min(...ys) > 44 && Math.max(...ys) < 46.5;
  };
  const parts = polys(russia.geometry);
  const crimea = parts.filter(inCrimea);
  if (!crimea.length) return false;
  const rest = parts.filter((p) => !inCrimea(p));
  russia.geometry = { type: 'MultiPolygon', coordinates: rest };
  ukraine.geometry = { type: 'MultiPolygon', coordinates: [...polys(ukraine.geometry), ...crimea] };
  return true;
}

export async function buildCurrentBorders() {
  const countries = JSON.parse(await readFile(COUNTRIES_CACHE, 'utf8'));
  const old = JSON.parse(await readFile(join(dir, 'world_2010.geojson'), 'utf8'));
  const features = [];
  const unmatched = [];
  for (const c of countries.features) {
    const geometry = roundGeometry(c.geometry);
    if (!geometry) continue;
    const admin = c.properties.ADMIN;
    if (SKIP.has(admin)) continue;
    const pt = insidePoint(c);
    const under = old.features.find((f) => f.geometry && f.properties?.NAME && contains(f.geometry, pt)) ?? nearest(old.features, pt);
    let props;
    if (NEW_SINCE_2010[admin]) {
      const name = NEW_SINCE_2010[admin];
      props = { NAME: name, SUBJECTO: name, PARTOF: name, BORDERPRECISION: 3 };
    } else if (under) {
      const { NAME, SUBJECTO, PARTOF, BORDERPRECISION } = under.properties;
      props = { NAME, SUBJECTO: SUBJECTO ?? NAME, PARTOF: PARTOF ?? NAME, BORDERPRECISION: BORDERPRECISION ?? 3 };
    } else {
      // Small islands the 2010 map does not cover: keep Natural Earth's name, with the sovereign
      // country as overlord for overseas territories (New Caledonia → France).
      const sovereign = c.properties.SOVEREIGNT && c.properties.SOVEREIGNT !== admin ? c.properties.SOVEREIGNT : admin;
      props = { NAME: admin, SUBJECTO: sovereign, PARTOF: sovereign, BORDERPRECISION: 3 };
      unmatched.push(admin);
    }
    features.push({ type: 'Feature', properties: { ...props, SOURCE: 'Natural Earth 1:50m', NE_ADMIN: admin }, geometry });
  }
  moveCrimeaToUkraine(features);
  const path = join(dir, `world_${CURRENT_YEAR}.geojson`);
  await writeFile(path, `{"type":"FeatureCollection", "features": [\n${features.map((f) => JSON.stringify(f)).join(',\n')}\n]}\n`);
  // The new file is not simplified yet: `npm run simplify-borders` does that (fetch-borders runs it).
  const manifestPath = join(dir, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!manifest.years.includes(CURRENT_YEAR)) manifest.years.push(CURRENT_YEAR);
  if (manifest.simplified?.years) manifest.simplified.years = manifest.simplified.years.filter((y) => y !== CURRENT_YEAR);
  manifest.current = { year: CURRENT_YEAR, source: 'Natural Earth 1:50m admin-0 countries (public domain), names from the 2010 map' };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Current borders: ${features.length} countries → world_${CURRENT_YEAR}.geojson` + (unmatched.length ? ` (named from Natural Earth: ${unmatched.join(', ')})` : ''));
  return features;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await buildCurrentBorders();

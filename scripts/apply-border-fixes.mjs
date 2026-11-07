// Names land shapes that the source maps leave unnamed (see scripts/border-fixes.json).
// Safe to run more than once. Run: npm run apply-border-fixes (also run by fetch-borders).
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public', 'data', 'borders');
const fileFor = (y) => (y < 0 ? `world_bc${-y}.geojson` : `world_${y}.geojson`);
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

export async function applyBorderFixes() {
  const { fixes } = JSON.parse(await readFile(join(root, 'scripts', 'border-fixes.json'), 'utf8'));
  const byYear = new Map();
  for (const f of fixes) for (const y of f.years) byYear.set(y, [...(byYear.get(y) ?? []), f]);
  let named = 0;
  for (const [y, list] of byYear) {
    const path = join(dir, fileFor(y));
    const fc = JSON.parse(await readFile(path, 'utf8'));
    let changed = false;
    for (const fix of list) {
      const hit = fc.features.find((f) => contains(f.geometry, fix.point) && (!f.properties?.NAME || f.properties.NAME === fix.name));
      if (!hit) { console.warn(`  ! ${y}: no unnamed shape at [${fix.point}] for ${fix.name}`); continue; }
      if (hit.properties?.NAME === fix.name) continue;
      hit.properties = { ...hit.properties, NAME: fix.name, FIXED_BY: 'border-fixes.json' };
      changed = true;
      named++;
    }
    // Same layout as the simplified files: one feature per line.
    if (changed) await writeFile(path, `{"type":"FeatureCollection", "features": [\n${fc.features.map((f) => JSON.stringify(f)).join(',\n')}\n]}\n`);
  }
  console.log(`Border fixes: ${named} shape(s) named.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await applyBorderFixes();

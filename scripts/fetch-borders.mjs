// Downloads historical border snapshots (1500 → today) from the open-source
// historical-basemaps project, plus Natural Earth land outlines, into public/data.
//
//   npm run fetch-borders            # skip files that already exist
//   npm run fetch-borders -- --force # re-download everything
//
// Borders: https://github.com/aourednik/historical-basemaps (GPL-3.0)
// Land:    https://www.naturalearthdata.com/ (public domain)

import { mkdir, writeFile, access, readFile } from 'node:fs/promises';
import { simplifyBorders } from './simplify-borders.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'data', 'borders');
const force = process.argv.includes('--force');

const REPO = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson';
// Snapshots used from 10,000 BCE to today. Negative = BCE (−1 = 1 BCE; there is no year 0).
// Even older maps exist upstream (bc4000 … bc123000) if the timeline is ever extended further back.
const YEARS = [
  -10000, -8000, -5000, -4000, -3000, -2000, -1500, -1000, -700, -500, -400, -323, -300, -200, -100, -1,
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1279, 1300, 1400, 1492,
  1500, 1530, 1600, 1650, 1700, 1715, 1783, 1800, 1815, 1878, 1880, 1900, 1914, 1920, 1930, 1938, 1945, 1960, 1994, 2000, 2010];
const LAND = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson';

const exists = (p) => access(p).then(() => true, () => false);

const fresh = new Set(); // files downloaded in this run (not yet simplified)
async function download(url, dest) {
  if (!force && (await exists(dest))) return 'cached';
  fresh.add(dest);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  JSON.parse(text); // sanity check: must be valid JSON
  await writeFile(dest, text);
  return `${(text.length / 1e6).toFixed(1)} MB`;
}

await mkdir(outDir, { recursive: true });
const ok = [];
const fileFor = (y) => (y < 0 ? `world_bc${-y}.geojson` : `world_${y}.geojson`);
for (const y of YEARS) {
  try {
    const status = await download(`${REPO}/${fileFor(y)}`, join(outDir, fileFor(y)));
    ok.push(y);
    console.log(`  ✓ ${y}  ${status}`);
  } catch (e) {
    console.warn(`  ✗ ${y}  ${e.message}`);
  }
}
try {
  const status = await download(LAND, join(root, 'public', 'data', 'land.geojson'));
  console.log(`  ✓ land outlines  ${status}`);
} catch (e) {
  console.warn(`  ✗ land outlines  ${e.message}`);
}

// Keep the record of already-simplified files that were not downloaded again.
const old = await readFile(join(outDir, 'manifest.json'), 'utf8').then(JSON.parse, () => ({}));
const simplifiedYears = (old.simplified?.years ?? []).filter((y) => ok.includes(y) && !fresh.has(join(outDir, fileFor(y))));
await writeFile(
  join(outDir, 'manifest.json'),
  JSON.stringify(
    { source: 'https://github.com/aourednik/historical-basemaps', license: 'GPL-3.0', years: ok, simplified: { ...old.simplified, years: simplifiedYears } },
    null,
    2,
  ) + '\n',
);
console.log(`\nWrote manifest with ${ok.length} snapshots. Simplifying new files…`);
await simplifyBorders();

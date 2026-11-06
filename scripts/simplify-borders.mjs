// Makes the border snapshots in public/data/borders smaller without visible change
// at the zoom levels the globe uses: shared borders are simplified together
// (no gaps or overlaps), small islands are kept, and coordinates are rounded
// to about 100 m. Run automatically by `npm run fetch-borders`.
//
//   npm run simplify-borders            # only files not yet simplified
//   npm run simplify-borders -- --force # every file again
//
// The simplified files are a modified version of historical-basemaps (GPL-3.0);
// the manifest records the settings used.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mapshaper from 'mapshaper';

export const SETTINGS = { interval: 1000, precision: 0.001 }; // metres; degrees (~110 m)

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public', 'data', 'borders');
const fileFor = (y) => (y < 0 ? `world_bc${-y}.geojson` : `world_${y}.geojson`);

export async function simplifyBorders({ force = false } = {}) {
  const manifestPath = join(dir, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const done = new Set(force ? [] : (manifest.simplified?.years ?? []));
  let before = 0;
  let after = 0;
  for (const y of manifest.years) {
    if (done.has(y)) continue;
    const path = join(dir, fileFor(y));
    const input = await readFile(path, 'utf8');
    const out = await mapshaper.applyCommands(
      `-i in.json -simplify interval=${SETTINGS.interval} keep-shapes -o out.json precision=${SETTINGS.precision} format=geojson`,
      { 'in.json': input },
    );
    const text = String(out['out.json']);
    const fc = JSON.parse(text); // sanity checks: valid, nothing dropped
    const n = JSON.parse(input).features.length;
    if (fc.features.length !== n) throw new Error(`${fileFor(y)}: ${n} features became ${fc.features.length}`);
    await writeFile(path, text + '\n');
    done.add(y);
    before += input.length;
    after += text.length;
    console.log(`  ✓ ${y}  ${(input.length / 1e6).toFixed(2)} → ${(text.length / 1e6).toFixed(2)} MB`);
  }
  manifest.simplified = { tool: 'mapshaper', ...SETTINGS, years: manifest.years.filter((y) => done.has(y)) };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  if (before) console.log(`\nSimplified: ${(before / 1e6).toFixed(1)} → ${(after / 1e6).toFixed(1)} MB`);
  else console.log('All border files were already simplified.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await simplifyBorders({ force: process.argv.includes('--force') });
}

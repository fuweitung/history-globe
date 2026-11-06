// Downloads the map label font (glyph .pbf files) into public/fonts so the app
// doesn't depend on MapLibre's demo server at runtime.
// Usage: npm run fetch-glyphs   (only needed again if the map font changes)
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FONTS = ['Open Sans Semibold']; // must match 'text-font' in src/components/MapView.tsx
const SOURCE = 'https://demotiles.maplibre.org/font';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'fonts');

for (const font of FONTS) {
  const dir = join(root, font);
  await mkdir(dir, { recursive: true });
  let saved = 0;
  let bytes = 0;
  // Unicode is split into 256 ranges of 256 code points; fetch them politely, one at a time.
  for (let start = 0; start < 65536; start += 256) {
    const range = `${start}-${start + 255}`;
    const res = await fetch(`${SOURCE}/${encodeURIComponent(font)}/${range}.pbf`);
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`${font} ${range}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(join(dir, `${range}.pbf`), buf);
    saved += 1;
    bytes += buf.length;
  }
  console.log(`✓ ${font}: ${saved} ranges, ${(bytes / 1024).toFixed(0)} kB`);
}

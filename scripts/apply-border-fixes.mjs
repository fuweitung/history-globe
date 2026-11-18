// Names land shapes that the source maps leave unnamed, corrects a few overlords and misleading
// names (`was`), splits a few shapes that the source draws as one (`cutAlong`), and copies a few
// shapes from a neighbouring map where the source repeats an older one (`overlay`), see
// scripts/border-fixes.json.
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
const geom = (list) => (list.length === 1 ? { type: 'Polygon', coordinates: list[0] } : { type: 'MultiPolygon', coordinates: list });
const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
const close = (r) => [...r, r[0]];

// The cut line for a split: the border of a shape on another map (`cutAlong.year`, `.name`), followed
// from the vertex `from` to the vertex `to` in that ring's own order. Both ends must also be vertices
// of the shape being split, so the line runs from one point on its edge to another.
async function cutLine({ year, name, from, to }) {
  const fc = JSON.parse(await readFile(join(dir, fileFor(year)), 'utf8'));
  for (const f of fc.features.filter((f) => f.properties?.NAME === name))
    for (const ring of polys(f.geometry).flat()) {
      const r = same(ring[0], ring.at(-1)) ? ring.slice(0, -1) : ring;
      const a = r.findIndex((c) => same(c, from)), b = r.findIndex((c) => same(c, to));
      if (a < 0 || b < 0) continue;
      const out = [];
      for (let i = a; ; i = (i + 1) % r.length) { out.push(r[i]); if (i === b) break; }
      return out;
    }
  return null;
}

// Splits `feature` along `line`; the part containing fix.point keeps the feature, the other part
// (plus any separate islands inside fix.restBox) becomes a new feature named fix.rest.
function split(feature, line, fix) {
  const ps = polys(feature.geometry);
  for (const [k, p] of ps.entries()) {
    const ring = same(p[0][0], p[0].at(-1)) ? p[0].slice(0, -1) : p[0];
    const a = ring.findIndex((c) => same(c, line[0])), b = ring.findIndex((c) => same(c, line.at(-1)));
    if (a < 0 || b < 0 || a === b) continue;
    const arc = (i, j) => { const out = []; for (let x = i; ; x = (x + 1) % ring.length) { out.push(ring[x]); if (x === j) break; } return out; };
    const inner = line.slice(1, -1);
    const halves = [close([...arc(a, b), ...[...inner].reverse()]), close([...arc(b, a), ...inner])].map((r) => [r, ...p.slice(1).filter((h) => inRing(h[0], r))]);
    const keepIdx = halves.findIndex((h) => inRing(fix.point, h[0]));
    if (keepIdx < 0) return null;
    const inBox = (q) => fix.restBox && q[0].every(([x, y]) => x >= fix.restBox[0] && y >= fix.restBox[1] && x <= fix.restBox[2] && y <= fix.restBox[3]);
    const others = ps.filter((_, i) => i !== k);
    const keep = [halves[keepIdx], ...others.filter((q) => !inBox(q))];
    const rest = [halves[1 - keepIdx], ...others.filter(inBox)];
    return { keep: geom(keep), rest: geom(rest) };
  }
  return null;
}

// Without a cut line: moves the separate pieces lying wholly inside fix.restBox to a new feature.
function detach(feature, fix) {
  const ps = polys(feature.geometry);
  const inBox = (q) => q[0].every(([x, y]) => x >= fix.restBox[0] && y >= fix.restBox[1] && x <= fix.restBox[2] && y <= fix.restBox[3]);
  const keep = ps.filter((q) => !inBox(q)), rest = ps.filter(inBox);
  return keep.length && rest.length ? { keep: geom(keep), rest: geom(rest) } : null;
}

// Copies whole shapes from another map (`overlay.from`, by `overlay.names`) onto this one and drops
// the shapes named in `remove`. For regions where the source repeats an older map (South America in
// 1600 is the 1530 map). The copies go last, so they draw on top of whatever they overlap.
async function overlay(fc, fix) {
  if (fc.features.some((f) => f.properties?.OVERLAY_FROM === fix.overlay.from)) return false;
  const src = JSON.parse(await readFile(join(dir, fileFor(fix.overlay.from)), 'utf8'));
  const copies = src.features.filter((f) => fix.overlay.names.includes(f.properties?.NAME));
  const missing = fix.overlay.names.filter((n) => !copies.some((f) => f.properties.NAME === n));
  if (missing.length) console.warn(`  ! ${fix.years}: ${missing.join(', ')} not found on the ${fix.overlay.from} map`);
  if (!copies.length) return false;
  fc.features = fc.features.filter((f) => !(fix.remove ?? []).includes(f.properties?.NAME));
  for (const f of copies) fc.features.push({ ...f, properties: { ...f.properties, FIXED_BY: 'border-fixes.json', OVERLAY_FROM: fix.overlay.from } });
  return true;
}

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
      if (fix.overlay) {
        if (await overlay(fc, fix)) { changed = true; named++; }
        continue;
      }
      const hit = fc.features.find((f) => contains(f.geometry, fix.point) && (!f.properties?.NAME || f.properties.NAME === fix.name || (fix.was && f.properties.NAME === fix.was)));
      if (!hit) { console.warn(`  ! ${y}: no unnamed shape at [${fix.point}] for ${fix.name}`); continue; }
      if (fix.cutAlong || fix.restBox) {
        const key = fix.cutAlong ? `${fix.was ?? fix.name}|${fix.cutAlong.year}|${fix.cutAlong.from}|${fix.cutAlong.to}` : `${fix.was ?? fix.name}|${fix.restBox}`;
        if (!fc.features.some((f) => f.properties?.SPLIT_KEY === key)) {
          const line = fix.cutAlong ? await cutLine(fix.cutAlong) : null;
          const parts = fix.cutAlong ? line && split(hit, line, fix) : detach(hit, fix);
          if (!parts) { console.warn(`  ! ${y}: could not split ${fix.was ?? fix.name} (${fix.cutAlong ? `along ${fix.cutAlong.name} ${fix.cutAlong.year}` : `box ${fix.restBox}`})`); continue; }
          hit.geometry = parts.keep;
          fc.features.push({ type: 'Feature', properties: { NAME: fix.rest, ABBREVN: fix.rest, SUBJECTO: fix.restSubjectOf ?? fix.rest, BORDERPRECISION: hit.properties?.BORDERPRECISION ?? 1, PARTOF: fix.rest, FIXED_BY: 'border-fixes.json', SPLIT_KEY: key }, geometry: parts.rest });
          changed = true;
          named++;
        }
      }
      const subject = fix.subjectOf ?? hit.properties?.SUBJECTO;
      if (hit.properties?.NAME === fix.name && hit.properties?.SUBJECTO === subject) continue;
      const renamed = fix.was && hit.properties?.NAME === fix.was ? { ABBREVN: fix.name, PARTOF: fix.name } : {};
      hit.properties = { ...hit.properties, NAME: fix.name, ...renamed, ...(fix.subjectOf ? { SUBJECTO: fix.subjectOf } : {}), FIXED_BY: 'border-fixes.json' };
      changed = true;
      named++;
    }
    // Same layout as the simplified files: one feature per line.
    if (changed) await writeFile(path, `{"type":"FeatureCollection", "features": [\n${fc.features.map((f) => JSON.stringify(f)).join(',\n')}\n]}\n`);
  }
  console.log(`Border fixes: ${named} shape(s) changed.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await applyBorderFixes();

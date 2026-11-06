// Writes PROGRESS.md: live percentages for map coverage, content, fact-checking and pictures,
// plus the biggest remaining map blanks. The "Roadmap" block in PROGRESS.md is edited by hand
// and kept between runs. Run: npm run progress
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const polDir = path.join(root, 'src/data/polities');
const bordersDir = path.join(root, 'public/data/borders');
const polities = fs.readdirSync(polDir).filter((f) => f.endsWith('.json')).map((f) => read(`src/data/polities/${f}`));
const { years } = read('public/data/borders/manifest.json');

// ── Same matching rules as the map (src/lib/borders.ts) ──
const MAX_YEAR = 2025;
const norm = (s) => s.trim().toLowerCase();
const yearsOutside = (p, y) => (y < p.startYear ? p.startYear - y : y > (p.endYear ?? MAX_YEAR) ? y - (p.endYear ?? MAX_YEAR) : 0);
const tolerance = (y) => (y < 500 ? 50 : y < 1500 ? 25 : 10);
const distance = (p, y) => {
  if (p.borderYears) return y >= p.borderYears[0] && y <= (p.borderYears[1] ?? Infinity) ? 0 : Infinity;
  const d = yearsOutside(p, y);
  return d <= tolerance(y) ? d : Infinity;
};
const index = new Map();
for (const p of polities) for (const n of p.borderNames ?? []) index.set(norm(n), [...(index.get(norm(n)) ?? []), p]);
const linked = (props, y) =>
  [props.NAME, props.SUBJECTO].some((k) => k && (index.get(norm(k)) ?? []).some((p) => distance(p, y) !== Infinity));

// ── Spherical area (km²) ──
const R = 6378.137;
const rad = (d) => (d * Math.PI) / 180;
const ringArea = (ring) => {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [l1, p1] = ring[i];
    const [l2, p2] = ring[(i + 1) % ring.length];
    let dl = l2 - l1;
    if (dl > 180) dl -= 360;
    else if (dl < -180) dl += 360;
    a += rad(dl) * (2 + Math.sin(rad(p1)) + Math.sin(rad(p2)));
  }
  return Math.abs((a * R * R) / 2);
};
const polys = (g) => (!g ? [] : g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
const polyArea = (r) => Math.max(0, ringArea(r[0]) - r.slice(1).reduce((s, x) => s + ringArea(x), 0));

const ERAS = [
  ['Prehistory', -Infinity, -3500],
  ['Ancient', -3500, 500],
  ['Medieval', 500, 1500],
  ['Early modern', 1500, 1800],
  ['Modern', 1800, Infinity],
];
const eraOf = (y) => ERAS.find(([, a, b]) => y >= a && y < b)[0];

const perYear = [];
const blanks = new Map();
for (const y of years) {
  const fc = read(`public/data/borders/${y < 0 ? `world_bc${-y}` : `world_${y}`}.geojson`);
  let named = 0, link = 0, unnamed = 0;
  const seen = new Set();
  for (const f of fc.features) {
    const props = f.properties ?? {};
    for (const rings of polys(f.geometry)) {
      const key = rings[0].slice(0, 4).flat().map((v) => v.toFixed(2)).join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      const a = polyArea(rings);
      if (!props.NAME && !props.SUBJECTO) { unnamed += a; continue; }
      named += a;
      if (linked(props, y)) { link += a; continue; }
      const name = props.NAME || props.SUBJECTO;
      const b = blanks.get(name) ?? { km2: 0, years: new Set() };
      b.km2 += a;
      b.years.add(y);
      blanks.set(name, b);
    }
  }
  perYear.push({ y, pct: named ? link / named : 0 });
}

const pct = (x) => `${Math.round(x * 100)}%`;
const bar = (x) => '█'.repeat(Math.round(x * 20)).padEnd(20, '░');
const fmtYear = (y) => (y < 0 ? `${-y} BCE` : `${y}`);
const avg = (xs) => xs.reduce((s, v) => s + v, 0) / (xs.length || 1);

// ── Content ──
let items = 0, filled = 0, shortAns = 0, checked = 0;
const cert = { confirmed: 0, estimated: 0, disputed: 0 };
for (const p of polities)
  for (const [cat, fields] of Object.entries(p.checklist))
    for (const it of Object.values(fields)) {
      items++;
      if (it.value !== null && String(it.value).trim()) filled++;
      if (cat !== 'dataQuality' && String(it.value ?? '').length < 40) shortAns++;
      if (/\(checked/i.test(it.source ?? '')) checked++;
      if (cert[it.certainty] !== undefined) cert[it.certainty]++;
    }
const images = read('src/data/images.json');
const knownTotal = polities.reduce((s, p) => s + (p.knownFor ?? []).length, 0);
const knownPics = Object.values(images.known ?? {}).filter(Boolean).length;
const polPics = polities.filter((p) => images.polities?.[p.id]).length;
const territory = read('src/data/territory.json');
const onMap = polities.filter((p) => territory[p.id]).length;

// ── Output ──
const old = fs.existsSync(path.join(root, 'PROGRESS.md')) ? fs.readFileSync(path.join(root, 'PROGRESS.md'), 'utf8') : '';
const keep = /<!-- roadmap:start -->[\s\S]*?<!-- roadmap:end -->/.exec(old)?.[0] ??
  '<!-- roadmap:start -->\n## Roadmap\n\n- [ ] Add your next goals here\n<!-- roadmap:end -->';

const row = (label, x, note = '') => `| ${label} | \`${bar(x)}\` ${pct(x)} | ${note} |`;
const blankRows = [...blanks]
  .sort((a, b) => b[1].km2 - a[1].km2)
  .slice(0, 30)
  .map(([name, b]) => {
    const ys = [...b.years].sort((a, c) => a - c);
    return `| ${name} | ${fmtYear(ys[0])} – ${fmtYear(ys.at(-1))} (${ys.length} maps) | ${Math.round(b.km2 / 1e6)}M |`;
  });

const md = `# Progress

How complete History Globe is. **The numbers are calculated by \`npm run progress\`**; run it after a change and commit the new file. Only the Roadmap section below is edited by hand.

_Last updated: ${new Date().toISOString().slice(0, 10)}_

${keep}

## At a glance

| Area | Progress | Detail |
|---|---|---|
${row('Map coverage (all years)', avg(perYear.map((r) => r.pct)), 'Named land on the border maps that is linked to a civilisation')}
${ERAS.map(([name]) => row(`· ${name}`, avg(perYear.filter((r) => eraOf(r.y) === name).map((r) => r.pct)))).join('\n')}
${row('Civilisations shown on the map', onMap / polities.length, `${onMap} of ${polities.length}; the rest fly to their capital`)}
${row('Checklist filled in', filled / items, `${filled} of ${items} items (${polities.length} × ${items / polities.length})`)}
${row('Answers with real detail', 1 - shortAns / (items - 2 * polities.length), `${shortAns} answers are still under 40 characters`)}
${row('Fact-checked against a source', checked / items, `${checked} items say “(checked …)”; the rest still need a second look`)}
${row('Civilisation pictures', polPics / polities.length, `${polPics} of ${polities.length}`)}
${row('“Known for” pictures', knownTotal ? knownPics / knownTotal : 0, `${knownPics} of ${knownTotal} items`)}

Certainty of all items: ${cert.confirmed} confirmed · ${cert.estimated} estimated · ${cert.disputed} disputed.
Also in the app: ${read('src/data/events.json').length} events · ${read('src/data/people.json').length} people · ${read('src/data/routes.json').length} routes · ${read('src/data/stories.json').length} stories.

## Map coverage by year

| Year | Linked |
|---|---|
${perYear.map((r) => `| ${fmtYear(r.y)} | \`${bar(r.pct)}\` ${pct(r.pct)} |`).join('\n')}

## Biggest map blanks still to fill

Areas on the border maps that no civilisation covers yet, largest first (area added up over all maps). To fix one: add its name to a civilisation’s \`borderNames\`, or create a new civilisation (see \`docs/DATA.md\`). Some land in the source maps has no name at all and can’t be linked.

| Name on the map | Years | Area × maps (km²) |
|---|---|---|
${blankRows.join('\n')}
`;
fs.writeFileSync(path.join(root, 'PROGRESS.md'), md);
console.log(`PROGRESS.md written: map ${pct(avg(perYear.map((r) => r.pct)))}, checked ${pct(checked / items)}, pictures ${polPics}/${polities.length}`);

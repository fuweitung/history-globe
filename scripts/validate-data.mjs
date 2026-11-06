// Checks every data file against the checklist schema and cross-references.
//   npm run validate-data
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src', 'data');

// Read category/field keys straight from the TypeScript schema (single source of truth).
const schemaSrc = await readFile(join(root, 'src', 'lib', 'checklistSchema.ts'), 'utf8');
const schema = [];
for (const line of schemaSrc.split('\n')) {
  let m = line.match(/^    key: '(\w+)',/);
  if (m) { schema.push({ key: m[1], fields: [] }); continue; }
  m = line.match(/^\s+\{ key: '(\w+)',/);
  if (m) schema.at(-1).fields.push(m[1]);
}

const errors = [];
const warn = [];
const CERTAINTY = new Set(['confirmed', 'estimated', 'disputed', null, undefined]);
const ERAS = new Set(['ancient', 'medieval', 'early_modern', 'modern']);
const EVENT_TYPES = new Set(['war', 'invention', 'person', 'disaster', 'trade', 'culture']);
const RELATIONS = new Set(['succeeded', 'conquered', 'colonised', 'traded_with', 'allied_with']);

const ids = new Set();
const rows = [];
for (const f of (await readdir(join(dataDir, 'polities'))).filter((f) => f.endsWith('.json')).sort()) {
  const p = JSON.parse(await readFile(join(dataDir, 'polities', f), 'utf8'));
  const where = `polities/${f}`;
  if (`${p.id}.json` !== f) errors.push(`${where}: id "${p.id}" should match file name`);
  if (ids.has(p.id)) errors.push(`${where}: duplicate id`);
  ids.add(p.id);
  for (const k of ['name', 'region', 'capital']) if (!p[k]) errors.push(`${where}: missing ${k}`);
  if (!ERAS.has(p.era)) errors.push(`${where}: bad era "${p.era}"`);
  if (typeof p.startYear !== 'number') errors.push(`${where}: startYear must be a number`);
  if (p.endYear !== null && p.endYear < p.startYear) errors.push(`${where}: endYear before startYear`);
  const KF = new Set(['textile', 'troops', 'weapon', 'tool', 'monument', 'art', 'idea', 'food', 'person']);
  for (const [i, k] of (p.knownFor ?? []).entries()) {
    if (!k.label || !KF.has(k.kind)) errors.push(`${where}: knownFor[${i}] needs a label and a valid kind`);
    if (k.year !== undefined && typeof k.year !== 'number') errors.push(`${where}: knownFor[${i}].year must be a number`);
  }
  let filled = 0, total = 0;
  for (const cat of schema) {
    for (const field of cat.fields) {
      total++;
      const item = p.checklist?.[cat.key]?.[field];
      if (!item) { warn.push(`${where}: missing ${cat.key}.${field} (will render as empty)`); continue; }
      if (!CERTAINTY.has(item.certainty)) errors.push(`${where}: ${cat.key}.${field} bad certainty "${item.certainty}"`);
      const isFilled = item.value !== null && item.value !== undefined && String(item.value).trim() !== '';
      if (isFilled) {
        filled++;
        if (!item.certainty) warn.push(`${where}: ${cat.key}.${field} has a value but no certainty`);
        if (!item.source) warn.push(`${where}: ${cat.key}.${field} has a value but no source`);
      }
    }
    for (const k of Object.keys(p.checklist?.[cat.key] ?? {})) {
      if (!cat.fields.includes(k)) errors.push(`${where}: unknown field ${cat.key}.${k}`);
    }
  }
  rows.push([p.name, filled, total]);
}

const events = JSON.parse(await readFile(join(dataDir, 'events.json'), 'utf8'));
const eids = new Set();
for (const e of events) {
  const where = `events.json#${e.id}`;
  if (eids.has(e.id)) errors.push(`${where}: duplicate id`);
  eids.add(e.id);
  if (!EVENT_TYPES.has(e.type)) errors.push(`${where}: bad type "${e.type}"`);
  if (Math.abs(e.lat) > 90 || Math.abs(e.lng) > 180) errors.push(`${where}: bad coordinates`);
  for (const pid of e.relatedPolityIds) if (!ids.has(pid)) errors.push(`${where}: unknown polity "${pid}"`);
}
const links = JSON.parse(await readFile(join(dataDir, 'links.json'), 'utf8'));
links.forEach((l, i) => {
  const where = `links.json[${i}]`;
  if (!RELATIONS.has(l.relation)) errors.push(`${where}: bad relation "${l.relation}"`);
  for (const pid of [l.fromPolityId, l.toPolityId]) if (!ids.has(pid)) errors.push(`${where}: unknown polity "${pid}"`);
});

console.log(`\n${ids.size} polities · ${events.length} events · ${links.length} links\n`);
const done = rows.filter((r) => r[1] > 0).sort((a, b) => b[1] - a[1]);
for (const [name, f, t] of done) console.log(`  ${String(Math.round((f / t) * 100)).padStart(3)}%  ${name} (${f}/${t})`);
console.log(`  …and ${rows.length - done.length} with empty checklists\n`);
if (warn.length) console.log(`${warn.length} warning(s):\n  ` + warn.slice(0, 20).join('\n  ') + (warn.length > 20 ? '\n  …' : ''));

// ── Routes ──
const routes = JSON.parse(await readFile(join(root, 'src/data/routes.json'), 'utf8'));
const KINDS = new Set(['trade', 'voyage', 'migration', 'forced']);
for (const r of routes) {
  const where = `routes.json ${r.id}`;
  if (!KINDS.has(r.kind)) errors.push(`${where}: bad kind "${r.kind}"`);
  if (!(r.from <= r.to)) errors.push(`${where}: from after to`);
  if (!r.source) errors.push(`${where}: missing source`);
  for (const pid of r.relatedPolityIds) if (!ids.has(pid)) errors.push(`${where}: unknown polity "${pid}"`);
  for (const line of r.paths) for (const [x, y] of line) if (Math.abs(y) > 90 || Math.abs(x) > 360) errors.push(`${where}: bad coordinate`);
}
if (errors.length) {
  console.error(`\n${errors.length} error(s):\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log('✓ Data is valid.');

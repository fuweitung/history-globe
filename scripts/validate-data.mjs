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
const ERAS = new Set(['prehistory', 'ancient', 'medieval', 'early_modern', 'modern']);
const EVENT_TYPES = new Set(['war', 'invention', 'person', 'disaster', 'trade', 'culture']);
const RELATIONS = new Set(['succeeded', 'conquered', 'colonised', 'traded_with', 'allied_with']);

const ids = new Set();
const rows = [];
const byId = new Map();
for (const f of (await readdir(join(dataDir, 'polities'))).filter((f) => f.endsWith('.json')).sort()) {
  const p = JSON.parse(await readFile(join(dataDir, 'polities', f), 'utf8'));
  const where = `polities/${f}`;
  if (`${p.id}.json` !== f) errors.push(`${where}: id "${p.id}" should match file name`);
  if (ids.has(p.id)) errors.push(`${where}: duplicate id`);
  ids.add(p.id);
  byId.set(p.id, p);
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

// ── People ──
const people = JSON.parse(await readFile(join(root, 'src/data/people.json'), 'utf8'));
const ROLES = new Set(['ruler', 'military', 'thinker', 'religious', 'scientist', 'writer', 'artist', 'explorer']);
const pids = new Set();
for (const p of people) {
  const where = `people.json ${p.id}`;
  if (pids.has(p.id)) errors.push(`${where}: duplicate id`);
  pids.add(p.id);
  if (!ROLES.has(p.role)) errors.push(`${where}: bad role "${p.role}"`);
  if (!(p.born < p.died)) errors.push(`${where}: born after died`);
  if (!p.source) errors.push(`${where}: missing source`);
  for (const id of p.polityIds) if (!ids.has(id)) errors.push(`${where}: unknown polity "${id}"`);
}

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
// ── Stories ──
const stories = JSON.parse(await readFile(join(root, 'src/data/stories.json'), 'utf8'));
const routeIds = new Set(routes.map((r) => r.id));
for (const st of stories) {
  st.steps.forEach((step, i) => {
    const where = `stories.json ${st.id} step ${i + 1}`;
    if (step.polity && !ids.has(step.polity)) errors.push(`${where}: unknown polity "${step.polity}"`);
    if (step.event && !eids.has(step.event)) errors.push(`${where}: unknown event "${step.event}"`);
    if (step.route && !routeIds.has(step.route)) errors.push(`${where}: unknown route "${step.route}"`);
    if (step.person && !pids.has(step.person)) errors.push(`${where}: unknown person "${step.person}"`);
    if (i > 0 && step.year < st.steps[i - 1].year) errors.push(`${where}: steps should go forward in time`);
  });
}

// ── Picture links (rendered as <img src> and <a href>, so only allow Wikimedia over https) ──
const IMG_SRC = /^https:\/\/(upload|thumb)\.wikimedia\.org\//;
const IMG_PAGE = /^https:\/\/commons\.wikimedia\.org\//;
const checkImage = (img, where) => {
  if (!img) return;
  if (!IMG_SRC.test(img.src ?? '')) errors.push(`${where}: image src must be https://upload.wikimedia.org/ or https://thumb.wikimedia.org/`);
  if (!IMG_PAGE.test(img.page ?? '')) errors.push(`${where}: image page must start with https://commons.wikimedia.org/`);
};
const images = JSON.parse(await readFile(join(dataDir, 'images.json'), 'utf8'));
for (const [k, img] of Object.entries(images.polities ?? {})) checkImage(img, `images.json polities.${k}`);
for (const [k, img] of Object.entries(images.known ?? {})) checkImage(img, `images.json known.${k}`);
for (const person of people) checkImage(person.image, `people.json ${person.id}`);

// ── Consistency checks (dates that should line up) ──
// Older periods are known less precisely, so allow a wider margin.
const slack = (y) => (y < -1000 ? 300 : y < 500 ? 100 : y < 1500 ? 50 : 15);
const end = (p) => p.endYear ?? 2025;
const outside = (p, y) => (y < p.startYear ? p.startYear - y : y > end(p) ? y - end(p) : 0);
const consistency = [];
// Deliberate exceptions (e.g. an event in the history of a territory before the modern state existed), each with a reason.
const ALLOW = JSON.parse(await readFile(join(root, 'scripts/consistency-allow.json'), 'utf8'));
const allowed = (msg) => Object.keys(ALLOW).some((k) => msg.startsWith(k + ' ') || msg.startsWith(k + ' (') || msg.startsWith(k + ':') || msg.startsWith(`${k} in`) || msg.startsWith(k.replace(/^knownFor /, 'knownFor "') + '"'));
for (const e of events) {
  for (const pid of e.relatedPolityIds) {
    const p = byId.get(pid);
    if (!p) continue;
    const from = e.year;
    const to = e.endYear ?? e.year;
    const gap = to < p.startYear ? p.startYear - to : from > end(p) ? from - end(p) : 0;
    if (gap > slack(e.year)) consistency.push(`event ${e.id} (${e.year}) is ${gap} years outside ${pid} (${p.startYear}–${p.endYear ?? 'today'})`);
  }
}
for (const person of people) {
  for (const pid of person.polityIds) {
    const p = byId.get(pid);
    if (!p) continue;
    if (person.died < p.startYear - slack(person.born) || person.born > end(p) + slack(person.born))
      consistency.push(`person ${person.id} (${person.born}–${person.died}) never overlaps ${pid} (${p.startYear}–${p.endYear ?? 'today'})`);
  }
}
for (const l of links) {
  const a = byId.get(l.fromPolityId);
  const b = byId.get(l.toPolityId);
  if (!a || !b) continue;
  if (l.relation === 'succeeded') {
    const gap = b.startYear - end(a);
    if (Math.abs(gap) > Math.max(slack(b.startYear) * 3, 200) && l.year === undefined)
      consistency.push(`link ${a.id} → ${b.id} (succeeded): ${gap} years between end and start; add a year or note`);
  } else if (l.year !== undefined) {
    for (const p of [a, b])
      if (outside(p, l.year) > slack(l.year)) consistency.push(`link ${a.id} ${l.relation} ${b.id} in ${l.year}: ${p.id} did not exist then (${p.startYear}–${p.endYear ?? 'today'})`);
  } else if (a.startYear > end(b) + slack(a.startYear) || b.startYear > end(a) + slack(b.startYear)) {
    consistency.push(`link ${a.id} ${l.relation} ${b.id}: the two never existed at the same time`);
  }
}
for (const p of byId.values()) {
  for (const k of p.knownFor ?? []) {
    if (k.year !== undefined && outside(p, k.year) > Math.max(slack(k.year), 100) && !/novel|later|legend|modern/i.test(k.note ?? ''))
      consistency.push(`knownFor "${k.label}" (${k.year}) of ${p.id} is outside its lifetime`);
  }
}
for (const l of links) {
  const a = byId.get(l.fromPolityId);
  const b = byId.get(l.toPolityId);
  if (a && b && l.relation === 'succeeded' && a.startYear > b.startYear)
    errors.push(`link ${a.id} → ${b.id} (succeeded): the successor starts before its predecessor; is the direction reversed?`);
}
const kept = consistency.filter((m) => !allowed(m));
consistency.length = 0;
consistency.push(...kept);
if (consistency.length) {
  console.log(`\n${consistency.length} consistency issue(s):\n  ` + consistency.join('\n  '));
  if (process.argv.includes('--strict')) errors.push(...consistency);
}

if (errors.length) {
  console.error(`\n${errors.length} error(s):\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log('✓ Data is valid.');

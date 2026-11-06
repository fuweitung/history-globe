// Second-source check: compares each civilisation's start/end years and capital
// with Wikidata (structured data maintained separately from the article text).
// Writes reports/wikidata-crosscheck.md. Run: npm run crosscheck
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const polDir = path.join(root, 'src/data/polities');
const UA = { 'User-Agent': 'HistoryGlobe/1.0 (educational, non-commercial)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wd(params) {
  const url = 'https://www.wikidata.org/w/api.php?' + new URLSearchParams({ format: 'json', ...params });
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
    if (res.status === 429) {
      await sleep(5000 * (i + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status}`);
    await sleep(800);
    return res.json();
  }
  throw new Error('rate-limited');
}

/** Year from a Wikidata time value ("-0221-00-00T00:00:00Z" = 221 BCE). */
const yearOf = (claim) => {
  const t = claim?.mainsnak?.datavalue?.value?.time;
  if (!t) return null;
  const m = /^([+-])(\d+)-/.exec(t);
  return m ? (m[1] === '-' ? -Number(m[2]) : Number(m[2])) : null;
};
const firstYear = (claims, props) => {
  for (const p of props) {
    const ys = (claims[p] ?? []).map(yearOf).filter((y) => y !== null);
    if (ys.length) return { year: Math.min(...ys), all: ys, prop: p };
  }
  return null;
};
const lastYear = (claims, props) => {
  for (const p of props) {
    const ys = (claims[p] ?? []).map(yearOf).filter((y) => y !== null);
    if (ys.length) return { year: Math.max(...ys), all: ys, prop: p };
  }
  return null;
};

const polities = fs.readdirSync(polDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(polDir, f), 'utf8')));
const byTitle = new Map();
for (const p of polities) if (p.wikiTitle) byTitle.set(p.wikiTitle, [...(byTitle.get(p.wikiTitle) ?? []), p]);
const titles = [...byTitle.keys()];

const entities = {};
for (let i = 0; i < titles.length; i += 50) {
  const d = await wd({ action: 'wbgetentities', sites: 'enwiki', titles: titles.slice(i, i + 50).join('|'), props: 'claims|sitelinks', sitefilter: 'enwiki' });
  for (const e of Object.values(d.entities ?? {})) {
    const t = e.sitelinks?.enwiki?.title;
    if (t) entities[t] = e;
  }
}
// Capital labels
const capIds = new Set();
for (const e of Object.values(entities)) for (const c of e.claims?.P36 ?? []) if (c.mainsnak?.datavalue?.value?.id) capIds.add(c.mainsnak.datavalue.value.id);
const labels = {};
const ids = [...capIds];
for (let i = 0; i < ids.length; i += 50) {
  const d = await wd({ action: 'wbgetentities', ids: ids.slice(i, i + 50).join('|'), props: 'labels', languages: 'en' });
  for (const [id, e] of Object.entries(d.entities ?? {})) labels[id] = e.labels?.en?.value;
}

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const rows = [];
let compared = 0;
let agree = 0;
const noData = [];
for (const [title, ps] of byTitle) {
  const e = entities[title] ?? Object.values(entities).find((x) => norm(x.sitelinks?.enwiki?.title ?? '') === norm(title));
  for (const p of ps) {
    if (!e) {
      noData.push(p.id);
      continue;
    }
    const c = e.claims ?? {};
    const start = firstYear(c, ['P571', 'P580']);
    const end = lastYear(c, ['P576', 'P582']);
    const caps = (c.P36 ?? []).map((x) => labels[x.mainsnak?.datavalue?.value?.id]).filter(Boolean);
    const span = (p.endYear ?? 2025) - p.startYear;
    const tol = Math.max(10, Math.round(span * 0.1));
    const issues = [];
    if (start) {
      compared++;
      const ok = start.all.some((y) => Math.abs(y - p.startYear) <= tol);
      if (ok) agree++;
      else issues.push(`start ${p.startYear} vs Wikidata ${start.all.join('/')}`);
    }
    if (end && p.endYear !== null) {
      compared++;
      const ok = end.all.some((y) => Math.abs(y - p.endYear) <= tol);
      if (ok) agree++;
      else issues.push(`end ${p.endYear} vs Wikidata ${end.all.join('/')}`);
    }
    if (caps.length && !caps.some((cap) => norm(p.capital).includes(norm(cap).split(/[ ,(]/)[0]))) issues.push(`capital “${p.capital}” vs Wikidata ${caps.slice(0, 4).join(', ')}`);
    if (issues.length) rows.push(`| ${p.id} | ${issues.join('<br>')} |`);
  }
}

const out = [
  '# Second-source check: Wikidata',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)}. Compares start/end years (tolerance: 10% of the lifespan, at least 10 years) and capitals with Wikidata.`,
  'Wikidata is edited separately from Wikipedia’s article text, but it is not fully independent; treat agreement as a sanity check, not proof.',
  '',
  `Dates compared: ${compared}; agree: ${agree} (${compared ? Math.round((agree / compared) * 100) : 0}%).`,
  noData.length ? `No Wikidata item found for: ${noData.join(', ')}.` : '',
  '',
  '| Civilisation | Differences to review |',
  '|---|---|',
  ...rows,
  '',
].join('\n');
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/wikidata-crosscheck.md'), out);
console.log(`Compared ${compared} dates, ${agree} agree; ${rows.length} civilisations to review. Report: reports/wikidata-crosscheck.md`);

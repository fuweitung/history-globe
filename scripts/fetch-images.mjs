// Picks one freely licensed picture per civilisation (and per "Known for" item where a
// clear match exists) from Wikipedia/Wikimedia Commons, with author and licence for credits.
// Only files hosted on Commons are used: English-Wikipedia-only files may be non-free.
// Output: src/data/images.json  →  { polities: {id: Img}, known: {"polityId|label": Img} }
// Run: npm run fetch-images   (add --known to also look up Known-for items)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const polDir = path.join(root, 'src/data/polities');
const outFile = path.join(root, 'src/data/images.json');
const UA = { 'User-Agent': 'HistoryGlobe/1.0 (educational, non-commercial)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(host, params) {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
    if (res.status === 429) {
      await sleep(5000 * (i + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    await sleep(700); // be gentle with the Wikimedia APIs
    return res.json();
  }
  throw new Error(`rate-limited: ${url}`);
}

const strip = (html = '') =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Lead image file names for up to 50 English Wikipedia articles: {requestedTitle: file}. */
async function pageImages(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    const d = await api('en.wikipedia.org', { action: 'query', prop: 'pageimages', piprop: 'name', titles: chunk.join('|'), redirects: '1', pilimit: '50' });
    // Map normalised/redirected titles back to what we asked for.
    const back = new Map(chunk.map((t) => [t, t]));
    for (const n of d.query?.normalized ?? []) back.set(n.to, back.get(n.from) ?? n.from);
    for (const r of d.query?.redirects ?? []) back.set(r.to, back.get(r.from) ?? r.from);
    for (const pg of d.query?.pages ?? []) if (pg.pageimage) out[back.get(pg.title) ?? pg.title] = pg.pageimage;
  }
  return out;
}

/** Commons info for up to 50 files at a time; files not on Commons (possibly non-free) are left out. */
async function commonsInfos(files) {
  const out = {};
  for (let i = 0; i < files.length; i += 50) {
    const chunk = files.slice(i, i + 50);
    const d = await api('commons.wikimedia.org', { action: 'query', titles: chunk.map((f) => `File:${f}`).join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '640' });
    const back = new Map(chunk.map((f) => [`File:${f}`, f]));
    for (const n of d.query?.normalized ?? []) back.set(n.to, back.get(n.from) ?? n.from);
    for (const pg of d.query?.pages ?? []) {
      if (pg.missing || !pg.imageinfo) continue;
      const file = back.get(pg.title) ?? pg.title.replace(/^File:/, '');
      const ii = pg.imageinfo[0];
      const m = ii.extmetadata ?? {};
      const license = strip(m.LicenseShortName?.value);
      if (!license || /fair use|non-free/i.test(license)) continue;
      if (/\.(tif|tiff|pdf|webm|ogv|ogg)$/i.test(file)) continue;
      out[file] = {
        src: ii.thumburl ?? ii.url,
        file,
        page: ii.descriptionurl,
        artist: strip(m.Artist?.value).slice(0, 120) || 'Unknown author',
        license,
        licenseUrl: m.LicenseUrl?.value ?? null,
        caption: strip(m.ImageDescription?.value).slice(0, 160) || null,
      };
    }
  }
  return out;
}

/** Picture for each article title (batched). */
export async function picturesFor(titles) {
  const files = await pageImages(titles);
  const infos = await commonsInfos([...new Set(Object.values(files))]);
  const out = {};
  for (const t of titles) if (files[t] && infos[files[t]]) out[t] = { ...infos[files[t]], article: t };
  return { out, files };
}

const polities = fs.readdirSync(polDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(polDir, f), 'utf8')));
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : { polities: {}, known: {} };
const withKnown = process.argv.includes('--known');

const todo = polities.filter((p) => p.wikiTitle && !out.polities[p.id]);
const { out: pics, files } = await picturesFor([...new Set(todo.map((p) => p.wikiTitle))]);
const skipped = [];
for (const p of todo) {
  if (pics[p.wikiTitle]) out.polities[p.id] = pics[p.wikiTitle];
  else skipped.push(`${p.id}${files[p.wikiTitle] ? ' (not free / not on Commons)' : ' (no lead image)'}`);
}
console.log(`Civilisation pictures: ${Object.keys(out.polities).length}/${polities.length}`);
if (skipped.length) console.log('  without picture:', skipped.join('; '));

if (withKnown) {
  // Match each Known-for label to an article with a simple search; keep only confident matches.
  const words = (s) => new Set(s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]+/g) ?? []);
  const STOP = new Set(['the', 'of', 'and', 'a', 'an', 'in', 'to', 'for', 'on']);
  // Search results are cached so an interrupted run can resume.
  const cacheFile = path.join(root, 'scripts/.known-search-cache.json');
  const matches = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
  let n = 0;
  for (const p of polities) {
    for (const item of p.knownFor ?? []) {
      const key = `${p.id}|${item.label}`;
      if (key in out.known || key in matches) continue;
      const q = `${item.label.replace(/[“”()]/g, '')} ${p.name}`;
      try {
        const d = await api('en.wikipedia.org', { action: 'query', list: 'search', srsearch: q, srlimit: '3', srprop: '' });
        const label = [...words(item.label)].filter((w) => !STOP.has(w));
        const hit = (d.query?.search ?? []).find((s) => {
          const t = words(s.title);
          return label.length && label.filter((w) => t.has(w)).length / label.length >= 0.5;
        });
        matches[key] = hit ? hit.title : null;
        if (++n % 20 === 0) fs.writeFileSync(cacheFile, JSON.stringify(matches));
      } catch {
        // retried on a later run
      }
    }
  }
  fs.writeFileSync(cacheFile, JSON.stringify(matches));
  const { out: pics } = await picturesFor([...new Set(Object.values(matches).filter(Boolean))]);
  const review = [];
  for (const [key, title] of Object.entries(matches)) {
    out.known[key] = title ? (pics[title] ?? null) : null;
    if (pics[title]) review.push(`${key} → ${title}`);
  }
  console.log(`Known-for pictures: ${Object.values(out.known).filter(Boolean).length}`);
  fs.writeFileSync(path.join(root, 'scripts/.known-image-matches.txt'), review.join('\n') + '\n');
}

fs.writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n');

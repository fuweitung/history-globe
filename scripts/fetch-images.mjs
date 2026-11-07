// Picks one freely licensed picture per civilisation (and per "Known for" item where a
// clear match exists) from Wikipedia/Wikimedia Commons, with author and licence for credits.
// Only files hosted on Commons are used: English-Wikipedia-only files may be non-free.
// Output: src/data/images.json  →  { polities: {id: Img}, known: {"polityId|label": Img} }
// Run: npm run fetch-images   (add --known to also look up Known-for items, and --retry for a second, wider search;
//      --people and --events add the lead picture of each person's and event's Wikipedia article)
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

// A flag, coat of arms, seal or logo only fits an item that is itself an emblem.
const emblemMismatch = (key, pic) => /^(Flag_of|Coat_of_arms|Seal_of|Emblem_of)|logo|wordmark/i.test(pic.file) && !/flag|arms|emblem|seal|logo/i.test(key.split('|')[1] ?? '');

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
    out.known[key] = title && pics[title] && !emblemMismatch(key, pics[title]) ? pics[title] : null;
    if (pics[title]) review.push(`${key} → ${title}`);
  }
  console.log(`Known-for pictures: ${Object.values(out.known).filter(Boolean).length}`);
  fs.writeFileSync(path.join(root, 'scripts/.known-image-matches.txt'), review.join('\n') + '\n');

  if (process.argv.includes('--retry')) {
    // Second pass for items still without a picture:
    //  1. search Wikipedia for the label alone (without the civilisation's name);
    //  2. otherwise search Wikimedia Commons files directly (good for monuments, art, cloth).
    // A result is kept only if at least half of the label's words appear in its title.
    const retryFile = path.join(root, 'scripts/.known-retry-cache.json');
    const tried = fs.existsSync(retryFile) ? JSON.parse(fs.readFileSync(retryFile, 'utf8')) : {};
    // Stricter than the first pass: most of the label's words must be in the title AND most of
    // the title's words must be in the label (rejects e.g. "Butlins Redcoats" for "Redcoats").
    // Results still need a human look: see scripts/.known-image-matches.txt.
    const fits = (label, title) => {
      const l = [...words(label)].filter((w) => !STOP.has(w));
      const t = [...words(title)].filter((w) => !STOP.has(w));
      if (!l.length || !t.length) return false;
      const share = (a, b) => a.filter((w) => b.includes(w)).length / a.length;
      return share(l, t) >= 0.5 && share(t, l) >= 0.6;
    };
    // Commons file names are long descriptions, so only the label's words are checked there.
    const fitsFile = (label, file) => {
      const l = [...words(label)].filter((w) => !STOP.has(w));
      const t = words(file);
      return l.length > 0 && l.filter((w) => t.has(w)).length / l.length >= 0.5;
    };
    const todo = polities.flatMap((p) => (p.knownFor ?? []).map((item) => ({ p, item, key: `${p.id}|${item.label}` })))
      .filter(({ key }) => !out.known[key] && !(key in tried));
    console.log(`Retrying ${todo.length} items without a picture…`);
    let done = 0;
    for (const { p, item, key } of todo) {
      const label = item.label.replace(/[“”()]/g, '');
      try {
        let found = null;
        const d = await api('en.wikipedia.org', { action: 'query', list: 'search', srsearch: label, srlimit: '5', srprop: '' });
        const hit = (d.query?.search ?? []).find((s) => fits(item.label, s.title));
        if (hit) {
          const { out: pics } = await picturesFor([hit.title]);
          if (pics[hit.title]) found = { article: hit.title, pic: pics[hit.title] };
        }
        if (!found) {
          const c = await api('commons.wikimedia.org', { action: 'query', list: 'search', srsearch: `${label} ${p.name}`, srnamespace: '6', srlimit: '5', srprop: '' });
          for (const s of c.query?.search ?? []) {
            const file = s.title.replace(/^File:/, '');
            if (!fitsFile(item.label, file.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]/g, ' '))) continue;
            const info = (await commonsInfos([file]))[file];
            if (info) { found = { article: null, pic: { ...info, article: null } }; break; }
          }
        }
        tried[key] = found ? (found.article ?? `File:${found.pic.file}`) : null;
        if (found && !emblemMismatch(key, found.pic)) {
          out.known[key] = found.pic;
          review.push(`${key} → ${tried[key]} (retry)`);
        }
      } catch {
        // left for a later run
      }
      if (++done % 20 === 0) {
        fs.writeFileSync(retryFile, JSON.stringify(tried));
        fs.writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n');
      }
    }
    fs.writeFileSync(retryFile, JSON.stringify(tried));
    fs.writeFileSync(path.join(root, 'scripts/.known-image-matches.txt'), review.join('\n') + '\n');
    console.log(`Known-for pictures after retry: ${Object.values(out.known).filter(Boolean).length}`);
  }
}


// People and events: the lead picture of the Wikipedia article each one already names.
// A review list (scripts/.people-event-image-matches.txt) shows every match for a human check.
const wikiOf = (source) => source?.match(/^Wikipedia: (.+?)(?: \(checked[^)]*\))?\.?$/)?.[1];
const reviewPE = [];
async function addPictures(section, items) {
  out[section] ??= {};
  const todo = items.filter((x) => x.title && !out[section][x.id]);
  const { out: found } = await picturesFor([...new Set(todo.map((x) => x.title))]);
  for (const x of todo) if (found[x.title]) { out[section][x.id] = found[x.title]; reviewPE.push(`${section}\t${x.id}\t${x.title}\t${found[x.title].file}`); }
  console.log(`${section} pictures: ${Object.keys(out[section]).length}/${items.length}`);
}
if (process.argv.includes('--people')) {
  const people = JSON.parse(fs.readFileSync(path.join(root, 'src/data/people.json'), 'utf8'));
  await addPictures('people', people.filter((p) => !p.image).map((p) => ({ id: p.id, title: p.wikiTitle ?? p.name })));
}
if (process.argv.includes('--events')) {
  const events = JSON.parse(fs.readFileSync(path.join(root, 'src/data/events.json'), 'utf8'));
  await addPictures('events', events.map((e) => ({ id: e.id, title: wikiOf(e.source) ?? e.title })));
}
if (reviewPE.length) fs.appendFileSync(path.join(root, 'scripts/.people-event-image-matches.txt'), reviewPE.join('\n') + '\n');
// Hand-checked rejections always win (scripts/image-rejects.json).
const rejects = JSON.parse(fs.readFileSync(path.join(root, 'scripts/image-rejects.json'), 'utf8'));
for (const k of rejects.known ?? []) if (k in out.known) out.known[k] = null;
for (const s of ['people', 'events']) for (const k of rejects[s] ?? []) if (out[s]) delete out[s][k];
fs.writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n');

# Data guide

How the data is organised, and how to add or edit it. For the team workflow see `CONTRIBUTING.md`.

## Features in detail

- **Timeline:** each era gets its own share of the slider (Prehistory 10%, Ancient 28%, Medieval 20%, Early Modern 20%, Modern 22%), so 12,000 years fit without squeezing recent centuries. Era chips jump to the start of an era. ‹ › and the arrow keys step 50 years in Prehistory, 10 in the Ancient era, 5 in the Medieval and 1 after 1500; « » and Shift + arrow step ten times as far. **Space** plays or pauses. BCE years are stored as negative numbers (−1 = 1 BCE), and there is no year 0.
- **Borders:** dots on the timeline mark the years that have real border maps. Between them, the nearest map is shown, and the header says how far away it is.
- **Civilisations:** click a coloured territory, or use the **Civilisations** list. Colonies take their ruling power's colour, so an empire reads as one block.
- **Checklist:** 10 categories, each with a completion bar. Every fact shows its year, its certainty (**Confirmed**, **≈ Estimated** or **Disputed**) and its source. Clicking a year chip moves the timeline to that year.
- **Events:** coloured markers show events within ±25 years (±250 in the Ancient era, ±125 in the Medieval; you can change the window). They fade the further they are from the selected year. Use the **Events** menu to filter by type.
- **Search:** press `/` (or ⌘/Ctrl+K) or tap the magnifier. Finds civilisations, their “Known for” items (cloth, troops, tools…) and events. Accents and ʻokina are ignored, so “dai viet” finds Đại Việt.
- **Compare:** open any civilisation and tap **⇄ Compare**, or use “Compare two” in the Civilisations list. You get two civilisations side by side on the same 43 elements, with Rise & fall first. It also shows their lifespans on one scale, how long they overlapped, and any direct links between them. Link format: `?compare=roman-empire,han-china`.
- **Territory charts:** every civilisation panel shows its territory on each border map (hover or tap for values; click to jump there), with the checklist peak marked and a data table. Compare overlays two civilisations on one axis. Areas are measured from the border snapshots by `npm run compute-territory`, colonies and vassals included, so they are approximate: snapshots are years apart, and a few gaps in the source maps are skipped.
- **Routes & migrations:** 18 trade routes, voyages and migrations (Silk Road, Indian Ocean, trans-Saharan caravans, Viking and Polynesian voyages, Bantu and Austronesian expansions, Zheng He, the Manila galleons, the Atlantic slave trade…) appear on the map while they were in use. Each kind has its own colour *and* dash pattern; click one for its story, goods and civilisations involved. Toggle them in the Events menu. Lines show the general direction through key places, not exact paths. Data: `src/data/routes.json`.
- **Population charts:** dated population figures from each civilisation’s Wikipedia infobox (60 civilisations have them), drawn with ranges as whiskers; overlaid in Compare.
- **Pictures:** a freely licensed picture for almost every civilisation and person (Known-for pictures can be added with `--known`), taken from the matching Wikipedia article but only if the file is on Wikimedia Commons with a free licence; every picture shows its author and licence and links to its Commons page. Refresh with `npm run fetch-images` (add `--known` for Known-for items). Data: `src/data/images.json`.
- **People:** 115 famous people (rulers, thinkers, scientists, writers, explorers…) appear on the map while they were alive, with a panel for each (dates checked against Wikipedia; uncertain dates marked “c.”). Civilisation panels list their famous people; search finds them; toggle them in the Events menu. Data: `src/data/people.json`.
- **Stories:** 11 guided tours, from the first civilisations to the world wars. Each step sets the year, flies the map and highlights what it talks about; use ← / → or Next. Open them from the book icon. Links like `?story=rome&step=3` open a step. Data: `src/data/stories.json` (easy to add more).
- **Shareable links:** the URL keeps the year and the selection, e.g. `?year=1760&polity=qing-china`.
- **Mobile:** the panel becomes a bottom sheet. Drag or tap the handle to resize it.

## Project structure

```
history-globe/
├── public/data/
│   ├── borders/            # historical-basemaps snapshots + manifest.json
│   └── land.geojson        # Natural Earth land outlines
├── scripts/
│   ├── fetch-borders.mjs   # downloads border snapshots
│   ├── validate-data.mjs   # data checker
│   ├── compute-territory.mjs, fetch-images.mjs, crosscheck-wikidata.mjs
└── src/
    ├── types/index.ts      # Polity, Checklist, HistoryEvent, PolityLink (the data contract)
    ├── data/
    │   ├── polities/*.json # one file per civilisation (190, all with complete checklists and “Known for” items)
    │   ├── events.json     # 432 events across 12,000 years, each new one with a source
    │   └── links.json      #  links: succeeded / conquered / colonised / traded_with / allied_with
    ├── lib/
    │   ├── checklistSchema.ts  # the 10 categories: labels, order, guiding questions, completion maths
    │   ├── borders.ts          # snapshot loading, name→polity matching, colours, label placement
    │   ├── timeScale.ts        # the four eras, piecewise slider scale, era-aware stepping
    │   └── data.ts             # loaders and helpers
    ├── components/
    │   ├── MapView.tsx         # MapLibre globe ↔ flat map, borders, labels, event markers
    │   ├── TimelineSlider.tsx
    │   ├── Panel.tsx           # side panel (desktop) / bottom sheet (mobile)
    │   ├── PolityDetail.tsx    # civilisation view + checklist
    │   ├── ChecklistCategory.tsx
    │   └── OtherViews.tsx      # event, unlinked region, civilisation browser
    └── __tests__/              # automated tests (npm test)
```

## Adding or editing data

### Fill in a civilisation's checklist

Open `src/data/polities/<id>.json`. Every checklist item has this shape:

```json
{ "value": "Text or a number", "year": 1650, "certainty": "estimated", "source": "Author, Title (year)" }
```

- Leave `value` as `null` while an item is empty. It shows as "Not yet filled in".
- Use `"certainty": "estimated"` for approximate figures and dates, and `"disputed"` where historians disagree.
- Keep the wording neutral and descriptive. Where a term is contested, say whose term it is.
- Run `npm run validate-data` afterwards. It warns about items with a value but no source or certainty.

**All 190 civilisations have complete 43-item checklists.** Each also has a **Known for** list of signature culture: cloth and dress, special troops, weapons, tools and inventions, monuments, art, ideas and laws, food, and people. Tap a chip to read about it and jump to its year. Key dates and figures were checked against the live Wikipedia articles (5–6 Nov 2026). Items marked “checked” were confirmed there; other items cite scholarly works. Conflicting dates are marked Disputed, and politically sensitive topics use the sources’ own neutral wording. A history teacher should still review the content before classroom use.

The first examples written were:

- **Ancient:** `han-china.json`, `roman-empire.json`
- **Medieval:** `srivijaya.json`
- **Early modern / modern:** `melaka-sultanate.json`, `ottoman-empire.json`, `qing-china.json`

The Chinese dynasties (Shang → Zhou → Qin → Sui → Tang → Song → Yuan, plus parts of Ming, ROC and PRC) are partly filled from the fact-checked research behind the "5,000 Years of China" video. They're linked as a "succeeded" chain, so students can follow the dynastic cycle.

### Add a new civilisation

Copy any stub (for example `mataram-sultanate.json`), rename it to `<new-id>.json`, and set `id` to the same value. It shows up in the app automatically.

### Link a civilisation to map borders

The border maps use their own names (for example "Manchu Empire" for the Qing). List them in `borderNames`. To see the names on the map, hover over a territory, or click it to open its region card.

- Names are matched against each polygon's own name first, then against its overlord (`SUBJECTO`). That's how colonies get linked to their empire.
- By default a name only matches snapshots within the civilisation's lifetime, ±10 years.
- When the same name is used in different eras ("China", "France", "Japan"), set `borderYears: [from, to]` to limit it to a strict window.

### Add an event

Add an object to `src/data/events.json`. Allowed `type` values are `war`, `invention`, `person`, `disaster`, `trade` and `culture`. Set `yearApproximate: true` if the date is uncertain.

## Data sources & credits

- **Historical borders:** [historical-basemaps](https://github.com/aourednik/historical-basemaps) by A. Ourednik and contributors, licensed **GPL-3.0**. Pre-modern borders are approximations, and many frontiers were zones rather than lines. If you publish this app, keep the attribution and check the GPL's terms for redistributing the data.
- **Land outlines:** [Natural Earth](https://www.naturalearthdata.com/) (public domain).
- **Map engine:** [MapLibre GL JS](https://maplibre.org/) (BSD-3). Label fonts come from MapLibre's free demo font server.
- **Seed content:** written for this project with a cited source on every item. Figures are scholarly estimates and are labelled as such.

### What the 43/43 means

Each civilisation is described with the same 43 elements in 10 categories (geography, population, economy, politics, military, technology and transport, culture and daily life, connections, rise & fall, data quality). “43/43” is how many of those elements are documented. It measures how complete the study profile is, not how “great” the civilisation was. Using the same template for every civilisation lets you compare why they rose and fell.

### Known data limitations

- Some civilisations have no matching polygon in the border dataset: **Mataram**, **Majapahit**, the **Akkadian Empire**, **Chimú**, the **Mississippian culture**, **Phoenicia**, the **Rashidun Caliphate** and the **Three Kingdoms** (no snapshot falls in 220–280), plus **Johor** before about 1650. For these, "Show on map" flies to the capital instead.
- Border snapshots are uneven: about 100–500 years apart in ancient times, denser in the 20th century.
- The dataset has some naming quirks (e.g. "Zhoa" for the Shang/Zhou area, "Sui Empire" still used in 700). Strict `borderYears` windows keep these matched to the right civilisation, and map labels show our civilisation names for linked territories.

### Checks

- `npm run crosscheck` compares dates and capitals with Wikidata (report in `reports/`). See `REVIEW.md` for a teacher/expert review guide.

- `npm test` runs the automated tests (time scale, search, border matching, charts).
- `npm run validate-data` checks every data file, including that events, people, links and stories line up in time; deliberate exceptions are listed with reasons in `scripts/consistency-allow.json`. Add `-- --strict` to fail on any consistency issue.


# 🌍 History Globe

An interactive globe of world history from **1500 to today**. You drag the timeline, watch borders change, and open a structured checklist that helps explain **why** civilisations rise, peak and decline.

Built with Vite, React, TypeScript, MapLibre GL JS and Tailwind CSS. All data is static JSON. There's no backend and no API keys.

---

## Run it locally

You need **Node.js 18 or newer** (`node -v` to check).

```bash
cd history-globe
npm install
npm run dev
```

Then open **http://localhost:5173**.

The historical border files are already in `public/data/borders/`. If they're missing, or you want to refresh them, run:

```bash
npm run fetch-borders            # downloads anything missing
npm run fetch-borders -- --force # re-downloads everything
```

### Other commands

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks and builds a static site into `dist/` (works from any sub-folder) |
| `npm run preview` | Serves the built `dist/` folder locally |
| `npm run validate-data` | Checks every data file against the schema and shows how complete each checklist is |
| `npm run typecheck` | TypeScript check only |

---

## Using the app

- **Timeline:** drag the slider, use ‹ › for one year or « » for ten, or press **Play**. Keyboard: **← / →** moves one year, **Shift + ← / →** moves ten, **Space** plays or pauses.
- **Borders:** dots on the timeline mark the years that have real border maps. Between them, the nearest map is shown, and the header says how far away it is.
- **Civilisations:** click a coloured territory, or use the **Civilisations** list. Colonies take their ruling power's colour, so an empire reads as one block.
- **Checklist:** 10 categories, each with a completion bar. Every fact shows its year, its certainty (**Confirmed**, **≈ Estimated** or **Disputed**) and its source. Clicking a year chip moves the timeline to that year.
- **Events:** coloured markers show events within ±25 years (you can change the window). They fade the further they are from the selected year. Use the **Events** menu to filter by type.
- **Shareable links:** the URL keeps the year and the selection, e.g. `?year=1760&polity=qing-china`.
- **Mobile:** the panel becomes a bottom sheet. Drag or tap the handle to resize it.

---

## Project structure

```
history-globe/
├── public/data/
│   ├── borders/            # historical-basemaps snapshots + manifest.json
│   └── land.geojson        # Natural Earth land outlines
├── scripts/
│   ├── fetch-borders.mjs   # downloads border snapshots
│   └── validate-data.mjs   # data checker
└── src/
    ├── types/index.ts      # Polity, Checklist, HistoryEvent, PolityLink (the data contract)
    ├── data/
    │   ├── polities/*.json # one file per civilisation (39)
    │   ├── events.json     # 86 events
    │   └── links.json      # succeeded / conquered / colonised / traded_with / allied_with
    ├── lib/
    │   ├── checklistSchema.ts  # the 10 categories: labels, order, guiding questions, completion maths
    │   ├── borders.ts          # snapshot loading, name→polity matching, colours, label placement
    │   └── data.ts             # loaders and helpers
    ├── components/
    │   ├── MapView.tsx         # MapLibre globe ↔ flat map, borders, labels, event markers
    │   ├── TimelineSlider.tsx
    │   ├── Panel.tsx           # side panel (desktop) / bottom sheet (mobile)
    │   ├── PolityDetail.tsx    # civilisation view + checklist
    │   ├── ChecklistCategory.tsx
    │   └── OtherViews.tsx      # event, unlinked region, civilisation browser
    └── features/               # reserved for later phases: charts/, compare/, swimlane/, quiz/
```

---

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

The three fully seeded examples are `melaka-sultanate.json`, `ottoman-empire.json` and `qing-china.json`.

### Add a new civilisation

Copy any stub (for example `mataram-sultanate.json`), rename it to `<new-id>.json`, and set `id` to the same value. It shows up in the app automatically.

### Link a civilisation to map borders

The border maps use their own names (for example "Manchu Empire" for the Qing). List them in `borderNames`. To see the names on the map, hover over a territory, or click it to open its region card.

- Names are matched against each polygon's own name first, then against its overlord (`SUBJECTO`). That's how colonies get linked to their empire.
- By default a name only matches snapshots within the civilisation's lifetime, ±10 years.
- When the same name is used in different eras ("China", "France", "Japan"), set `borderYears: [from, to]` to limit it to a strict window.

### Add an event

Add an object to `src/data/events.json`. Allowed `type` values are `war`, `invention`, `person`, `disaster`, `trade` and `culture`. Set `yearApproximate: true` if the date is uncertain.

---

## Data sources & credits

- **Historical borders:** [historical-basemaps](https://github.com/aourednik/historical-basemaps) by A. Ourednik and contributors, licensed **GPL-3.0**. Pre-modern borders are approximations, and many frontiers were zones rather than lines. If you publish this app, keep the attribution and check the GPL's terms for redistributing the data.
- **Land outlines:** [Natural Earth](https://www.naturalearthdata.com/) (public domain).
- **Map engine:** [MapLibre GL JS](https://maplibre.org/) (BSD-3). Label fonts come from MapLibre's free demo font server.
- **Seed content:** written for this project with a cited source on every item. Figures are scholarly estimates and are labelled as such.

### Known data limitations

- Some civilisations have no matching polygon in the border dataset, for example the **Mataram Sultanate**, or **Johor** before about 1650. For these, "Show on map" flies to the capital instead.
- Border snapshots are uneven: dense in the 20th century, sparse in the 16th to 18th.

---

## Roadmap (structure already in place)

- **Rise-and-fall charts:** `Polity.series` (population, territory, GDP per person) is already in the types. Data would come from the Maddison Project and Our World in Data. Goes in `src/features/charts/`.
- **Swimlane timeline:** compare lifespans side by side. Goes in `src/features/swimlane/`.
- **Compare mode:** two checklists side by side. `CHECKLIST_SCHEMA` makes this straightforward. Goes in `src/features/compare/`.
- **Ancient history:** add `'ancient' | 'classical' | 'medieval'` to `Era`, add years such as `bc500` or `100` to `fetch-borders.mjs`, and lower `MIN_YEAR`.
- **Quiz / exam prep:** generate questions from checklist items. Goes in `src/features/quiz/`.

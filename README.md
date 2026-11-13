# 🌍 History Globe

An interactive globe of world history, from **10,000 BCE to today**. Drag the timeline to watch borders change, then open any civilisation to see **why** it rose, peaked and declined.

> **Beta.** This is an early version. Many facts are still being checked, and the project is not yet public.

## Why this exists

“Those who cannot remember the past are condemned to repeat it.” (George Santayana). History Globe is built on the idea that we need to remember what happened in the past, honestly and from more than one side, to avoid repeating the same mistakes.

## What's inside

- **499 civilisations and peoples**, each described with the same 43-point checklist (geography, economy, politics, military, culture, transport, daily life, rise & fall…), and every fact has a source and a certainty label
- **962 events**, **451 famous people** and **18 trade routes and migrations**
- **Search, Compare** two civilisations, **territory and population charts**, and guided stories (11 are written but **hidden for now** while the storytelling design is agreed)
- Works on desktop and phone

## How we handle facts

- Every fact has a **source** and a **certainty** label: confirmed, estimated or disputed. “(checked <date>)” appears only when the source page was actually read; about 42% of items are checked so far and the rest are drafts waiting for a second look.
- Where scholars or governments disagree, the app gives each side. Sensitive topics have a review pack in [docs/sensitive-review.md](docs/sensitive-review.md) (checked by an AI on the owner’s instruction, not yet by a human expert).
- **No living people** are named; modern entries describe the office or event instead.
- Anyone can [report a mistake](https://docs.google.com/forms/d/e/1FAIpQLSf9bgR9PnpobNyCZ31s3LPuJWfD5Eph9uYQ8Ef-12do3CO2bQ/viewform); the link is also in the app.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app on your computer |
| `npm run dev:phone` | Same, but also open it on your phone (same Wi-Fi) |
| `npm run validate-data` | Check the data for mistakes |
| `npm test` | Run the automated tests |
| `npm run progress` | Update the progress percentages in PROGRESS.md |
| `npm run build` | Build the website into `dist/` |

## Learn more

- [PROGRESS.md](PROGRESS.md): what's done, what's next, and progress % (map coverage, fact-checking, pictures)
- [docs/DATA.md](docs/DATA.md): all features, the project's files, and how to add or edit data
- [CONTRIBUTING.md](CONTRIBUTING.md): how we work together
- [REVIEW.md](REVIEW.md): what a teacher or expert should check

## Made by

- **Tung Fu Wei**, a Malaysian mechanical engineering student at Northumbria University, with experience in engineering, finance and real estate. [GitHub](https://github.com/fuweitung) · [X](https://x.com/TungFuWei)
- **MikeTKnn** ([GitHub](https://github.com/MikeTKnn))

## Licence

The code is released under the [GPL-3.0](LICENSE) licence. Written content and pictures stay under the licences of their sources, shown beside each item and picture.

## Credits

- Historical borders: [historical-basemaps](https://github.com/aourednik/historical-basemaps) (GPL-3.0). Old borders are approximate. Selecting an empire also highlights parts of it that have their own entries, such as the Mongol khanates, the Belgian Congo and colonial Greenland; see [docs/DATA.md](docs/DATA.md#link-a-civilisation-to-map-borders).
- Land outlines: [Natural Earth](https://www.naturalearthdata.com/) (public domain). Map engine: [MapLibre GL JS](https://maplibre.org/) (BSD-3).
- Pictures: [Wikimedia Commons](https://commons.wikimedia.org), free licences only, each credited in the app.

# 🌍 History Globe

An interactive globe of world history, from **10,000 BCE to today**. Drag the timeline to watch borders change, then open any civilisation to see **why** it rose, peaked and declined.

## What's inside

- **377 civilisations and peoples**, each described with the same 43-point checklist (geography, economy, politics, military, culture, transport, daily life, rise & fall…), and every fact has a source and a certainty label
- **432 events**, **115 famous people** and **18 trade routes and migrations**
- **Search, Compare** two civilisations, **territory and population charts**, and **11 guided stories**
- Works on desktop and phone

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

## Credits

- Historical borders: [historical-basemaps](https://github.com/aourednik/historical-basemaps) (GPL-3.0). Old borders are approximate.
- Land outlines: [Natural Earth](https://www.naturalearthdata.com/) (public domain). Map engine: [MapLibre GL JS](https://maplibre.org/) (BSD-3).
- Pictures: [Wikimedia Commons](https://commons.wikimedia.org), free licences only, each credited in the app.

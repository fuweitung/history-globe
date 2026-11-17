# 🌍 History Globe

**An interactive globe of world history, from 10,000 BCE to today.**

Drag the timeline and watch borders change. Open any civilisation to see not only what happened, but **why** it rose, reached its peak and declined.

> **A note on status.** History Globe is in beta. It is a work in progress, many facts are still waiting for a second check, and the project has not been released publicly yet. We would rather tell you that plainly than pretend it is finished.

## Why we built it

> “Those who cannot remember the past are condemned to repeat it.” — George Santayana

We believe that remembering the past honestly, and from more than one side, is one of the best ways to avoid repeating its mistakes. History Globe is our attempt to make that kind of remembering easy, visual and open to everyone, whether you are a student, a teacher or simply curious.

## What you will find

- **506 civilisations and peoples**, each described with the same 43-point checklist: geography, economy, politics, military, culture, transport, daily life, and the reasons for its rise and fall
- **964 events**, **451 well-known people** and **18 trade routes and migrations**
- **Search**, **side-by-side comparison** of two civilisations, and **territory and population charts**
- Historical maps for 53 moments in time, with the borders and the peoples of each period
- Pictures from Wikimedia Commons, each credited, and a calm “No picture available yet” note where no free picture exists
- A layout that works on desktop and on a phone

Guided stories are written but **hidden for now**, while we agree how best to present them.

## How we treat facts

Accuracy matters more to us than speed, so we hold ourselves to a few simple rules:

- **Every fact has a source and a certainty label:** confirmed, estimated or disputed. The words “(checked <date>)” appear only when the source page was actually read. About 42% of items are checked so far; the rest are honest drafts waiting for a second look.
- **Disagreement is shown, not hidden.** Where historians or governments differ, the app gives each side in neutral wording. Our review pack for sensitive topics is in [docs/sensitive-review.md](docs/sensitive-review.md). It was checked by an AI at the owner’s instruction and has not yet had a human expert’s read.
- **No living people are named.** Modern entries describe the office or the event instead.
- **Spot a mistake?** Please [tell us](https://docs.google.com/forms/d/e/1FAIpQLSf9bgR9PnpobNyCZ31s3LPuJWfD5Eph9uYQ8Ef-12do3CO2bQ/viewform). The link is also inside the app, and every report helps.

## Getting started

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

### Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app on your computer |
| `npm run dev:phone` | Same, and also open it on your phone (same Wi-Fi) |
| `npm run validate-data` | Check the data for mistakes |
| `npm test` | Run the automated tests |
| `npm run progress` | Update the progress figures in PROGRESS.md |
| `npm run build` | Build the website into `dist/` |

## Where to read more

- [PROGRESS.md](PROGRESS.md): what is done, what comes next, and the progress figures
- [docs/DATA.md](docs/DATA.md): every feature, the project’s files, and how to add or edit data
- [docs/LAUNCH-PLAN.md](docs/LAUNCH-PLAN.md): our plan for going public
- [CONTRIBUTING.md](CONTRIBUTING.md): how we work together
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and [SECURITY.md](SECURITY.md): how we treat each other, and how to report a security problem
- [REVIEW.md](REVIEW.md): what a teacher or expert should check first

## Made by

- **Tung Fu Wei** is a Malaysian mechanical engineering student at Northumbria University, with experience in engineering, finance and real estate. [GitHub](https://github.com/fuweitung) · [X](https://x.com/TungFuWei)
- **MikeTKnn** is a Malaysian mechanical engineering student at Northumbria University, and has worked as a mechanical designer for a machine maker since 2019. [GitHub](https://github.com/MikeTKnn) · [X](https://x.com/hongquanteoh1) · [Threads](https://www.threads.com/@hquan_0124)

## Licence

The code is released under the [GPL-3.0](LICENSE) licence. Written content and pictures stay under the licences of their sources, shown beside each item and picture.

## Acknowledgements

With thanks to the projects and communities that make this possible:

- **Historical borders:** [historical-basemaps](https://github.com/aourednik/historical-basemaps) (GPL-3.0). Old borders are approximate. Selecting an empire also highlights parts of it that have their own entries, such as the Mongol khanates, the Belgian Congo and colonial Greenland; see [docs/DATA.md](docs/DATA.md#link-a-civilisation-to-map-borders).
- **Land outlines:** [Natural Earth](https://www.naturalearthdata.com/) (public domain)
- **Map engine:** [MapLibre GL JS](https://maplibre.org/) (BSD-3)
- **Pictures:** [Wikimedia Commons](https://commons.wikimedia.org), free licences only, each credited in the app

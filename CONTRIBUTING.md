# Working together on History Globe

This guide is for the project team. The repository is private: only invited collaborators can see it.

## One-time setup (each person)

1. Install [Node.js](https://nodejs.org) (version 20 or newer) and [Git](https://git-scm.com).
2. Accept the GitHub invitation (it arrives by email and at github.com/notifications).
3. Download the project and install it:
   ```bash
   git clone https://github.com/fuweitung/history-globe.git
   cd history-globe
   npm install
   npm run dev
   ```
   Open http://localhost:5173.

## Everyday workflow

Each piece of work happens on its own **branch**, and joins the main version through a **pull request** that the other person reviews. This way nobody overwrites anyone else’s work.

```bash
git checkout main
git pull                          # get your partner's latest work
git checkout -b add-oyo-details   # a short name for your change
# …edit files, check them in the app…
npm run validate-data && npm test # both must pass
git add -A
git commit -m "Add more detail to the Oyo Empire"
git push -u origin add-oyo-details
```

Then on GitHub, click **Compare & pull request**. Your partner reads the changes, comments if needed, and clicks **Merge**.

Tip: agree who is working on which civilisations or features, so you rarely edit the same file at the same time.

## What goes where

| You want to… | Edit |
|---|---|
| Fix or add a fact about a civilisation | `src/data/polities/<id>.json` |
| Add a civilisation | Copy an existing file in `src/data/polities/`, change the `id` (must match the file name) and every field |
| Add an event | `src/data/events.json` |
| Add a person | `src/data/people.json` |
| Add a trade route or migration | `src/data/routes.json` |
| Add a guided story | `src/data/stories.json` |
| Link two civilisations | `src/data/links.json` |

Each checklist item looks like this:

```json
{ "value": "Trajan (98–117) ruled the empire at its largest.", "year": 117, "certainty": "confirmed", "source": "Wikipedia: Roman Empire (checked 6 Nov 2026)" }
```

## House rules for content

1. **Cite a source** for every fact. Write “(checked <date>)” only if you actually read it there.
2. **Certainty:** `confirmed` (sources agree), `estimated` (approximate or a range), `disputed` (sources disagree; say who says what).
3. **Neutral wording.** Describe; don’t judge. For contested topics give each side’s view and attribute it.
4. **Plain English** for students: short sentences, explain unusual words.
5. Years: BCE as negative numbers (−500 = 500 BCE); there is no year 0.

## Checks

- `npm run validate-data` checks every data file and that dates line up (add `-- --strict` to treat date mismatches as errors).
- `npm test` runs the automated tests.
- `npm run crosscheck` compares dates with Wikidata (writes `reports/wikidata-crosscheck.md`).
- `REVIEW.md` lists what most needs a second look.

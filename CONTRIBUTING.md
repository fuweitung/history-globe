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

## Seeing your changes

- **On your computer:** `npm run dev`, then open http://localhost:5173. The page updates as you save files.
- **On your phone or tablet:** connect it to the same Wi-Fi as your computer and run `npm run dev:phone`. Vite prints a “Network” address such as `http://192.168.1.23:5173`; open that on the phone.
- **The finished version:** `npm run preview:build` builds the site exactly as it would be published and serves it (also reachable from your phone).
- **Your partner’s work:** run `git fetch` and `git checkout <their-branch>`, then `npm run dev`, to try a pull request before merging it.

## Private online preview (Cloudflare Pages)

The site is built online after every push, behind a login only the team can pass.

- **Main version:** `https://history-globe.pages.dev` (updated when a pull request is merged).
- **Each branch:** `https://<branch-name>.history-globe.pages.dev`; the link also appears in the pull request.
- Opening either asks for your email and sends a one-time code. Only team emails are allowed.

One-time setup (owner):
1. Sign up at dash.cloudflare.com (free plan).
2. **Workers & Pages → Create → Pages → Connect to Git**, authorise GitHub for **only** `fuweitung/history-globe`.
3. Build settings: framework **Vite**, build command `npm run build`, output directory `dist`, production branch `main`. Node 20 is picked up from `.nvmrc`.
4. After the first build: project **Settings → General → Access policy → Enable**. This creates a Cloudflare Access app; edit its policy to **Include → Emails** with both team emails. Login method: One-time PIN.
5. Open the site in a private window to check that it asks for a code.

## Who works on what

We use **GitHub Issues** as a shared to-do list, so we never do the same job twice:

1. Before starting, look at the issues (github.com/fuweitung/history-globe/issues). If yours isn't there, create it.
2. **Claim it:** assign yourself and add the `in-progress` label. Anything already assigned belongs to the other person: ask before touching it.
3. Work on a branch named `<initials>/<issue-number>-<short-name>`, e.g. `fw/3-oyo-details`.
4. Open a pull request with `Closes #3` in the description; merging closes the issue.

Both of our Claude Code sessions read `CLAUDE.md`, which tells them to follow these steps automatically. Tell your Claude “pick up issue #3” and it will pull, claim, branch, check and open the pull request.

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

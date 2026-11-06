# History Globe: rules for Claude Code sessions

Two people work on this project, each with their own Claude Code: **fuweitung** (owner) and **MikeTKnn**. These rules keep the two sessions from clashing. Follow them unless the person you are working with explicitly says otherwise.

## Before starting any task
1. `git checkout main && git pull` to get the latest work. Read PROGRESS.md to see what is done and what is next.
2. Find the GitHub issue for the task (`gh issue list`). If there is none, create one.
3. **Claim it:** check it is not assigned to the other person, then assign it to the current user and mark it (`gh issue edit <n> --add-assignee @me --add-label in-progress`) and add a comment saying what you will change. If it is already assigned to someone else, stop and tell the user.
4. Create a branch named `<initials>/<issue-number>-<short-name>`, e.g. `fw/12-tsardom-of-russia` or `mk/15-quiz-mode`.

## While working
- Never commit directly to `main`; never force-push to `main`.
- Keep changes small and focused on the issue. Prefer one civilisation or one feature per pull request.
- Shared lists change often and are the main source of merge conflicts: `src/data/events.json`, `links.json`, `people.json`, `routes.json`, `stories.json`. Pull `main` before editing them and keep those edits short.
- Civilisations live one per file in `src/data/polities/`, so two people can work on different civilisations at the same time without conflicts.

## Before opening a pull request
- `npm run validate-data` and `npm test` must pass; run `npx tsc -b` for code changes.
- Check the change in the app (`npm run dev`).
- Run `npm run progress` and commit the updated PROGRESS.md; tick the matching Roadmap box there when the work is done.
- Push the branch and open a pull request that says `Closes #<issue>`. The other person reviews and merges it.

## Content rules
- Every fact has a source; write “(checked <date>)” only if the page was actually read.
- Certainty: `confirmed`, `estimated` or `disputed` (give each side’s view for disputed points).
- Neutral wording; plain English for students. BCE years are negative; there is no year 0.
- After changing `borderNames`/`borderYears`, run `npm run compute-territory`.
- Pictures: only freely licensed Wikimedia Commons files, with credits (`npm run fetch-images`). Be gentle with Wikimedia APIs (batch requests; stop if rate-limited).

See `CONTRIBUTING.md` for setup and `REVIEW.md` for what most needs checking.

# Daily Delve (cse4095-team-2)

A shared daily dungeon card game: everyone gets the same seeded dungeon each day, plays it
once for the leaderboard, and the server re-simulates the run to verify the score.

**[TODO.md](TODO.md) is the task list and the spec.** Start there: "Rules for every task"
for how to work, and the Reference (R1 to R7) at the bottom for the repo layout, engine
rules, game rules, API, and database.

## Commands

From the repo root (Node version in `.nvmrc`):

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run dev        # the server on :3000 and the client on :5173
```

The production build serves the app and the API from one process on one port:

```bash
npm run build      # builds the client into apps/client/dist
npm start          # migrates the database, then serves on PORT (default 3000)
```

## Deployment

`render.yaml` is a Render Blueprint: one free web service and one free Postgres database.
Render deploys `main` once CI has passed on the commit, and every start migrates the
database first.

- **URL:** not deployed yet.
- **Database expiry:** not created yet. A free Render Postgres database expires 30 days
  after it is created, so create it on or after Nov 13, 2026, and write its expiry date here.

To deploy, once `render.yaml` is on `main`: in the Render dashboard choose **New**, then
**Blueprint**, pick this repository, and apply it. Render creates the database and the
service, wires `DATABASE_URL` in, and generates `SESSION_SECRET` and `SEED_SECRET`. A
workspace can have only one free Postgres database. A free service sleeps after 15 minutes
without traffic and takes about a minute to wake.

## Layout

| Path | What it is |
| --- | --- |
| `packages/shared/` | `@daily-delve/shared`: the game engine and the API types |
| `apps/` | The server and client (added by the P0 scaffold tasks) |
| `Docs/` | Proposal, slides, and game design document |
| `prototypes/dungeon-puzzle/` | The earlier grid-dungeon prototype, kept as reference code. Nothing imports from it; see its [README](prototypes/dungeon-puzzle/README.md) to run it. |

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
```

## Layout

| Path | What it is |
| --- | --- |
| `packages/shared/` | `@daily-delve/shared`: the game engine and the API types |
| `apps/` | The server and client (added by the P0 scaffold tasks) |
| `Docs/` | Proposal, slides, and game design document |
| `prototypes/dungeon-puzzle/` | The earlier grid-dungeon prototype, kept as reference code. Nothing imports from it; see its [README](prototypes/dungeon-puzzle/README.md) to run it. |

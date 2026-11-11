# Dungeon puzzle prototype (reference code)

This is the grid-dungeon prototype from the `antonio-dev` branch, kept as reference code.
It is not the game described in the root `TODO.md`, and **nothing imports from it**: it sits
outside the npm workspaces, and the root `lint`, `typecheck`, and `test` scripts ignore it.
Do not extend it. Read it, then write the real code in `packages/` and `apps/`.

It is reference for these tasks in `TODO.md`:

| Task | What to look at here |
| --- | --- |
| P2-A1 (dungeon generation) | `src/engine/generator.ts`, `src/engine/tiles.ts`, `src/engine/rng.ts` |
| P2-C1 (dungeon screen) | `src/client/render.ts`, `src/client/sprites.ts`, `src/client/main.ts` |
| P2-C2 | `src/client/` screens, input handling, and `style.css` |
| O6 (field cards, tile hazards, roaming enemies, solver bot) | `src/engine/cards.ts`, `enemies.ts`, `engine.ts`, `solver.ts` |

The prototype's rules differ from the MVP rules in R3 of `TODO.md` (it has no card combat,
and it has field cards with charges, hazards, and moving enemies). Where they differ, R3 wins.

## Run it

The prototype has its own `package.json`. Run every command from this folder, not the repo
root. It needs Node 22.18 or newer (the tests and scripts run TypeScript directly).

```bash
cd prototypes/dungeon-puzzle
npm install
npm run dev        # play at http://localhost:5173  (add ?map=7 to open dungeon #8)
npm test           # engine and map book tests
npm run typecheck
npm run build      # typecheck, then a production build into dist/
```

Controls: `WASD` or arrows move or attack, `1` to `4` ready a card then press a direction,
`Space` waits, `Esc` cancels. Hover the map to inspect anything.

## Layout

| Path | What it is |
| --- | --- |
| `src/engine/` | The prototype engine. Pure TypeScript, no DOM, no dependencies. |
| `src/engine/engine.ts` | The rules: `step(state, action) -> state`. Deterministic, never mutates. |
| `src/engine/cards.ts`, `enemies.ts`, `tiles.ts` | Content as plain data: 30 cards, 13 enemies, the tile legend. |
| `src/engine/score.ts` | The score formula and its weights. |
| `src/engine/generator.ts` | Seeded dungeon generator and the bot gate that accepts or rejects a dungeon. |
| `src/engine/solver.ts` | The bot (weighted A\* over real engine states). |
| `src/data/maps.json` | The map book: 30 bot-verified dungeons with par and answer keys. |
| `src/client/` | The web client: canvas renderer, placeholder pixel sprites, screens, input. |
| `scripts/` | `npm run generate` rebuilds the map book, `npm run docs` rebuilds `Docs/Game Content.md`. |
| `tests/` | `node --test` suites for the rules and for every dungeon in the book. |
| `Docs/` | `Game Content.md` (generated: every card, enemy, obstacle, the score formula, the map list) and `Expansion Ideas.md`. |

## How the pieces fit

- A run is `map + 4 cards + a string of actions` (the replay code shown on the result
  screen). Replaying that string through `replay()` always gives the same result.
- The generator builds a 4x3 grid of rooms with two different routes from start to exit,
  locks each route with obstacles from a different element, then asks the bot which card
  sets can actually win. A dungeon only ships if cards are required, at least two
  different card sets win, and no single card is in every solution.
- The client only reads engine state.

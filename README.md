# Daily Delve (cse4095-team-2)

A daily 2D pixel dungeon puzzle. Everyone gets the same dungeon each day: pick 4 of the
9 cards on offer, then find a way to the stairs in as few moves and as little time as
you can. Monsters and obstacles can be beaten with the right card or avoided by another route.

## Run it

```bash
npm install
npm run dev        # play at http://localhost:5173  (add ?map=7 to open dungeon #8)
npm test           # engine + map book tests
npm run typecheck
```

Controls: `WASD`/arrows move or attack, `1`-`4` ready a card then press a direction,
`Space` waits, `Esc` cancels. Hover the map to inspect anything.

## Layout

| Path | What it is |
| --- | --- |
| `src/engine/` | The game engine. Pure TypeScript, no DOM, no dependencies. Runs the same in the browser, on a server and in the bot. |
| `src/engine/engine.ts` | The rules: `step(state, action) -> state`. Deterministic, never mutates. |
| `src/engine/cards.ts`, `enemies.ts`, `tiles.ts` | Content as plain data: 30 cards, 13 enemies, the tile legend. |
| `src/engine/score.ts` | The score formula and its weights. |
| `src/engine/generator.ts` | Seeded dungeon generator and the bot gate that accepts or rejects a dungeon. |
| `src/engine/solver.ts` | The bot (weighted A* over real engine states). |
| `src/data/maps.json` | The map book: 30 bot-verified dungeons with par and answer keys. |
| `src/client/` | The web client: canvas renderer, placeholder pixel sprites, screens, input. |
| `scripts/` | `npm run generate` rebuilds the map book, `npm run docs` rebuilds `Docs/Game Content.md`. |
| `tests/` | `node --test` suites for the rules and for every dungeon in the book. |
| `Docs/` | Design documents, generated content reference, expansion ideas. |

## How the pieces fit

- A run is `map + 4 cards + a string of actions` (the replay code shown on the result
  screen). Replaying that string through `replay()` always gives the same result, which
  is what lets a server verify scores later.
- The generator builds a 4x3 grid of rooms with two different routes from start to exit,
  locks each route with obstacles from a different element, then asks the bot which card
  sets can actually win. A dungeon only ships if cards are required, at least two
  different card sets win, and no single card is in every solution.
- The client only reads engine state. To restyle the game, edit `src/client/style.css`,
  `render.ts` (tiles) and `sprites.ts` (creatures and items).

See `Docs/Game Content.md` for every card, enemy, obstacle, the score formula and the
map list, and `Docs/Expansion Ideas.md` for where to take it next.

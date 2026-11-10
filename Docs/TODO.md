# Daily Delve — TODO

The team's single task list. It is updated in the same commit as the work it describes.
Scope comes from the project proposal (four core features). Where the proposal, slides, and
game design document disagree, this file already encodes the decision: follow this file.

Demo: **Monday, December 7, 2026**. MVP complete: **Monday, November 30**.

---

## Status

Edit only your own line. Keep the blank lines between entries.

**Phase:** P0 Foundations (due Thu Nov 12)

**A (engine and cards):** not started. Blocked by: nothing

**B (API, database, auth, verification):** not started. Blocked by: nothing

**C (map, combat, reward screens):** not started. Blocked by: nothing

**D (leaderboard, profile, deploy, tests, docs):** not started. Blocked by: nothing

Progress is counted, not typed. Do not keep totals in this file. Run:

```
grep -c '^- \[x\] \*\*P' TODO.md     # MVP tasks done
grep -c '^- \[ \] \*\*P' TODO.md     # MVP tasks left
grep -c '^- \[ \] \*\*P2-' TODO.md   # left in one phase
```

## Roles

Filled in once by task P0-T1.

| Stream | Scope | Person | Default reviewer |
| --- | --- | --- | --- |
| A | Shared engine, card and enemy data, engine tests | ____ | B |
| B | REST API, database, auth, run verification | ____ | A |
| C | Game screens: map, combat, reward, shrine, summary | ____ | D |
| D | Auth, leaderboard and profile screens, deploy, CI, end-to-end tests, docs | ____ | C |

## How to update this file

1. **Starting a task:** write your name in its `Owner:` slot in the first commit on your branch, and open a draft pull request so the claim is visible.
2. **Finishing a task:** change `[ ]` to `[x]` in the same commit or pull request that makes its "Done when" line true. Never check a box in a separate later commit.
3. **Touch only your own lines:** your task's lines and your stream's Status line. Do not reorder, renumber, re-wrap, or reformat anything else. TODO.md is in `.prettierignore` for this reason.
4. **Keep the blank line between tasks.** Git merges two people's edits cleanly only when an unchanged line sits between them.
5. **Adding a task:** append it to the end of your stream's list in that phase, with the next number. IDs are never reused or renumbered.
6. **Dropping a task:** do not delete it. Check it and put `DROPPED:` and the reason at the start of its title.
7. **Blocked:** write the blocking task ID on your Status line.
8. **Conflict in this file:** rebase on `main`, keep both sides' edits, and a checked box always wins.
9. **Phase line:** changed only by whoever checks that phase's exit task.

## Rules for every task

- One task is one branch and one small pull request. Branch `p1-a3-play-card`, pull request title starting `P1-A3`.
- Another teammate reviews every pull request (default reviewers above; anyone may review if the default has not responded in 12 hours).
- All code, AI-written or not, ships with tests in the same pull request, and CI is green before merge.
- Merge to `main` at least once per working day. Rebase before merging.
- The Reference section at the bottom (R1 to R7) is the spec. A task that needs to change a type, endpoint, or table in it must change the Reference in the same pull request, be labeled `contract-change`, and be approved by every stream that uses the changed part.
- Code under `packages/shared/src/engine` follows the determinism rules in R2 with no exceptions.
- Any change to engine behavior or content bumps `ENGINE_VERSION` and regenerates the replay fixtures in the same pull request.

### Handing a task to a coding agent

Give the agent this prompt, with the ID filled in:

> Do task `<ID>` from TODO.md. First read "Rules for every task" and the Reference sections
> the task mentions, plus R1 and R7. Change only the files the task needs. Write the tests the
> "Done when" line requires. If the task cannot be done without changing a type, endpoint, or
> table in the Reference, stop and report instead of changing it. When finished, check the
> task's box in TODO.md in the same commit.

## Phases

| Phase | Dates | Ends with this running |
| --- | --- | --- |
| P0 Foundations | Tue Nov 10 to Thu Nov 12 | One command starts client and server; browser and server print the same seeded numbers; CI green |
| P1 Walking skeleton, deployed | Fri Nov 13 to Mon Nov 16 | Public URL: register, log in, play one fixed fight |
| P2 Full run, verified | Tue Nov 17 to Mon Nov 23 | Public URL: play today's dungeon start to finish, submit, server verifies it |
| P3 MVP complete | Tue Nov 24 to Mon Nov 30 | All four core features and all four data operations on the public URL |
| P4 Harden and demo | Tue Dec 1 to Mon Dec 7 | Rehearsed demo. Feature freeze Dec 1, balance freeze Dec 3, code freeze Dec 4 |

---

# MVP TASKS

Everything from here to the "OPTIONAL TASKS" marker is required for the demo.

## P0 Foundations (Tue Nov 10 to Thu Nov 12)

### P0 Team

- [ ] **P0-T1 · Assign roles** — Owner: ____ — Needs: none
  - Do: Agree who takes streams A to D and fill in the Person column of the Roles table.
  - Done when: The Roles table on `main` has four names.

- [ ] **P0-T2 · Confirm the flagged rule decisions** — Owner: ____ — Needs: none
  - Do: Read the seven lines marked `DECISION` in R3. For each, either keep it or edit it, then replace `DECISION` with `CONFIRMED`.
  - Done when: No line in R3 contains the word `DECISION`, in a pull request approved by all four members.

- [ ] **P0-T3 · Phase 0 exit check** — Owner: ____ — Needs: P0-D4
  - Do: On a fresh clone run `npm install`, `npm test`, `npm run dev`. Update the Phase line in Status to P1.
  - Done when: The home page shows five seeded numbers from the browser equal to the five from `/api/health`, and CI is green on `main`.

### P0 Stream A

- [ ] **P0-A1 · Shared package scaffold and engine lint rule** — Owner: ____ — Needs: P0-D1
  - Do: Create `packages/shared` as `@daily-delve/shared` per R1 (source-only `exports`, Vitest, folders `src/engine` and `src/api`). Add an ESLint override for `src/engine/**` enforcing R2 rules 1 and 2.
  - Done when: A file in `src/engine` that calls `Math.random()` or `Date.now()`, or imports from outside `src/engine`, fails `npm run lint`; a trivial test passes.

- [ ] **P0-A2 · Seeded random generator** — Owner: ____ — Needs: P0-A1
  - Do: Write `src/engine/rng.ts` per R2 rule 4: `createRng(seed, stream)`, `nextU32`, `nextInt(rng, n)`, `shuffle(rng, array)`, `pick`. Integer math only.
  - Done when: Tests assert a committed table of outputs for three seed and stream pairs, show that drawing from one stream never changes another, and check `nextInt` stays in range.

- [ ] **P0-A3 · Engine types and stubbed public functions** — Owner: ____ — Needs: P0-A1
  - Do: Write `src/engine/types.ts` with every type in R4 and export every function in R4 from the package index. Functions throw `not implemented` for now. `ENGINE_VERSION = '0.1.0'`.
  - Done when: A test file imports every name listed in R4 from `@daily-delve/shared` and `npm run typecheck` passes.

- [ ] **P0-A4 · Balance constants file** — Owner: ____ — Needs: P0-A3
  - Do: Write `src/engine/content/balance.ts` exporting every constant in the R3 table with the listed default.
  - Done when: A test asserts every exported constant is an integer or boolean and matches the R3 table names.

### P0 Stream B

- [ ] **P0-B1 · Server scaffold** — Owner: ____ — Needs: P0-D1
  - Do: Create `apps/server` per R1: `createApp({ db, now })` in `src/app.ts`, entry `src/index.ts`, `GET /api/health` returning `{ ok: true }`, a 404 handler and error middleware in the R5 error format, Vitest and supertest, `dev` script using `tsx watch`.
  - Done when: Tests show `GET /api/health` returns 200 and an unknown `/api` route returns 404 in the R5 error format.

- [ ] **P0-B2 · Database connection and first migration** — Owner: ____ — Needs: P0-B1
  - Do: Add Knex in `src/db/knex.ts`: Postgres when `DATABASE_URL` is set, otherwise SQLite at `apps/server/data/dev.sqlite3` (gitignored), `:memory:` in tests, with `PRAGMA foreign_keys = ON` for SQLite. Write migration `001_init` creating the R6 tables. Run migrations on startup.
  - Done when: A test migrates an in-memory database, writes and reads one row per table, and shows a run with an unknown `user_id` is refused.

- [ ] **P0-B3 · API contract as shared types** — Owner: ____ — Needs: P0-A1
  - Do: Write `packages/shared/src/api/types.ts` with every request, response, and error type in R5 plus an `ERROR_CODES` constant, exported from the package index.
  - Done when: Types compile and a reviewer from stream D confirms the names match R5 one to one.

- [ ] **P0-B4 · Validation and error helpers** — Owner: ____ — Needs: P0-B1
  - Do: Add zod. Write `src/middleware/validate.ts` (schema failure gives 400 `VALIDATION` naming the field), an `ApiError` class, and an async route wrapper.
  - Done when: A test route given a bad body returns 400 in the R5 error format with the bad field named in `details`.

### P0 Stream C

- [ ] **P0-C1 · Client scaffold** — Owner: ____ — Needs: P0-D1
  - Do: Create `apps/client` per R1 with Vite, React, TypeScript, and react-router. Placeholder screens at `/`, `/login`, `/register`, `/play`, `/leaderboard`, `/profile`. Proxy `/api` to `http://localhost:3000`. Add Vitest, Testing Library, and jsdom.
  - Done when: `npm run dev -w apps/client` serves all six routes and one render test passes.

- [ ] **P0-C2 · Screen plan** — Owner: ____ — Needs: none
  - Do: Write `docs/screens.md`. For each screen (login and register, today's dungeon, combat, reward and deck, shrine, run summary, leaderboard, profile) give its route, the R4 state fields or R5 endpoints it reads, the actions it dispatches, and a text wireframe.
  - Done when: Every screen lists exact R4 field names or R5 endpoints, and stream D has approved the pull request.

- [ ] **P0-C3 · Design tokens and Card component** — Owner: ____ — Needs: P0-C1, P0-A3
  - Do: Write `src/styles/tokens.css` (Fire orange, Frost cyan, Poison green, spacing, type sizes) and `src/components/Card.tsx`, which draws a `CardDef` (name, cost, type, tags, text) with SVG and CSS only.
  - Done when: A component test renders one sample card per tag and finds its name, cost, text, and tag color class.

### P0 Stream D

- [ ] **P0-D1 · Root workspace** — Owner: ____ — Needs: none
  - Do: Add root `package.json` (private, workspaces `packages/*` and `apps/*`), `tsconfig.base.json` (strict), `.nvmrc` (current Node LTS), `.gitignore`, `.editorconfig`, ESLint and Prettier configs, and `.prettierignore` containing `TODO.md`. Root scripts `lint`, `typecheck`, `test`, `build` run across workspaces. Leave the existing proposal, slides, and design document files where they are.
  - Done when: On a fresh clone `npm install && npm run lint && npm run typecheck && npm test` exits 0.

- [ ] **P0-D2 · Continuous integration** — Owner: ____ — Needs: P0-D1
  - Do: Add `.github/workflows/ci.yml` running `npm ci`, lint, typecheck, and test on every pull request and on pushes to `main`.
  - Done when: A pull request shows the check, and a deliberately failing test turns it red (shown in the pull request, then removed).

- [ ] **P0-D3 · Pull request template, agent instructions, branch protection** — Owner: ____ — Needs: P0-D1
  - Do: Add `.github/pull_request_template.md` (task ID, tests added, TODO.md updated, engine version and fixtures if engine changed). Add `CLAUDE.md` and `AGENTS.md` that point agents to "Rules for every task" and R1, R2, R7 in this file. Protect `main`: one approval and green CI required.
  - Done when: A direct push to `main` is rejected, and a new pull request shows the template.

- [ ] **P0-D4 · One-command dev and first determinism check** — Owner: ____ — Needs: P0-A2, P0-A3, P0-B1, P0-C1
  - Do: Root `npm run dev` starts server and client together. Extend `GET /api/health` to the full R5 shape (`engineVersion`, `rngCheck`). The client home page computes the same five numbers in the browser and shows both lists.
  - Done when: `npm run dev` shows both lists on the home page and a client test asserts they are equal.

## P1 Walking skeleton, deployed (Fri Nov 13 to Mon Nov 16)

### P1 Team

- [ ] **P1-T1 · Phase 1 exit check** — Owner: ____ — Needs: P1-C6, P1-D4, P1-D6
  - Do: On the public URL, register a new account, log in, and play the test fight to a win or a loss. Update the Phase line in Status to P2.
  - Done when: Two team members have each done this on the public URL in different browsers.

### P1 Stream A

- [ ] **P1-A1 · Number pipeline** — Owner: ____ — Needs: P0-A4
  - Do: Write `src/engine/calc.ts`: `computeDamage` applying additive changes, then multiplicative (integer percent, floored), then caps and a floor of 0; and `applyDamage(unit, amount, { ignoreShield })`, which removes Shield before HP.
  - Done when: Table-driven tests cover the order of operations (base 4, plus 3, times 150 percent gives 10), Shield absorption, `ignoreShield`, and never going below 0.

- [ ] **P1-A2 · Combat setup and drawing** — Owner: ____ — Needs: P0-A2, P0-A3, P0-A4
  - Do: Write `startCombat` in `src/engine/combat.ts`: build enemies from definitions, shuffle the deck with stream `shuffle:<nodeId>`, start turn 1 (draw `HAND_SIZE`, set energy, show intents). Drawing from an empty pile reshuffles the discard pile.
  - Done when: Tests show the same seed gives the same opening hand, a different node ID gives a different order, an empty draw pile reshuffles, and turn 1 has 5 cards and 3 energy.

- [ ] **P1-A3 · Play a card** — Owner: ____ — Needs: P1-A1, P1-A2
  - Do: Implement the `playCard` action with effect kinds `damage`, `shield`, `draw`, `energy`: check the hand index, cost, and target; pay energy; resolve effects in listed order; discard the card. The fight is won the moment the last enemy reaches 0 HP.
  - Done when: Tests cover each effect, and each illegal case (bad index, too costly, dead or missing target) returns `ok: false` with code `ILLEGAL_ACTION` and an unchanged state.

- [ ] **P1-A4 · End turn and enemy phase** — Owner: ____ — Needs: P1-A3
  - Do: Implement `endTurn` in the R3 order: enemies act in index order on their shown intents, the hand is discarded, statuses tick, Shield expires per R3, intents advance, the next turn starts. Player death ends the run as lost. Reaching `FIGHT_TURN_CAP` ends the run as lost.
  - Done when: A scripted three-turn fight matches expected HP and Shield after every turn, and tests cover death and the turn cap.

- [ ] **P1-A5 · Burn, Chill, Poison, and Shatter** — Owner: ____ — Needs: P1-A4
  - Do: Implement effect kinds `applyStatus` and `shatter` and the tick rules in R3, for enemies and for the player, capped at `STATUS_CAP`.
  - Done when: Tests cover each status's tick and decay, Chill lowering attack damage, Shatter removing Chill and dealing damage per stack, and the cap.

- [ ] **P1-A6 · Tag synergy and Exhaust** — Owner: ____ — Needs: P1-A5
  - Do: Track `tagsPlayedThisTurn` (reset each turn; a card does not count itself). Apply `perTagPlayed` as an additive bonus through `computeDamage`. Cards with `exhaust` go to the exhaust pile. Increment `stats.comboTriggers` per R3.
  - Done when: Tests show the second Fire card with "+3 per Fire card played" deals base plus 3 while the first deals base, an exhausted card never returns in a reshuffle, and `comboTriggers` counts both trigger kinds.

- [ ] **P1-A7 · First ten cards, two enemies, test fight** — Owner: ____ — Needs: P1-A6
  - Do: Write `content/cards.ts` with 10 cards (for each tag: a basic attack, a status applier, and a skill; plus one tag-synergy attack) and `STARTER_DECK`. Write `content/enemies.ts` with 2 normal enemies using three-step intent cycles. Export `createTestFight(seed)`, a run already in combat against one enemy.
  - Done when: A content test checks every card (cost 0 to 3, at least one tag, known effect kinds, non-empty text), and a scripted test wins the test fight with legal actions only.

- [ ] **P1-A8 · Legal actions in combat and purity test** — Owner: ____ — Needs: P1-A7, P1-B7
  - Do: Implement `legalActions` for the combat phase (each playable card with each valid target, plus `endTurn`). Add a property test that random-walks the test fight for 50 seeds with deep-frozen input states.
  - Done when: The test passes in under 5 seconds, no input state is mutated, and replaying the recorded actions gives the same `hashState`.

### P1 Stream B

- [ ] **P1-B1 · Sessions** — Owner: ____ — Needs: P0-B2
  - Do: Add `express-session` with a Knex-backed store (table `sessions`). Cookie `dd.sid`: httpOnly, SameSite Lax, Secure in production, 7 days. Set `trust proxy` in production. Write `requireAuth`, which returns 401 `UNAUTHENTICATED`.
  - Done when: Tests show a protected route returns 401 without a cookie and 200 with one, and the session still works after the app object is re-created on the same database.

- [ ] **P1-B2 · Register** — Owner: ____ — Needs: P1-B1, P0-B3, P0-B4
  - Do: Implement `POST /api/auth/register` per R5: validate, lowercase the username, hash with bcryptjs (cost from config, low in tests), default the display name to the username, start a session.
  - Done when: Tests cover success (201, cookie set, no password hash in the response), a taken username in different letter case (409), and each validation limit (400).

- [ ] **P1-B3 · Login and logout** — Owner: ____ — Needs: P1-B2
  - Do: Implement `POST /api/auth/login` and `POST /api/auth/logout` per R5. Wrong username and wrong password give the same 401 `INVALID_CREDENTIALS`.
  - Done when: Tests cover login success, both failure cases, and that a protected route returns 401 after logout.

- [ ] **P1-B4 · Current user** — Owner: ____ — Needs: P1-B3
  - Do: Implement `GET /api/me` per R5.
  - Done when: Tests show 200 with the user when logged in and 401 when not.

- [ ] **P1-B5 · Security middleware** — Owner: ____ — Needs: P0-B1
  - Do: Add helmet, a 100 KB JSON body limit, and a rate limit of 10 requests a minute per address on `/api/auth/*` (limit configurable so tests can set it).
  - Done when: Tests show the request over the limit returns 429 `RATE_LIMITED` and an oversized body returns an R5-format error.

- [ ] **P1-B6 · Daily dungeon endpoint** — Owner: ____ — Needs: P0-B2, P0-B3
  - Do: Write `getOrCreateDungeon(date)` and `GET /api/dungeons/today` per R5. Seed is the first 16 hex characters of HMAC-SHA256 of the date keyed by `SEED_SECRET`. The date comes from the injected `now()`. Insert-if-absent must be safe when two requests arrive together. `officialRun` is `null` until P2-B4.
  - Done when: Tests show two calls on one day return the same seed, advancing the clock a day returns a new date and seed, and parallel first requests create exactly one row.

- [ ] **P1-B7 · State hashing** — Owner: ____ — Needs: P0-A3
  - Do: In `packages/shared/src/engine/hash.ts` write `canonicalJson(value)` (keys sorted, no whitespace) and `hashState(state)` (a pure-TypeScript integer hash of the canonical JSON, returned as hex).
  - Done when: Tests show key order does not change the hash, changing one field does, and a committed sample object gives a committed hash.

### P1 Stream C

- [ ] **P1-C1 · Game store** — Owner: ____ — Needs: P0-A3, P0-C1
  - Do: Write `src/game/useGame.ts` holding `{ seed, actions, state }`. `dispatch(action)` calls `applyAction`; on success it appends the action and replaces the state; on failure it reports the error and changes nothing. The UI never computes game results itself.
  - Done when: Unit tests with an injected fake engine cover a successful action and an illegal one.

- [ ] **P1-C2 · Enemy component** — Owner: ____ — Needs: P0-C3
  - Do: Write `src/components/Enemy.tsx` showing name, HP bar, Shield, status badges, and the intent with its number. Add a hand-written `CombatState` fixture at `src/game/fixtures/combat.json` matching R4.
  - Done when: A component test finds HP, the text "Attack 6", and each status badge from the fixture.

- [ ] **P1-C3 · Player panel** — Owner: ____ — Needs: P0-C3
  - Do: Write `src/components/PlayerPanel.tsx` showing HP, Shield, statuses, energy, draw, discard, and exhaust pile counts, and an End Turn button that dispatches `{ type: 'endTurn' }`.
  - Done when: A component test finds every value from the fixture and sees the dispatch on click.

- [ ] **P1-C4 · Hand and card play** — Owner: ____ — Needs: P0-C3, P1-C1
  - Do: Write `src/components/Hand.tsx`. Cards that cost more than current energy are disabled. Clicking a card selects it; a card that needs a target is played by then clicking an enemy; other cards play at once.
  - Done when: Component tests cover a targeted play, an untargeted play, and a disabled card that dispatches nothing.

- [ ] **P1-C5 · Combat screen** — Owner: ____ — Needs: P1-A7, P1-C2, P1-C3, P1-C4
  - Do: Assemble the combat screen at `/play/test-fight` on the real engine using `createTestFight`.
  - Done when: A fight can be played to its end with the mouse alone, and a test plays one card and sees the enemy's HP fall.

- [ ] **P1-C6 · Fight end overlay** — Owner: ____ — Needs: P1-C5
  - Do: Show Victory or Defeat when the test fight ends, with a button that restarts it on a new seed.
  - Done when: A test drives a fixture state to each outcome and finds the matching overlay.

### P1 Stream D

- [ ] **P1-D1 · Typed API client** — Owner: ____ — Needs: P0-B3, P0-C1
  - Do: Write `apps/client/src/api/client.ts` with one function per R5 endpoint, typed with the shared types, sending cookies, and throwing `ApiClientError { status, code, message, details }` on failure.
  - Done when: Unit tests with a mocked `fetch` cover a success and a failure for three endpoints, and every R5 endpoint has a function.

- [ ] **P1-D2 · Mock API** — Owner: ____ — Needs: P1-D1
  - Do: Add MSW handlers for every R5 endpoint backed by in-memory data, switched on in dev by `VITE_USE_MOCKS=1` and used in component tests.
  - Done when: With the server stopped and mocks on, register, login, and leaderboard calls from the client succeed.

- [ ] **P1-D3 · Login and register screens** — Owner: ____ — Needs: P1-D1, P1-D2
  - Do: Add an auth context and the `/login` and `/register` forms with the R5 limits checked in the browser and server errors shown. On success go to `/`.
  - Done when: Component tests cover a successful register, a taken username, and a failed login.

- [ ] **P1-D4 · App shell and protected routes** — Owner: ____ — Needs: P1-D3
  - Do: Add navigation (Today, Leaderboard, Profile, Log out, display name). Restore the session with `GET /api/me` on load. Send logged-out visitors of `/play` and `/profile` to `/login`.
  - Done when: Tests cover the redirect and a restored session after reload.

- [ ] **P1-D5 · One-process production build** — Owner: ____ — Needs: P0-B1, P0-C1
  - Do: Make Express serve `apps/client/dist` and return `index.html` for any non-`/api` path. Root `npm run build` builds the client. Root `npm start` runs migrations, then the server with `tsx`.
  - Done when: `npm run build && npm start` serves the app and the API from one port locally.

- [ ] **P1-D6 · Deploy to Render** — Owner: ____ — Needs: P1-D5, P0-B2
  - Do: Add `render.yaml`: one free web service, one free Postgres, `DATABASE_URL` wired in, generated `SESSION_SECRET` and `SEED_SECRET`, health check `/api/health`, deploy from `main` after CI passes. Create the database on or after Nov 13 (free Render Postgres expires 30 days after creation). Put the URL and the expiry date in the README.
  - Done when: The public URL serves the app, `/api/health` is OK, and a registered user still exists after a manual redeploy.

- [ ] **P1-D7 · Postgres job in CI** — Owner: ____ — Needs: P0-B2, P0-D2
  - Do: Add a second CI job that runs the `apps/server` tests against a Postgres service container with `DATABASE_URL` set.
  - Done when: The SQLite job and the Postgres job are both green on `main`.

## P2 Full run, verified (Tue Nov 17 to Mon Nov 23)

### P2 Team

- [ ] **P2-T1 · Phase 2 exit check** — Owner: ____ — Needs: P2-C9, P2-B7, P2-D3
  - Do: On the public URL play today's dungeon from the first node to the boss or to death, submit, and see it verified. Show the tamper tests passing. Update the Phase line in Status to P3.
  - Done when: Two members have each submitted a verified run on the public URL, and the cross-browser determinism job is green.

### P2 Stream A

- [ ] **P2-A1 · Map generation** — Owner: ____ — Needs: P0-A2, P0-A4
  - Do: Write `generateMap(seed)` in `src/engine/map.ts` using stream `map` and the R3 map rules: `MAP_FLOORS` floors of 2 or 3 nodes, a single boss node on the floor after, each node linked to 1 or 2 nodes on the next floor, node IDs `f<floor>n<index>`.
  - Done when: Tests over 500 seeds assert every R3 map rule, and the same seed gives a deep-equal map.

- [ ] **P2-A2 · Dungeon generation** — Owner: ____ — Needs: P2-A1, P1-A7
  - Do: Write `generateDungeon(seed)`: the map, an encounter for every fight, elite, and boss node from stream `encounters:<nodeId>`, and three distinct reward cards for every fight and elite node from stream `rewards:<nodeId>` (elite offers include at least one rare).
  - Done when: Tests show the same seed gives a deep-equal dungeon, every referenced ID exists in content, elite offers include a rare, and two seeds differ.

- [ ] **P2-A3 · Start a run and choose a node** — Owner: ____ — Needs: P2-A2
  - Do: Implement `createRun(seed)` (phase `map`, starter deck, full HP, dungeon inside the state) and the `chooseNode` action: legal for floor 1 nodes at the start, afterwards only for nodes linked from the current position. Fight, elite, and boss nodes start combat; shrine nodes set phase `shrine`.
  - Done when: Tests cover legal and illegal choices and each phase change.

- [ ] **P2-A4 · Fight rewards** — Owner: ____ — Needs: P2-A3
  - Do: On a fight win add 1 to `nodesCleared` and enter phase `reward` with that node's offers; a boss win ends the run as won. Implement `pickReward` (an offer index adds the card, `null` skips), then return to phase `map`. HP carries over; Shield and statuses do not.
  - Done when: Tests cover pick, skip, an out-of-range index, HP carry-over, and the boss ending the run.

- [ ] **P2-A5 · Shrine** — Owner: ____ — Needs: P2-A3
  - Do: Implement the `shrine` action per R3: `heal`, or `remove` with a deck index (refused at `MIN_DECK_SIZE`). Then add 1 to `nodesCleared` and return to phase `map`.
  - Done when: Tests cover the heal amount and its cap at max HP, a removal, and the refused removal.

- [ ] **P2-A6 · Run result and score** — Owner: ____ — Needs: P2-A4
  - Do: Implement `summarize(state)` returning `RunResult`, with the R3 score formula read from `balance.ts`. `stats.turns` counts player turns started across all fights.
  - Done when: Tests check the score for a hand-built won state and a lost state against values worked out by hand in the test.

- [ ] **P2-A7 · Simulate and full legal actions** — Owner: ____ — Needs: P2-A5, P2-A6
  - Do: Implement `simulate(seed, actions)`: create the run and apply each action, returning the final state and result, or `ok: false` with `atIndex` on the first illegal action or when over `MAX_ACTIONS`. Extend `legalActions` to the map, reward, and shrine phases.
  - Done when: Tests cover a full scripted run, an illegal action at a known index, the action limit, and `legalActions` in every phase.

- [ ] **P2-A8 · Content to twenty cards and six enemies** — Owner: ____ — Needs: P1-A7
  - Do: Grow `cards.ts` to 20 cards and `enemies.ts` to 6 normal enemies, 1 placeholder elite, and 1 placeholder boss, so full runs are possible.
  - Done when: The content test passes and `generateDungeon` works for 100 seeds using only existing IDs.

- [ ] **P2-A9 · Golden replay test** — Owner: ____ — Needs: P2-A7, P2-B6
  - Do: Write `packages/shared/test/golden.test.ts`: load every file in `fixtures/replays/`, run `simulate`, and compare the result and `hashState` with the stored values.
  - Done when: The test passes with at least 20 fixtures, and the pull request shows it failing when one card number is changed.

- [ ] **P2-A10 · Full-run property test** — Owner: ____ — Needs: P2-A7
  - Do: Random-walk complete runs for 200 seeds with deep-frozen states.
  - Done when: Every run ends within `MAX_ACTIONS`, nothing throws, no input is mutated, and replaying each run's actions gives the same hash.

### P2 Stream B

- [ ] **P2-B1 · Run payload schema** — Owner: ____ — Needs: P0-B3, P0-B4
  - Do: Write the zod schema for the `POST /api/runs` body per R5: at most `MAX_ACTIONS` actions, each one of the R4 action shapes with integer fields, unknown keys refused.
  - Done when: Tests show a valid payload passes and six malformed variants each return 400 `VALIDATION`.

- [ ] **P2-B2 · Verification service** — Owner: ____ — Needs: P2-A7
  - Do: Write `src/services/verify.ts`: `verifyRun({ seed, actions, claimed })` runs `simulate` and returns verified with the server's result, or a reason of `ILLEGAL_ACTION` (with `atIndex`), `RUN_INCOMPLETE`, or `RESULT_MISMATCH`. No database access.
  - Done when: Unit tests cover each of the four outcomes.

- [ ] **P2-B3 · Submit a run** — Owner: ____ — Needs: P2-B1, P2-B2, P1-B6, P1-B4
  - Do: Implement `POST /api/runs` per R5: require login, check the engine version, apply the R5 date rule, load the seed by date from the database (never from the client), insert the run unverified, verify it, then update the row with the server's result and `verified = true`, or with `reject_reason`.
  - Done when: Tests cover 201 for a valid run with server-computed values stored, 422 `RUN_REJECTED` with the row kept unverified, 409 for a wrong engine version, and 409 `DATE_CLOSED`.

- [ ] **P2-B4 · One official attempt a day** — Owner: ____ — Needs: P2-B3
  - Do: On a verified official run set `official_slot` to `<userId>:<date>` (unique column). A second official submission returns 409 `OFFICIAL_ALREADY_SUBMITTED` and stores nothing. Rejected runs leave the slot empty. `GET /api/dungeons/today` now returns `officialRun`.
  - Done when: Tests cover the second attempt, a rejected run not using up the attempt, and two simultaneous official submissions giving exactly one 201.

- [ ] **P2-B5 · Run history endpoint** — Owner: ____ — Needs: P2-B3
  - Do: Implement `GET /api/me/runs` per R5, newest first, with `limit` and `offset`.
  - Done when: Tests cover ordering, paging, `total`, and that another user's runs never appear.

- [ ] **P2-B6 · Bot and fixture generator** — Owner: ____ — Needs: P2-A7
  - Do: Write `packages/shared/scripts/bot.ts` with `playRun(seed, policy)` for policies `random` and `greedy`, using its own `createRng(seed, 'bot')`. Add `npm run fixtures:generate -w packages/shared` (writes replay fixtures as `{ engineVersion, seed, actions, expected: { hash, result } }`) and `npm run bot:stats` (win rate and average nodes cleared over 200 seeds).
  - Done when: Generating twice gives byte-identical files, at least 20 fixtures are committed, and `bot:stats` prints both numbers for both policies.

- [ ] **P2-B7 · Tamper tests** — Owner: ____ — Needs: P2-B3, P2-B6
  - Do: From a valid bot run, test these changes through the API: alter one action, drop the last action, append an action, raise the claimed score, claim more nodes, submit against another date.
  - Done when: Each case returns the R5 error it should, and none leaves a row with `verified = true`.

- [ ] **P2-B8 · Golden fixtures through the API** — Owner: ____ — Needs: P2-B3, P2-B6
  - Do: Add an integration test that posts every golden fixture to `POST /api/runs`, with the dungeon row seeded from the fixture.
  - Done when: Every fixture is verified and the stored result equals the fixture's expected result, on SQLite and on Postgres.

### P2 Stream C

- [ ] **P2-C1 · Map screen** — Owner: ____ — Needs: P0-A3, P0-C3
  - Do: Write `src/screens/MapScreen.tsx` drawing `state.dungeon.nodes` as an SVG graph: floors from bottom to top, lines for links, an icon per node type, the current position, and the path taken. Build it against a hand-written dungeon fixture.
  - Done when: A component test finds every fixture node with its type and marks the current position.

- [ ] **P2-C2 · Choosing a node** — Owner: ____ — Needs: P2-C1, P2-A3
  - Do: Highlight the nodes that `legalActions` allows and dispatch `chooseNode` on click. Other nodes do nothing.
  - Done when: Tests show a legal node dispatches and an illegal node does not.

- [ ] **P2-C3 · Run flow by phase** — Owner: ____ — Needs: P1-C5, P2-C1
  - Do: Make `/play` render by `state.phase`: `map`, `combat`, `reward`, `shrine`, `ended`. No manual navigation between them.
  - Done when: A test feeds a state in each phase and finds the matching screen.

- [ ] **P2-C4 · Reward screen** — Owner: ____ — Needs: P2-C3, P2-A4
  - Do: Show the three offered cards and a Skip button; dispatch `pickReward`.
  - Done when: Tests cover a pick and a skip.

- [ ] **P2-C5 · Deck viewer** — Owner: ____ — Needs: P0-C3
  - Do: Add a modal listing the current deck, grouped by card with counts, opened from the map, combat, and reward screens.
  - Done when: A test opens it on a fixture deck and finds each card and count.

- [ ] **P2-C6 · Shrine screen** — Owner: ____ — Needs: P2-C3, P2-A5
  - Do: Offer Heal (showing the amount) or Remove a card (choose from the deck); dispatch `shrine`. Disable Remove at the minimum deck size.
  - Done when: Tests cover both choices and the disabled case.

- [ ] **P2-C7 · Save and resume** — Owner: ____ — Needs: P2-A7, P1-C1
  - Do: After every action save `{ date, mode, engineVersion, seed, actions }` to localStorage key `dd.run.v1`. On load rebuild the state with `simulate`. Discard the save when the engine version or date differs.
  - Done when: A test reloads mid-fight and gets the same `hashState`, and a stale-version save is discarded.

- [ ] **P2-C8 · Today screen** — Owner: ____ — Needs: P1-D1, P2-C3
  - Do: At `/` load `GET /api/dungeons/today`. Show the date, a map preview, and buttons for Official run and Practice run. When `officialRun` exists show its result instead of the official button. Starting creates the run from the returned seed.
  - Done when: Tests on mocks cover the states before and after an official run.

- [ ] **P2-C9 · Run summary and submit** — Owner: ____ — Needs: P2-C7, P1-D1
  - Do: When the run ends show outcome, floor reached, score, and turns, and send `POST /api/runs` exactly once. Show Verified, Rejected with the reason, or Already submitted. Clear the save on success; keep it on a network failure.
  - Done when: Tests on mocks cover the four response states and show a double click sends one request.

### P2 Stream D

- [ ] **P2-D1 · End-to-end test setup** — Owner: ____ — Needs: P1-D5, P1-D3
  - Do: Add Playwright in `e2e/` at the repo root, starting the built app on a temporary SQLite file, with Chromium, Firefox, and WebKit projects and a CI job. First test: register and land on the Today screen.
  - Done when: The test passes in all three browsers in CI.

- [ ] **P2-D2 · Self-check page** — Owner: ____ — Needs: P2-A9
  - Do: Add `/selfcheck` to the client. It runs the generator's known-answer table and every golden fixture in the browser, lists pass or fail with hashes, and sets `window.__selfcheck` to the results.
  - Done when: Opening the page in a production build shows every fixture passing.

- [ ] **P2-D3 · Cross-browser determinism test** — Owner: ____ — Needs: P2-D1, P2-D2
  - Do: Add a Playwright test that opens `/selfcheck` in all three browsers and compares each hash with the expected hash in the fixture files that the Node tests use.
  - Done when: The CI job is green and fails when one expected hash in a fixture file is edited (shown in the pull request).

- [ ] **P2-D4 · Leaderboard screen on mocks** — Owner: ____ — Needs: P1-D2
  - Do: Write `/leaderboard`: rank, name, floor reached ("Floor 5" or "Cleared"), score, turns, and time; my row highlighted; my row pinned when off the page; an empty state; paging.
  - Done when: Component tests cover a full page, the empty state, and the pinned row.

- [ ] **P2-D5 · Profile screen on mocks** — Owner: ____ — Needs: P1-D2
  - Do: Write `/profile`: username, display name, join date, and a run history table (date, official or practice, result, score, verified).
  - Done when: Component tests cover a history with runs and an empty history.

- [ ] **P2-D6 · End-to-end submit test** — Owner: ____ — Needs: P2-C9, P2-B6, P2-B3, P2-D1
  - Do: In a Playwright test get today's seed from the API, play a full run in Node with `playRun(seed, 'greedy')`, write it to `dd.run.v1`, open `/play`, and submit from the summary screen.
  - Done when: The page shows Verified in all three browsers.

## P3 MVP complete (Tue Nov 24 to Mon Nov 30)

### P3 Team

- [ ] **P3-T1 · MVP exit check** — Owner: ____ — Needs: every P0 to P3 task
  - Do: On the public URL show the four core features and the four data operations: register, play, submit, rank; view history; edit a display name; delete a practice run. Update the Phase line in Status to P4.
  - Done when: All four members have signed off in the pull request that checks this box, by Mon Nov 30.

### P3 Stream A

- [ ] **P3-A1 · Power cards in the engine** — Owner: ____ — Needs: P1-A6
  - Do: Implement effect kind `power` with the two R4 power kinds: `turnStart` (an effect at the start of each turn) and `damageBonus` (an additive bonus on cards with a tag). A played Power leaves the deck for the rest of the fight.
  - Done when: Tests cover each power kind, two copies stacking, and powers ending with the fight.

- [ ] **P3-A2 · Content to twenty-eight cards** — Owner: ____ — Needs: P3-A1, P2-A8
  - Do: Grow `cards.ts` to 28 cards per the R3 content table, with one Power per tag and at least two Shatter cards.
  - Done when: The content test asserts the R3 counts by tag, type, and rarity.

- [ ] **P3-A3 · Elites with traits** — Owner: ____ — Needs: P2-A8
  - Do: Add engine support for the three R4 traits (`immune`, `startShield`, `enrage`) and write 3 elite enemies, each using one.
  - Done when: Tests cover each trait, and dungeon generation places only elite-tier enemies on elite nodes.

- [ ] **P3-A4 · Boss** — Owner: ____ — Needs: P2-A8
  - Do: Write 1 boss with a `phase2` intent cycle that starts the first time its HP is at or below the listed percent.
  - Done when: Tests show the phase changes exactly once and that defeating the boss ends the run as won with `nodesCleared` at its maximum.

- [ ] **P3-A5 · Caps audit** — Owner: ____ — Needs: P3-A2
  - Do: Enforce `STATUS_CAP`, `SHIELD_CAP`, `MAX_HAND`, and `ENERGY_CAP` everywhere they apply.
  - Done when: A test with a deliberately degenerate deck never exceeds a cap and every fight ends by `FIGHT_TURN_CAP`.

- [ ] **P3-A6 · Balance pass** — Owner: ____ — Needs: P3-A2, P3-A3, P3-A4, P2-B6
  - Do: Change only numbers in `balance.ts` and the content files until `bot:stats` shows the greedy bot winning 15 to 50 percent of 200 seeds and the random bot under 5 percent.
  - Done when: The pull request shows `bot:stats` output before and after, inside both targets.

- [ ] **P3-A7 · Engine freeze 1.0.0** — Owner: ____ — Needs: P3-A5, P3-A6
  - Do: Set `ENGINE_VERSION = '1.0.0'`. Regenerate at least 30 fixtures including 5 wins and 5 deaths before floor 4. Write `docs/engine-rules.md` describing the final rules and the order of operations.
  - Done when: Golden, API, and cross-browser fixture tests are green on `main` by Mon Nov 30.

### P3 Stream B

- [ ] **P3-B1 · Leaderboard endpoint** — Owner: ____ — Needs: P2-B4
  - Do: Implement `GET /api/leaderboard` per R5: official and verified runs for the date (default today), in the R5 order, with `limit` up to 100, `offset`, `total`, and `me`. `POST /api/runs` now returns `rank` for official runs.
  - Done when: Tests cover the default date, paging, `me` for logged-in and logged-out callers, and an invalid date (400).

- [ ] **P3-B2 · Ranking order tests** — Owner: ____ — Needs: P3-B1
  - Do: Insert runs that differ at exactly one level each: nodes cleared, score, turns, submission time.
  - Done when: Tests prove each of the four levels decides the order, ranks run from 1 without gaps, and practice or unverified runs never appear, on SQLite and on Postgres.

- [ ] **P3-B3 · Edit display name** — Owner: ____ — Needs: P1-B4
  - Do: Implement `PATCH /api/me` for `displayName` per R5.
  - Done when: Tests cover the change, the R5 limits, and the new name appearing on the leaderboard.

- [ ] **P3-B4 · Change password** — Owner: ____ — Needs: P3-B3
  - Do: Extend `PATCH /api/me` for `currentPassword` and `newPassword`. Destroy the user's other sessions.
  - Done when: Tests cover a wrong current password (401), login with the new password, and the old password failing.

- [ ] **P3-B5 · Delete a run** — Owner: ____ — Needs: P2-B5
  - Do: Implement `DELETE /api/runs/:id` per R5: owner only (404 for anyone else); a verified official run returns 409 `CANNOT_DELETE_OFFICIAL`.
  - Done when: Tests cover a deleted practice run, the 409, and the 404.

- [ ] **P3-B6 · Delete an account** — Owner: ____ — Needs: P3-B4
  - Do: Implement `DELETE /api/me` per R5: check the password, then delete the user's runs, sessions, and user row in one transaction.
  - Done when: Tests show the user's leaderboard row is gone, login fails, and the username can be registered again, on SQLite and on Postgres.

- [ ] **P3-B7 · Demo data script** — Owner: ____ — Needs: P3-B1, P2-B6
  - Do: Add `npm run seed:demo -w apps/server -- --users 15`, which creates users named `demo-…` and submits bot-played official runs for today through the same service code as the API. It refuses to run in production without `--force`.
  - Done when: After running it locally the leaderboard shows 15 verified entries in a valid order.

- [ ] **P3-B8 · Rejected-run logging** — Owner: ____ — Needs: P2-B3
  - Do: Log every rejected run with its run ID, user ID, reason, and `atIndex`, and keep its actions in the row, so a determinism bug can be replayed.
  - Done when: A test sees the log entry and can re-run `simulate` from the stored row.

### P3 Stream C

- [ ] **P3-C1 · Official and practice modes** — Owner: ____ — Needs: P2-C8
  - Do: Show an Official or Practice badge for the whole run. Ask for confirmation before an official run starts. Remove the official option once today's official run is submitted.
  - Done when: Tests cover the confirmation, the badge, and the removed option.

- [ ] **P3-C2 · Combo highlighting** — Owner: ____ — Needs: P1-C4
  - Do: Make hand cards glow when their `perTagPlayed` tag has been played this turn, and show their current damage including the bonus.
  - Done when: A test with a fixture where a Fire card was played finds the glow and the raised number on the synergy card.

- [ ] **P3-C3 · Keyword tooltips** — Owner: ____ — Needs: P1-C2
  - Do: Add `src/game/glossary.ts` with one-sentence explanations of Burn, Chill, Poison, Shatter, Exhaust, and Shield, matching R3, shown on status badges and on card text.
  - Done when: A test finds the explanation for each of the six terms.

- [ ] **P3-C4 · Game error states** — Owner: ____ — Needs: P2-C9
  - Do: Handle a failed dungeon load (retry button), a failed submit (retry, save kept), and 409 `ENGINE_VERSION_MISMATCH` (tell the player to reload; discard the save).
  - Done when: Tests on mocks cover the three cases.

- [ ] **P3-C5 · Layout for the demo screen** — Owner: ____ — Needs: P2-C3
  - Do: Make the map and combat screens fit 1280×720 and 1920×1080 without scrolling, with a full hand of `MAX_HAND` cards.
  - Done when: Playwright screenshots at both sizes show no scrollbars, and they are attached to the pull request.

- [ ] **P3-C6 · Intent clarity** — Owner: ____ — Needs: P1-C2
  - Do: Show each enemy's intent as the total it will actually deal after strength and Chill, with hit count, and show the fight's turn number.
  - Done when: A test with a chilled, buffed fixture enemy finds the adjusted number.

- [ ] **P3-C7 · Game screen test sweep** — Owner: ____ — Needs: P2-C4, P2-C6, P2-C9
  - Do: Fill test gaps for the reward, shrine, summary, and map screens.
  - Done when: Each of the four screens has a test for its main action and for one refused or empty case.

### P3 Stream D

- [ ] **P3-D1 · Leaderboard on the live API** — Owner: ____ — Needs: P2-D4, P3-B1
  - Do: Switch `/leaderboard` from mocks to the API, refresh after a submit, and link to it from the summary screen.
  - Done when: After a local official submit the new row appears without a manual reload.

- [ ] **P3-D2 · Profile on the live API** — Owner: ____ — Needs: P2-D5, P2-B5, P3-B5
  - Do: Load history from `GET /api/me/runs` and add a delete button with confirmation on runs that can be deleted.
  - Done when: Tests cover a deleted practice run leaving the list and no delete button on a verified official run.

- [ ] **P3-D3 · Settings: display name and password** — Owner: ____ — Needs: P3-B3, P3-B4
  - Do: Add forms on `/profile` for the display name and for changing the password, showing server errors.
  - Done when: Tests cover both successes and a wrong current password.

- [ ] **P3-D4 · Delete account** — Owner: ____ — Needs: P3-B6
  - Do: Add a delete-account action that asks for the password and a typed confirmation, then logs out and goes to `/register`.
  - Done when: A test covers the full flow and a wrong password.

- [ ] **P3-D5 · End-to-end leaderboard test** — Owner: ____ — Needs: P3-D1, P2-D6
  - Do: Two users each submit a bot-played official run; check the leaderboard order against the R5 rule; check the second official attempt is blocked in the UI.
  - Done when: The test passes in all three browsers in CI.

- [ ] **P3-D6 · End-to-end data operations test** — Owner: ____ — Needs: P3-D2, P3-D3, P3-D4
  - Do: In one test edit a display name and see it on the leaderboard, delete a practice run, then delete the account and fail to log in.
  - Done when: The test passes in CI.

- [ ] **P3-D7 · README** — Owner: ____ — Needs: P1-D6
  - Do: Write the README: what the game is, local setup in three commands, how to test, environment variables, how deploys work, a Mermaid architecture diagram, and links to TODO.md and `docs/`.
  - Done when: A teammate from another stream follows it on a fresh clone and reaches a running app without asking a question.

- [ ] **P3-D8 · Production smoke test** — Owner: ____ — Needs: P1-D6, P3-B6
  - Do: Add `npm run e2e:prod`, which runs against the public URL: health check, register a throwaway user, delete it.
  - Done when: It passes against the public URL and is listed in the README.

## P4 Harden and demo (Tue Dec 1 to Mon Dec 7)

No new features from Dec 1. Balance numbers may change until Thu Dec 3. From Fri Dec 4 only fixes labeled `demo-blocker`, each with two approvals.

### P4 Team

- [ ] **P4-T1 · Bug bash** — Owner: ____ — Needs: P3-T1
  - Do: On Dec 1 and 2 each member plays two full runs on the public URL, each in a different browser, and files issues labeled `demo-blocker` or `polish`.
  - Done when: Every issue has a label and an owner.

- [ ] **P4-T2 · Outside playtest** — Owner: ____ — Needs: P3-T1
  - Do: Have three people outside the team each play one run without help; note where they get stuck.
  - Done when: The notes are in an issue and anything blocking is labeled `demo-blocker`.

- [ ] **P4-T3 · Code freeze and tag** — Owner: ____ — Needs: P4-A1, P4-B1, P4-C1, P4-D4
  - Do: On Fri Dec 4 tag `v1.0-demo` on `main` once no `demo-blocker` issue is open.
  - Done when: The tag exists and the public URL runs that commit.

- [ ] **P4-T4 · Rehearsal** — Owner: ____ — Needs: P4-T3, P4-D1
  - Do: On Sat Dec 5 or Sun Dec 6 run the demo script on the public URL twice, timed, from the machine that will present.
  - Done when: Both runs finish inside the time limit with no step skipped.

### P4 Stream A

- [ ] **P4-A1 · Engine fixes from the bug bash** — Owner: ____ — Needs: P4-T1
  - Do: Fix engine issues labeled `demo-blocker`. Each fix adds a replay fixture that reproduces the bug, bumps `ENGINE_VERSION`, and regenerates fixtures.
  - Done when: No engine `demo-blocker` is open and all fixture tests are green.

- [ ] **P4-A2 · Final balance numbers** — Owner: ____ — Needs: P4-T2
  - Do: By Thu Dec 3 make the last number changes from playtest notes, keeping the P3-A6 bot targets.
  - Done when: `bot:stats` is inside the targets and the change is merged by Dec 3.

- [ ] **P4-A3 · Determinism soak** — Owner: ____ — Needs: P4-A2
  - Do: Add `npm run soak -w packages/shared`, which random-walks 2,000 seeds and replays each run.
  - Done when: It reports zero hash mismatches, with the output in the pull request.

### P4 Stream B

- [ ] **P4-B1 · Error handling sweep** — Owner: ____ — Needs: P3-B6
  - Do: Make sure no response leaks a stack trace and every route returns the R5 error format for bad input. Add request logging.
  - Done when: A test sends bad input to every route and gets an R5-format error each time.

- [ ] **P4-B2 · Verification speed check** — Owner: ____ — Needs: P2-B6
  - Do: Add a test that verifies 100 bot runs, and confirm `MAX_ACTIONS` is checked before simulation starts.
  - Done when: The 100 runs verify in under 2 seconds in CI.

- [ ] **P4-B3 · API documentation** — Owner: ____ — Needs: P3-B6
  - Do: Write `docs/api.md` from the shared types, with one `curl` example per endpoint.
  - Done when: Every R5 endpoint appears, and each example works against a local server.

- [ ] **P4-B4 · Demo-day data** — Owner: ____ — Needs: P3-B7, P4-T3
  - Do: After 00:00 UTC on Dec 7 (7 pm Eastern on Dec 6) run `seed:demo --force` against production, because the dungeon and the leaderboard reset at that moment.
  - Done when: The public leaderboard for Dec 7 shows the demo entries.

### P4 Stream C

- [ ] **P4-C1 · Game screen fixes from the bug bash** — Owner: ____ — Needs: P4-T1
  - Do: Fix game-screen issues labeled `demo-blocker`, then `polish` as time allows.
  - Done when: No game-screen `demo-blocker` is open.

- [ ] **P4-C2 · Visual feedback** — Owner: ____ — Needs: P3-C5
  - Do: Add CSS-only feedback: a damage number, a card-play transition, a flash when a status ticks. Respect `prefers-reduced-motion`. Animations never change or delay engine state.
  - Done when: The save-and-resume test still passes and a test confirms animations are off under reduced motion.

- [ ] **P4-C3 · How to play** — Owner: ____ — Needs: P3-C3
  - Do: Add a one-screen help modal: turn order, the three tags and statuses, scoring, official and practice runs.
  - Done when: It opens from the Today and combat screens, and a test finds each of the four topics.

### P4 Stream D

- [ ] **P4-D1 · Demo script** — Owner: ____ — Needs: P3-T1
  - Do: Write `docs/demo-script.md`: a timed walkthrough of the four core features, the four data operations, and proof of verification (a tampered run rejected, `/selfcheck` in two browsers), with who presents each part.
  - Done when: All four members have approved it.

- [ ] **P4-D2 · Demo-day runbook** — Owner: ____ — Needs: P1-D6
  - Do: Write `docs/demo-runbook.md`: open the public URL 10 minutes early (a free Render service takes about a minute to wake), confirm the database expiry date is after Dec 7, and the fallback (local `npm start` on a laptop and a screen recording of a full run).
  - Done when: The recording exists and the fallback has been tried once on the presenting laptop.

- [ ] **P4-D3 · Final documentation** — Owner: ____ — Needs: P3-D7
  - Do: Bring the README up to date and write `docs/ai-usage.md`: which AI tools were used for what, and how the review and testing rule was applied.
  - Done when: Both are merged and the README matches the tagged commit.

- [ ] **P4-D4 · CI final state** — Owner: ____ — Needs: P2-D3, P1-D7
  - Do: Make the unit, Postgres, and Playwright jobs required on `main`. Fix flaky tests or skip them with a linked issue.
  - Done when: Ten runs in a row on `main` are green.

---

# OPTIONAL TASKS

**Nothing below is part of the MVP.** Do not start any of it until P3-T1 is checked. Optional
work merges by Thu Dec 3 or waits until after the demo. Features are in the proposal's priority
order; finish one before starting the next. Each one changes the rules, so each bumps
`ENGINE_VERSION`, regenerates fixtures, and updates the Reference. Split a task further before
starting it if it will not fit one small pull request.

## O1 Charm shop

- [ ] **O1-A1 · Gold** — Owner: ____ — Needs: P3-T1
  - Do: Add `gold` to the run state. Fights and elites grant gold from `balance.ts`. Leftover gold adds to the score at a capped rate.
  - Done when: Tests cover gold gain and the score cap, and fixtures are regenerated.

- [ ] **O1-A2 · Merchant nodes and seeded stock** — Owner: ____ — Needs: O1-A1
  - Do: Add node type `merchant` to map generation (1 or 2 per map). Opening stock and each reroll come from stream `shop:<nodeId>`, so the nth reroll is the same for every player. Reroll cost rises 2, 3, 4.
  - Done when: Tests show identical stock and rerolls for one seed, and that rerolling changes no combat or reward outcome.

- [ ] **O1-A3 · Charms and hooks** — Owner: ____ — Needs: O1-A1
  - Do: Add `content/charms.ts` with six charms from the design document that need only MVP systems (Iron Locket, Quick Fuse, Heavy Heart, Glass Charm, Magpie Ring, Haggler's Tongue), as data with hooks `onFightStart`, `onCardPlayed`, `onDamageTaken`, `onGoldGained`, `onShopOpen`, `onShopReroll`. Three slots, no duplicates.
  - Done when: Each charm has a test for its effect and for its drawback.

- [ ] **O1-A4 · Shop actions** — Owner: ____ — Needs: O1-A2, O1-A3
  - Do: Add actions `buyCard`, `buyCharm`, `rerollShop`, `leaveShop` to `applyAction`, `legalActions`, and the bot.
  - Done when: Tests cover each action and each refusal (not enough gold, slots full), and the property tests pass.

- [ ] **O1-B1 · Verify shop runs** — Owner: ____ — Needs: O1-A4
  - Do: Extend the run payload schema with the shop actions and add tamper tests (buy without gold, buy a charm not in stock).
  - Done when: Bot runs through a merchant verify through the API and both tampered runs are rejected.

- [ ] **O1-C1 · Merchant screen and charm bar** — Owner: ____ — Needs: O1-A4
  - Do: Add the merchant screen (stock, prices, reroll with its cost, leave) and a charm bar under the HP display that glows when a charm triggers.
  - Done when: Component tests cover a purchase, a reroll, and a disabled purchase.

- [ ] **O1-D1 · End-to-end shop test** — Owner: ____ — Needs: O1-B1, O1-C1
  - Do: Extend the end-to-end submit test with a bot run that visits a merchant.
  - Done when: The run shows Verified in all three browsers.

## O2 Forge

- [ ] **O2-A1 · Forge nodes and fusion** — Owner: ____ — Needs: O1-D1
  - Do: Add node type `forge` and a `fuse` action that replaces two cards with one from a tag-pair recipe table (start with Fire plus Frost giving Steam Burst: damage to all enemies that ignores Shield).
  - Done when: Tests cover a fusion, a pair with no recipe, and determinism of forge placement.

- [ ] **O2-B1 · Verify forge runs** — Owner: ____ — Needs: O2-A1
  - Do: Extend the payload schema with `fuse` and add a tamper test (fusing a card not in the deck).
  - Done when: A bot run with a fusion verifies and the tampered run is rejected.

- [ ] **O2-C1 · Forge screen** — Owner: ____ — Needs: O2-A1
  - Do: Add a screen to pick two cards, preview the result, and confirm.
  - Done when: Component tests cover a fusion and a pair with no recipe.

## O3 Daily modifiers

- [ ] **O3-A1 · Modifier data and hooks** — Owner: ____ — Needs: O1-A3
  - Do: Add modifiers as data on the charm hook system, starting with Hot and Cold (Fire costs 1 less, Frost 1 more) and Iron Hides (enemies gain Shield each turn). `createRun` takes the day's modifiers.
  - Done when: Tests cover each modifier, and the greedy bot still wins some runs with each applied.

- [ ] **O3-B1 · Store and serve modifiers** — Owner: ____ — Needs: O3-A1
  - Do: Add a `modifiers` column to `daily_dungeons` (migration), choose at most two per day from the seed, return them from `GET /api/dungeons/today`, and pass them to verification.
  - Done when: Tests show a run played with the day's modifiers verifies and one played without them is rejected.

- [ ] **O3-C1 · Show modifiers** — Owner: ____ — Needs: O3-B1
  - Do: Show today's modifiers on the Today screen and in combat.
  - Done when: A component test finds each modifier's name and effect text.

## O4 AI flavor text

- [ ] **O4-B1 · Generate and store flavor** — Owner: ____ — Needs: P3-T1
  - Do: Add a `flavor` column to `daily_dungeons`. When a day is created, ask a model for a dungeon name and theme line, validate against a strict JSON schema, and fall back to a fixed name on any failure. Flavor never reaches the engine.
  - Done when: Tests cover a valid response, an invalid response using the fallback, and that the seed and verification are unaffected.

- [ ] **O4-C1 · Show flavor** — Owner: ____ — Needs: O4-B1
  - Do: Show the dungeon name and theme on the Today screen and the leaderboard header.
  - Done when: Component tests cover a day with flavor and a day with the fallback.

## O5 Replay viewer and graveyard map

- [ ] **O5-B1 · Replay endpoint** — Owner: ____ — Needs: P3-T1
  - Do: Add `GET /api/runs/:id/replay` returning the seed and actions of a verified official run, only to callers who have submitted their own official run for that date.
  - Done when: Tests cover an allowed caller, a caller who has not played yet (403), and a practice run (404).

- [ ] **O5-C1 · Replay viewer** — Owner: ____ — Needs: O5-B1
  - Do: Add a read-only screen that steps through a replay with `applyAction`, with next, previous, and play controls, opened from a leaderboard row.
  - Done when: A test steps a fixture replay to its end and matches the fixture's final hash.

- [ ] **O5-B2 · Graveyard endpoint** — Owner: ____ — Needs: P3-T1
  - Do: Add a `death_node_id` column to `runs` (set during verification) and `GET /api/graveyard?date=` returning deaths per node and the farthest node reached.
  - Done when: Tests check the counts against inserted runs.

- [ ] **O5-D1 · Graveyard map** — Owner: ____ — Needs: O5-B2, P2-C1
  - Do: After a player's official run, show the day's map with a death count on each node and a flag on the farthest node anyone reached.
  - Done when: A component test finds the counts and the flag from mock data.

---

# REFERENCE

The spec every task assumes. Once P0-A3, P0-B2, and P0-B3 are merged, the code is the source of
truth for types and tables, and this section is kept in step with it by `contract-change` pull
requests.

## R1 Repo layout and commands

```
/
├─ TODO.md  README.md  CLAUDE.md  AGENTS.md  render.yaml
├─ package.json            npm workspaces: packages/*, apps/*
├─ tsconfig.base.json
├─ .github/workflows/ci.yml
├─ docs/                   screens.md, engine-rules.md, api.md, demo-script.md (new files)
├─ e2e/                    Playwright tests
├─ packages/
│  └─ shared/              @daily-delve/shared
│     ├─ src/engine/       the game engine: pure, no dependencies (rules in R2)
│     │  └─ content/       cards.ts, enemies.ts, balance.ts (data only)
│     ├─ src/api/          request and response types, error codes
│     ├─ scripts/          bot.ts, fixture generator
│     ├─ fixtures/replays/ golden replays
│     └─ test/
└─ apps/
   ├─ server/              Express REST API
   │  ├─ src/              app.ts, index.ts, db/, routes/, services/, middleware/
   │  ├─ migrations/
   │  └─ test/
   └─ client/              React + Vite
      └─ src/              api/, game/, screens/, components/, mocks/, styles/
```

- The engine is shared as source. `packages/shared/package.json` has `"exports": { ".": "./src/index.ts" }` and no build step. The client imports it through Vite; the server runs it through `tsx`. Both import from `@daily-delve/shared`, never by relative path.
- In production one Express process serves the built client and the API from one origin.
- Tools: TypeScript (strict), Vitest, supertest, Testing Library, MSW, Playwright, zod, Knex with `better-sqlite3` and `pg`, `express-session`, bcryptjs, helmet, express-rate-limit.
- Commands, from the repo root: `npm install`, `npm run dev`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm start`. One workspace: add `-w apps/server`, `-w apps/client`, or `-w packages/shared`.
- Environment variables (server): `DATABASE_URL` (unset means SQLite), `SESSION_SECRET`, `SEED_SECRET`, `PORT` (default 3000), `NODE_ENV`.

## R2 Determinism rules for `packages/shared/src/engine`

1. The folder imports nothing from outside itself and has no npm dependencies.
2. Forbidden: `Date`, `Math.random`, `performance`, timers, `async`, promises, `fetch`, `process`, `window`, `document`, `Intl`, any `toLocale…` or `localeCompare` call, and module-level mutable variables. Allowed `Math` functions: `floor`, `ceil`, `trunc`, `min`, `max`, `abs`, `imul`.
3. Every game number is an integer. Any division is followed at once by `Math.floor`. Percentages are `Math.floor(value * percent / 100)`.
4. All randomness comes from `rng.ts`. A stream is `createRng(seed, streamName)`. Stream names: `map`, `encounters:<nodeId>`, `rewards:<nodeId>`, `shuffle:<nodeId>`. A stream is advanced only by its own system, so one choice never shifts another system's outcomes. A stream's state is plain numbers stored inside the game state.
5. Game state is plain JSON data: objects, arrays, strings, integers, booleans, `null`. No `Map`, `Set`, class instances, functions, or `undefined` values.
6. `applyAction` never changes its input. It copies the state, changes the copy, and returns it. Tests deep-freeze inputs.
7. Number changes apply in one order, in `calc.ts` only: additive, then multiplicative, then caps and the floor of 0.
8. Units act in array index order. Sorting uses a comparator that never returns 0 for different items.
9. Cards, enemies, and constants are data in `content/`. Rules are code outside `content/`. No game number is written in rule code.
10. Any change to behavior or content bumps `ENGINE_VERSION` and regenerates fixtures in the same pull request, and the pull request says why the fixtures changed.

## R3 Game rules for the MVP

Design detail comes from the game design document only where the proposal includes the feature.

**Flagged decisions (task P0-T2 confirms or changes each):**

- DECISION 1: The map is one act of 7 floors plus a boss, not the design document's three acts.
- DECISION 2: Shield expires just before its owner's side acts again. The design document implies Shield carries over between turns; the constant `SHIELD_PERSISTS` switches this.
- DECISION 3: Status numbers below are starting values; the design document gives none.
- DECISION 4: Score weights below are starting values; the design document leaves them open.
- DECISION 5: A shrine offers heal or remove a card. Card upgrades are deferred.
- DECISION 6: The official attempt is used up when an official run is verified, not when it starts.
- DECISION 7: Not in the MVP engine: gold, relics, events, Curse cards, the Echo and Cascade keywords, and per-node action choices (Ambush, Sneak past).

**Run.** The player starts with `PLAYER_MAX_HP`, the 10-card `STARTER_DECK`, and the full map visible. The run ends when the boss is defeated (`won`) or the player's HP reaches 0 (`lost`).

**Map.** Floors 1 to `MAP_FLOORS` have 2 or 3 nodes each; the floor after has one boss node. Each node links to 1 or 2 nodes on the next floor; every node can be reached and can reach the boss. Floor 1 is all fights. Elites appear only on floors 4 to 6, and every map has at least one. The last floor before the boss is all shrines. Other nodes are fights or shrines by seeded weight. Every route is `MAP_FLOORS + 1` nodes long, so `nodesCleared` runs from 0 to 8.

**Turn order in a fight.**

1. Start of turn: the player's Shield expires, `turnStart` powers trigger, the player draws `HAND_SIZE` cards (up to `MAX_HAND`), energy is set to `ENERGY_PER_TURN`, `tagsPlayedThisTurn` resets.
2. Player phase: play cards by paying energy, in any order, then end the turn.
3. Enemy phase: each living enemy, in index order, loses its Shield and then carries out the intent that was shown.
4. End of turn: the hand is discarded, then statuses tick on the player and then on each enemy in index order, then every enemy shows its next intent.

The fight is won the moment every enemy is at 0 HP. If the player reaches 0 HP at any moment the run is lost, even if the last enemy dies in the same step. A fight that reaches `FIGHT_TURN_CAP` turns is lost.

**Cards.** Types: Attack, Skill, Power. Every card has at least one of the tags Fire, Frost, Poison, a cost of 0 to 3, and a list of effects resolved in order. A played card goes to the discard pile, or to the exhaust pile if it has Exhaust, or leaves the deck for the fight if it is a Power.

**Tag synergy.** A `perTagPlayed` bonus counts cards with that tag played earlier in the same turn, not the card itself.

**Statuses.** Each is capped at `STATUS_CAP`.

- Burn N: at end of turn the unit takes N damage (Shield absorbs it), then Burn is halved, rounded down.
- Poison N: at end of turn the unit loses N HP (ignores Shield), then Poison falls by 1.
- Chill N: each attack hit by the unit deals N less damage (not below 0). At end of turn Chill falls by 1.
- Shatter (card effect): remove all Chill from the target and deal `perStack` damage for each stack removed.

**Attack damage, per hit:** base, plus additive changes (tag bonus, power bonus, enemy strength, minus Chill), then multiplicative changes (none in the MVP), then the floor of 0, then Shield absorbs, then HP.

**Rewards.** After a fight or elite the player picks one of three seeded cards or skips. Elite offers include at least one rare.

**Shrine.** Heal `SHRINE_HEAL_PERCENT` of max HP (rounded down, not above max), or remove one card (not below `MIN_DECK_SIZE`).

**Score.** `SCORE_PER_NODE × nodesCleared`, plus, on a win, `SCORE_CLEAR_BONUS + max(0, SCORE_SPEED_BASE − SCORE_SPEED_PER_TURN × turns)`, plus `min(SCORE_STYLE_CAP, SCORE_PER_COMBO × comboTriggers)`. A combo trigger is a tag bonus above 0 being applied, or a Shatter that removes at least one Chill.

**Content targets.**

| Content | P1 | P2 | P3 (final) |
| --- | --- | --- | --- |
| Cards | 10 | 20 | 28: 9 Fire, 9 Frost, 9 Poison, 1 with two tags; 22 common, 6 rare; 3 Powers |
| Normal enemies | 2 | 6 | 6 |
| Elites | 0 | 1 placeholder | 3, one trait each |
| Bosses | 0 | 1 placeholder | 1 with a second phase |

**Constants in `content/balance.ts`.**

| Name | Default | Name | Default |
| --- | --- | --- | --- |
| `PLAYER_MAX_HP` | 60 | `MAP_FLOORS` | 7 |
| `HAND_SIZE` | 5 | `MIN_DECK_SIZE` | 5 |
| `MAX_HAND` | 10 | `SHRINE_HEAL_PERCENT` | 30 |
| `ENERGY_PER_TURN` | 3 | `MAX_ACTIONS` | 2000 |
| `ENERGY_CAP` | 9 | `SCORE_PER_NODE` | 100 |
| `STATUS_CAP` | 30 | `SCORE_CLEAR_BONUS` | 300 |
| `SHIELD_CAP` | 99 | `SCORE_SPEED_BASE` | 300 |
| `SHIELD_PERSISTS` | false | `SCORE_SPEED_PER_TURN` | 3 |
| `FIGHT_TURN_CAP` | 40 | `SCORE_PER_COMBO` | 5 |
| | | `SCORE_STYLE_CAP` | 150 |

## R4 Engine public API and types

Exported from `@daily-delve/shared`.

```ts
export const ENGINE_VERSION: string;

export function generateDungeon(seed: string): Dungeon;
export function createRun(seed: string): RunState;
export function createTestFight(seed: string): RunState;          // Phase 1 helper
export function legalActions(state: RunState): Action[];
export function applyAction(state: RunState, action: Action): ApplyResult;
export function simulate(seed: string, actions: Action[]): SimResult;
export function summarize(state: RunState): RunResult;
export function hashState(state: RunState): string;
export const CARDS: Record<string, CardDef>;
export const ENEMIES: Record<string, EnemyDef>;

type Tag = 'Fire' | 'Frost' | 'Poison';
type StatusId = 'Burn' | 'Chill' | 'Poison';
type Statuses = { Burn: number; Chill: number; Poison: number };

type Effect =
  | { kind: 'damage'; amount: number; target: 'enemy' | 'allEnemies'; hits?: number;
      perTagPlayed?: { tag: Tag; bonus: number } }
  | { kind: 'shield'; amount: number }
  | { kind: 'draw'; count: number }
  | { kind: 'energy'; amount: number }
  | { kind: 'applyStatus'; status: StatusId; amount: number; target: 'enemy' | 'allEnemies' | 'self' }
  | { kind: 'shatter'; perStack: number }
  | { kind: 'power'; power: PowerDef };

type PowerDef =
  | { kind: 'turnStart'; effect: Effect }
  | { kind: 'damageBonus'; tag: Tag; amount: number };

interface CardDef {
  id: string; name: string; type: 'Attack' | 'Skill' | 'Power';
  tags: Tag[]; rarity: 'common' | 'rare'; cost: number;
  effects: Effect[]; exhaust?: boolean; text: string;
}

type Intent =
  | { kind: 'attack'; damage: number; hits: number }
  | { kind: 'block'; amount: number }
  | { kind: 'buff'; strength: number }
  | { kind: 'debuff'; status: StatusId; amount: number };

type Trait =
  | { kind: 'immune'; status: StatusId }
  | { kind: 'startShield'; amount: number }
  | { kind: 'enrage'; everyTurns: number; strength: number };

interface EnemyDef {
  id: string; name: string; tier: 'normal' | 'elite' | 'boss'; maxHp: number;
  intents: Intent[]; traits?: Trait[];
  phase2?: { atOrBelowHpPercent: number; intents: Intent[] };
}

interface MapNode {
  id: string;                       // "f3n1"
  floor: number; index: number;
  type: 'fight' | 'elite' | 'shrine' | 'boss';
  next: string[];                   // node ids on the next floor
}
interface Dungeon {
  seed: string; nodes: MapNode[];
  encounters: Record<string, string[]>;   // nodeId -> enemy ids
  rewards: Record<string, string[]>;      // nodeId -> three card ids
}

interface RngState { a: number; b: number; c: number; d: number }

interface EnemyState {
  defId: string; hp: number; maxHp: number; shield: number; statuses: Statuses;
  strength: number; intentIndex: number; phase: 1 | 2;
}
interface CombatState {
  nodeId: string; turn: number; energy: number;
  hand: string[]; drawPile: string[]; discardPile: string[]; exhaustPile: string[];
  enemies: EnemyState[];
  player: { shield: number; statuses: Statuses; powers: PowerDef[] };
  tagsPlayedThisTurn: { Fire: number; Frost: number; Poison: number };
  rng: RngState;
}
interface RunState {
  engineVersion: string; seed: string;
  phase: 'map' | 'combat' | 'reward' | 'shrine' | 'ended';
  outcome: 'won' | 'lost' | null;
  dungeon: Dungeon;
  position: string | null; nodesCleared: number;
  hp: number; maxHp: number; deck: string[];
  combat: CombatState | null;
  rewardOffers: string[] | null;
  stats: { turns: number; comboTriggers: number };
}

type Action =
  | { type: 'chooseNode'; nodeId: string }
  | { type: 'playCard'; handIndex: number; target?: number }   // target = enemy index
  | { type: 'endTurn' }
  | { type: 'pickReward'; choice: number | null }              // offer index, null = skip
  | { type: 'shrine'; choice: 'heal' }
  | { type: 'shrine'; choice: 'remove'; deckIndex: number };

interface RunResult { outcome: 'won' | 'lost'; nodesCleared: number; score: number; turns: number }

type EngineError = { code: 'ILLEGAL_ACTION' | 'RUN_ENDED' | 'TOO_MANY_ACTIONS'; message: string };
type ApplyResult = { ok: true; state: RunState } | { ok: false; error: EngineError };
type SimResult =
  | { ok: true; state: RunState; result: RunResult | null }    // result is null if the run has not ended
  | { ok: false; error: EngineError; atIndex: number };
```

## R5 API contract

Base path `/api`. JSON in and out. The session is a cookie named `dd.sid`. Days are UTC dates
`"YYYY-MM-DD"`; times are ISO 8601 UTC strings. Every error has this shape:

```ts
interface ApiError { error: { code: ErrorCode; message: string; details?: unknown } }
```

| Method and path | Login | Request body | Success | Errors |
| --- | --- | --- | --- | --- |
| `GET /health` | no | none | 200 `Health` | none |
| `POST /auth/register` | no | `RegisterRequest` | 201 `{ user: User }` | 400 `VALIDATION`, 409 `USERNAME_TAKEN`, 429 `RATE_LIMITED` |
| `POST /auth/login` | no | `LoginRequest` | 200 `{ user: User }` | 400, 401 `INVALID_CREDENTIALS`, 429 |
| `POST /auth/logout` | yes | none | 204 | 401 `UNAUTHENTICATED` |
| `GET /me` | yes | none | 200 `{ user: User }` | 401 |
| `PATCH /me` | yes | `UpdateMeRequest` | 200 `{ user: User }` | 400, 401, 401 `INVALID_CREDENTIALS` |
| `DELETE /me` | yes | `DeleteMeRequest` | 204 | 401, 401 `INVALID_CREDENTIALS` |
| `GET /dungeons/today` | no | none | 200 `TodayResponse` | none |
| `POST /runs` | yes | `SubmitRunRequest` | 201 `SubmitRunResponse` | 400, 401, 409 `ENGINE_VERSION_MISMATCH`, 409 `DATE_CLOSED`, 409 `OFFICIAL_ALREADY_SUBMITTED`, 422 `RUN_REJECTED` |
| `GET /me/runs?limit=20&offset=0` | yes | none | 200 `RunListResponse` | 401 |
| `DELETE /runs/:id` | yes | none | 204 | 401, 404 `NOT_FOUND`, 409 `CANNOT_DELETE_OFFICIAL` |
| `GET /leaderboard?date=&limit=50&offset=0` | no | none | 200 `LeaderboardResponse` | 400 |

```ts
type ErrorCode =
  | 'VALIDATION' | 'UNAUTHENTICATED' | 'INVALID_CREDENTIALS' | 'NOT_FOUND'
  | 'USERNAME_TAKEN' | 'ENGINE_VERSION_MISMATCH' | 'DATE_CLOSED'
  | 'OFFICIAL_ALREADY_SUBMITTED' | 'CANNOT_DELETE_OFFICIAL' | 'RUN_REJECTED'
  | 'RATE_LIMITED' | 'INTERNAL';

interface Health { ok: true; engineVersion: string; rngCheck: number[] }
// rngCheck = five values of nextInt(createRng('selfcheck', 'health'), 1000)

interface User { id: string; username: string; displayName: string; joinedAt: string }

interface RegisterRequest { username: string; password: string; displayName?: string }
interface LoginRequest { username: string; password: string }
interface UpdateMeRequest { displayName?: string; currentPassword?: string; newPassword?: string }
interface DeleteMeRequest { password: string }

interface RunSummary {
  id: string; date: string; official: boolean;
  verified: boolean; rejectReason: string | null;
  outcome: 'won' | 'lost' | null;            // null when rejected
  nodesCleared: number; score: number; turns: number;
  submittedAt: string;
}

interface TodayResponse {
  date: string; seed: string; engineVersion: string;
  officialRun: RunSummary | null;            // null when logged out or not yet submitted
}

interface SubmitRunRequest {
  date: string; official: boolean; engineVersion: string;
  actions: Action[];
  claimed: RunResult;                        // what the browser computed
}
interface SubmitRunResponse { run: RunSummary; rank: number | null }   // rank for official runs
// 422 RUN_REJECTED details:
// { runId: string; reason: 'ILLEGAL_ACTION' | 'RUN_INCOMPLETE' | 'RESULT_MISMATCH'; atIndex?: number }

interface RunListResponse { runs: RunSummary[]; total: number }

interface LeaderboardEntry {
  rank: number; displayName: string; outcome: 'won' | 'lost';
  nodesCleared: number; score: number; turns: number;
  submittedAt: string; isMe: boolean;
}
interface LeaderboardResponse {
  date: string; total: number;
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;               // caller's row, even when off this page
}
```

Rules the server enforces:

- **Limits.** Username 3 to 20 characters from `a-z`, `0-9`, `_`, compared without regard to case. Password 8 to 72 characters. Display name 1 to 24 characters. At most `MAX_ACTIONS` actions. Body at most 100 KB.
- **Seed.** The server looks up the seed by date. It never accepts a seed from the client.
- **Verification.** The server runs `simulate(seed, actions)`. The run is rejected if any action is illegal, if the run has not ended, or if the result differs from `claimed`. The stored values are always the server's.
- **Date rule.** `date` must be today's UTC date, or yesterday's during the first 30 minutes of the UTC day. Otherwise 409 `DATE_CLOSED`.
- **Official attempts.** One verified official run per user per date. A rejected run does not use the attempt.
- **Leaderboard.** Only runs with `official` and `verified` true. Order: `nodesCleared` high to low, then `score` high to low, then `turns` low to high, then `submittedAt` early to late. Rank is the 1-based position in that order.
- **Deleting a run.** A user may delete any of their own runs except a verified official run.
- **The clock.** The server reads time only through the injected `now()`. The engine never reads time.

## R6 Database schema

Written once as a Knex migration and run on both SQLite and Postgres. IDs are UUID strings made
in application code. Times are ISO 8601 UTC strings. Booleans go through one row-mapping function
per table, because SQLite returns 0 and 1.

**users**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | primary key |
| `username` | text | unique, stored lowercase |
| `password_hash` | text | bcrypt |
| `display_name` | text | |
| `created_at` | text | join date |

**daily_dungeons**

| Column | Type | Notes |
| --- | --- | --- |
| `date` | text | primary key, `YYYY-MM-DD` |
| `seed` | text | |
| `created_at` | text | |

Optional features later add `modifiers` and `flavor` columns.

**runs**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | primary key |
| `user_id` | text | references `users.id`, delete cascades |
| `date` | text | references `daily_dungeons.date` |
| `official` | boolean | |
| `official_slot` | text | unique, nullable. `<userId>:<date>` for a verified official run, otherwise null. This is what enforces one official run a day. |
| `engine_version` | text | |
| `actions` | text | JSON array of actions |
| `outcome` | text | `won`, `lost`, or null |
| `nodes_cleared` | integer | server-computed, default 0 |
| `score` | integer | server-computed, default 0 |
| `turns` | integer | server-computed, default 0 |
| `verified` | boolean | default false |
| `reject_reason` | text | nullable |
| `submitted_at` | text | |

Index on `(date, official, verified)`. Index on `(user_id, submitted_at)`.

**sessions** is created and managed by the session store.

How the four data operations map:

| Operation | Where |
| --- | --- |
| Create | `POST /auth/register` (user), `POST /runs` (run), first `GET /dungeons/today` of a day (dungeon) |
| Retrieve | `GET /dungeons/today`, `GET /leaderboard`, `GET /me/runs`, `GET /me` |
| Update | `PATCH /me` (display name, password); `runs.verified` and the result columns after re-simulation |
| Delete | `DELETE /runs/:id` (practice runs), `DELETE /me` (account and its runs) |

## R7 Definition of done

A task's box is checked only when all of these are true:

1. Its "Done when" line is true and a teammate can check it from the pull request.
2. Tests for the new behavior are in the same pull request and would fail without the change.
3. `npm run lint`, `npm run typecheck`, and `npm test` pass locally and CI is green.
4. A teammate has approved the pull request.
5. For engine changes: R2 is followed, and `ENGINE_VERSION` and fixtures are updated if behavior changed.
6. The Reference still matches the code.
7. TODO.md is updated in the same pull request.

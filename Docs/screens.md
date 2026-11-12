# Daily Delve: screen plan

Task P0-C2. One entry per screen: its route, what it reads, what it sends, and a text
wireframe. Field names are the exact ones in TODO.md, Reference R4 (engine state) and R5 (API).

Three rules hold on every screen:

- **The UI never computes a game result.** It reads a `RunState` and dispatches an `Action`
  through the game store (task P1-C1), which calls `applyAction`. What a player may do comes
  from `legalActions(state)`.
- **Game screens have no routes of their own.** `/play` shows one of them according to
  `state.phase` (task P2-C3). The player never navigates between them by hand.
- **The API is reached only through the typed client** (`src/api/client.ts`, task P1-D1).

| Screen                                | Route          | Shown when                 | Built in              |
| ------------------------------------- | -------------- | -------------------------- | --------------------- |
| [Login](#1-login-and-register)        | `/login`       | always                     | P1-D3                 |
| [Register](#1-login-and-register)     | `/register`    | always                     | P1-D3                 |
| [Today's dungeon](#2-todays-dungeon)  | `/`            | always                     | P2-C8                 |
| [Dungeon](#3-dungeon)                 | `/play`        | `state.phase === 'map'`    | P2-C1, P2-C2          |
| [Combat](#4-combat)                   | `/play`        | `state.phase === 'combat'` | P1-C2 to P1-C6        |
| [Reward and deck](#5-reward-and-deck) | `/play`        | `state.phase === 'reward'` | P2-C4, P2-C5          |
| [Shrine](#6-shrine)                   | `/play`        | `state.phase === 'shrine'` | P2-C6                 |
| [Run summary](#7-run-summary)         | `/play`        | `state.phase === 'ended'`  | P2-C9                 |
| [Leaderboard](#8-leaderboard)         | `/leaderboard` | always                     | P2-D4, P3-D1          |
| [Profile](#9-profile)                 | `/profile`     | logged in                  | P2-D5, P3-D2 to P3-D4 |

`/play` and `/profile` send a logged-out visitor to `/login` (task P1-D4). Two more routes
exist for development and testing and are not in the navigation: `/play/test-fight` (the
combat screen on `createTestFight`, task P1-C5) and `/selfcheck` (task P2-D2).

The app shell around every screen (task P1-D4) shows the links Today, Leaderboard, Profile,
and Log out, and the logged-in `User.displayName`. It restores the session with `GET /api/me`.

---

## 1. Login and register

**Routes:** `/login`, `/register`

**Reads**

- Nothing on load. If `GET /api/me` already returned a user, go to `/`.

**Sends**

- Login: `POST /api/auth/login` with `LoginRequest { username, password }`.
- Register: `POST /api/auth/register` with `RegisterRequest { username, password, displayName? }`.
- Both return `{ user: User }`. On success store the user in the auth context and go to `/`.

**Checked in the browser before sending** (the R5 limits)

- `username`: 3 to 20 characters from `a-z`, `0-9`, `_`.
- `password`: 8 to 72 characters.
- `displayName`: 1 to 24 characters, optional.

**Errors shown**

- 400 `VALIDATION`: the message beside each field named in `error.details.fields[].path`.
- 401 `INVALID_CREDENTIALS` (login): one message for both wrong username and wrong password.
- 409 `USERNAME_TAKEN` (register): beside the username field.
- 429 `RATE_LIMITED`: "Too many attempts. Wait a minute."

**Actions dispatched:** none (no game state here).

```
+--------------------------------------------------+
|  Daily Delve                                     |
|                                                  |
|            Log in                                |
|   Username  [______________]                     |
|   Password  [______________]                     |
|             (error message here)                 |
|             [ Log in ]                           |
|                                                  |
|   No account?  Register                          |
+--------------------------------------------------+

Register is the same form plus:
   Display name (optional)  [______________]
   and the link reads "Have an account?  Log in"
```

---

## 2. Today's dungeon

**Route:** `/`

**Reads**

- `GET /api/dungeons/today` → `TodayResponse { date, seed, engineVersion, officialRun }`.
- For the map preview: `generateDungeon(seed)` → `Dungeon.tiles`, `Dungeon.nodes`,
  `Dungeon.start`, `Dungeon.width`, `Dungeon.height`.
- A saved run, if any, from localStorage key `dd.run.v1`
  (`{ date, mode, engineVersion, seed, actions }`, task P2-C7).

**Sends:** nothing. Starting a run calls `createRun(seed)` in the browser and goes to `/play`.

**States**

- `officialRun === null`: show **Official run** and **Practice run**.
- `officialRun !== null`: show its `RunSummary` (`outcome`, `nodesCleared`, `score`, `turns`)
  in place of the Official button. Practice stays.
- A save exists for today's `date` and this `engineVersion`: show **Resume run**.
- Logged out: both buttons lead to `/login`.
- `TodayResponse.engineVersion` differs from the client's `ENGINE_VERSION`: tell the player
  to reload (task P3-C4).
- The request fails: an error with a **Retry** button (task P3-C4).

**Actions dispatched:** none.

```
+--------------------------------------------------+
|  Today  Leaderboard  Profile        Tyler  Log out|
+--------------------------------------------------+
|  Today's Dungeon            2026-11-12           |
|                                                  |
|  +-------------------------------+               |
|  | #############################  |  map preview  |
|  | #S..#...F...#..E..#......B#  |  S start       |
|  | #...~.......R.....#.......#  |  F fight       |
|  | #############################  |  E elite       |
|  +-------------------------------+  + shrine      |
|                                     B boss        |
|  [ Official run ]   [ Practice run ]              |
|  One official run a day counts for the leaderboard|
|                                                  |
|  --- after the official run is submitted ---     |
|  Your official run:  Cleared 6 sites             |
|  Score 740   Turns 38   Verified                 |
|  [ Practice run ]   [ See leaderboard ]          |
+--------------------------------------------------+
```

---

## 3. Dungeon

**Route:** `/play`, when `state.phase === 'map'`

**Reads from `RunState`**

- `dungeon.width`, `dungeon.height`, `dungeon.tiles`: the grid. One string per row: `#` wall,
  `.` floor, `B` brambles (Fire), `~` water (Frost), `R` bars (Poison).
- `dungeon.nodes`: each site's `id`, `x`, `y`, `type` (`fight`, `elite`, `shrine`, `boss`).
- `dungeon.start`, `pos`: where the run began and where the player stands.
- `cleared`: site ids already done, drawn dimmed.
- `openedGates`: tile indexes (`y * width + x`) drawn as floor.
- `deck`: to count cards per tag for the gate hint (against `CARDS[id].tags`).
- `hp`, `maxHp`, `nodesCleared`, `stats.steps`: the status bar.
- `legalActions(state)`: which of the four directions are open.

**Actions dispatched**

- `{ type: 'move', dir: 'N' | 'E' | 'S' | 'W' }` from the arrow keys, WASD, or a click on a
  tile next to the player. Only directions in `legalActions(state)` dispatch.

**Notes**

- Stepping onto an uncleared site changes `state.phase`, and `/play` swaps to the combat or
  shrine screen by itself.
- Hovering a tile says what it is. A closed gate says which tag opens it and how many cards
  of that tag the deck holds, out of `GATE_TAG_CARDS`.
- Every site is also listed as text beside the canvas, so the screen can be read and tested
  without the canvas.
- A **Deck** button opens the deck viewer (see screen 5).

```
+--------------------------------------------------+
|  HP 46/60   Sites 3/11   Steps 42    [ Deck ]    |
+----------------------------------+---------------+
|  #############################   | Sites         |
|  #...#.......#.......#......#   | n0 fight  done|
|  #.@.F...+...~...E...#...B..#   | n1 shrine done|
|  #...#.......#.......R......#   | n2 fight  done|
|  ######.###########.#########   | n3 elite      |
|  #...#.......#.......#......#   | n4 fight      |
|  #...F.......B...+...F......#   | ...           |
|  #############################   | n10 boss      |
|                                  |               |
|  @ you  F fight  E elite         | Hover: Water. |
|  + shrine  B boss                | Opens with 3  |
|  B brambles  ~ water  R bars     | Frost cards.  |
|                                  | You hold 2.   |
+----------------------------------+---------------+
|  Move: arrow keys or WASD, or click a tile       |
+--------------------------------------------------+
```

---

## 4. Combat

**Route:** `/play`, when `state.phase === 'combat'`. Also `/play/test-fight` during Phase 1.

**Reads from `RunState`**

- `hp`, `maxHp`: the player's health.
- `combat.player.shield`, `combat.player.statuses` (`Burn`, `Chill`, `Poison`),
  `combat.player.powers`.
- `combat.energy`, `combat.turn`.
- `combat.hand`: card ids, each drawn with the `Card` component from `CARDS[id]`.
- `combat.drawPile.length`, `combat.discardPile.length`, `combat.exhaustPile.length`.
- `combat.tagsPlayedThisTurn`: to highlight cards whose `perTagPlayed` bonus is live
  (task P3-C2).
- `combat.enemies[]`: for each, `defId` (name from `ENEMIES[defId].name`), `hp`, `maxHp`,
  `shield`, `statuses`, `strength`, `intentIndex`, `phase`.
- An enemy's intent: `ENEMIES[defId].intents[intentIndex]`, or
  `ENEMIES[defId].phase2.intents[intentIndex]` when `phase === 2`. Shown as its kind and
  number, for example "Attack 6" or "Attack 3 x2".
- `legalActions(state)`: which cards and targets are playable.

**Actions dispatched**

- `{ type: 'playCard', handIndex, target? }`: `target` is an index into `combat.enemies`.
  A card that needs a target is selected with one click and played by clicking an enemy.
  Other cards play on the first click.
- `{ type: 'endTurn' }` from the End Turn button.

**Notes**

- A card whose `CardDef.cost` is above `combat.energy` is disabled and dispatches nothing.
- Enemies at 0 `hp` are drawn defeated and cannot be targeted.
- When the fight ends `state.phase` changes (`reward`, `map`, or `ended`) and `/play` swaps
  screens. On `/play/test-fight` a Victory or Defeat overlay offers a restart on a new seed
  (task P1-C6).
- A **Deck** button opens the deck viewer.

```
+--------------------------------------------------+
|  Turn 3                              [ Deck ]    |
|                                                  |
|     Gel Slime              Bone Archer           |
|     Attack 6               Attack 3 x2           |
|     [#######---] 15/22     [####------] 7/16     |
|     Shield 5               Burn 2  Chill 1       |
|                                                  |
+--------------------------------------------------+
|  HP [########--] 46/60   Shield 5   Poison 1     |
|  Energy 2/3                                      |
|                                                  |
|  +------+ +------+ +------+ +------+ +------+    |
|  |0 Kip | |1 Nix | |1 Bram| |2 Sera| |2 Rook|    |
|  |Attack| |Attack| |Attack| |Skill | |Attack|    |
|  | Fire | |Frost | | Fire | | Fire | | Fire |    |
|  +------+ +------+ +------+ +------+ +------+    |
|                                                  |
|  Draw 3    Discard 2    Exhaust 0   [ End Turn ] |
+--------------------------------------------------+
```

---

## 5. Reward and deck

**Route:** `/play`, when `state.phase === 'reward'`

**Reads from `RunState`**

- `rewardOffers`: three card ids, each drawn with the `Card` component from `CARDS[id]`.
- `deck`: for the deck viewer.
- `hp`, `maxHp`, `nodesCleared`.

**Actions dispatched**

- `{ type: 'pickReward', choice: 0 | 1 | 2 }`: add that offer to the deck.
- `{ type: 'pickReward', choice: null }`: skip.

Either one returns the run to `state.phase === 'map'`.

**Deck viewer** (task P2-C5): a modal opened from the dungeon, combat, and reward screens.
It reads `deck` only, groups the ids, and shows each `CARDS[id]` once with its count. It
dispatches nothing.

```
+--------------------------------------------------+
|  Victory!  Choose a card            [ Deck (11) ]|
|  HP 46/60                                        |
|                                                  |
|   +---------+   +---------+   +---------+        |
|   |1  Pyra  |   |1  Nix   |   |1  Vex   |        |
|   | Attack  |   | Attack  |   | Attack  |        |
|   |  Fire   |   |  Frost  |   | Poison  |        |
|   | Deal 5..|   | Deal 5..|   | Deal 3..|        |
|   +---------+   +---------+   +---------+        |
|     [ Take ]      [ Take ]      [ Take ]         |
|                                                  |
|                  [ Skip ]                        |
+--------------------------------------------------+

Deck viewer (modal):
+----------------------------------+
|  Your deck (11 cards)        [x] |
|  Bram, the Footsoldier       x5  |
|  Tova, the Shieldbearer      x4  |
|  Kip, the Matchstick Kid     x1  |
|  Pyra, the Ember Witch       x1  |
+----------------------------------+
```

---

## 6. Shrine

**Route:** `/play`, when `state.phase === 'shrine'`

**Reads from `RunState`**

- `hp`, `maxHp`: to show the heal amount, `floor(maxHp * SHRINE_HEAL_PERCENT / 100)`, capped
  so `hp` does not pass `maxHp`. The number shown is for display only; the engine applies it.
- `deck`: the cards that can be removed.
- `legalActions(state)`: whether `remove` is allowed. It is refused when `deck.length` is at
  `MIN_DECK_SIZE`, and the Remove choice is then disabled.

**Actions dispatched**

- `{ type: 'shrine', choice: 'heal' }`
- `{ type: 'shrine', choice: 'remove', deckIndex }`: `deckIndex` is an index into `deck`.

Either one returns the run to `state.phase === 'map'`.

```
+--------------------------------------------------+
|  A quiet shrine                     HP 31/60     |
|                                                  |
|   +--------------------+  +--------------------+ |
|   |  Rest              |  |  Let go            | |
|   |  Heal 18 HP        |  |  Remove one card   | |
|   |  (31 -> 49)        |  |  from your deck    | |
|   |  [ Heal ]          |  |  [ Choose a card ] | |
|   +--------------------+  +--------------------+ |
|                                                  |
|  --- after "Choose a card" ---                   |
|  Pick the card to remove:                        |
|  [Bram] [Bram] [Bram] [Tova] [Tova] [Kip] ...    |
|  [ Back ]                                        |
+--------------------------------------------------+
```

---

## 7. Run summary

**Route:** `/play`, when `state.phase === 'ended'`

**Reads**

- From `RunState`: `outcome` (`won` or `lost`), `dungeon.nodes.length` (the total sites),
  `stats.steps`.
- `summarize(state)` → `RunResult { outcome, nodesCleared, score, turns }`.
- The saved run from `dd.run.v1`: `date`, `mode` (official or practice), and `actions`.

**Sends**

- `POST /api/runs`, exactly once, with `SubmitRunRequest { date, official, engineVersion,
actions, claimed }`, where `claimed` is the `RunResult` above.
- Success: 201 `SubmitRunResponse { run, rank }`. `rank` is a number for an official run and
  `null` for practice.

**States after sending**

| Response                         | Shown                                                                                            | Save in `dd.run.v1` |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------- |
| 201                              | **Verified**, and the rank for an official run                                                   | cleared             |
| 422 `RUN_REJECTED`               | **Rejected** with `error.details.reason` (`ILLEGAL_ACTION`, `RUN_INCOMPLETE`, `RESULT_MISMATCH`) | cleared             |
| 409 `OFFICIAL_ALREADY_SUBMITTED` | **Already submitted**                                                                            | cleared             |
| 409 `ENGINE_VERSION_MISMATCH`    | "The game was updated. Reload the page."                                                         | discarded           |
| 409 `DATE_CLOSED`                | "This dungeon has closed."                                                                       | cleared             |
| Network failure                  | **Could not submit** with a **Retry** button                                                     | kept                |

**Actions dispatched:** none. The run is over, so `applyAction` would return `RUN_ENDED`.

```
+--------------------------------------------------+
|  Official run                       2026-11-12   |
|                                                  |
|               Dungeon cleared!                   |
|        (or: You fell at the Ember Imp)           |
|                                                  |
|     Sites cleared    11 / 11                     |
|     Score            1,240                       |
|     Turns            41                          |
|                                                  |
|     Submitting...                                |
|     -> Verified. Rank 3 today.                   |
|     -> Rejected: RESULT_MISMATCH                 |
|     -> Already submitted                         |
|     -> Could not submit.  [ Retry ]              |
|                                                  |
|     [ Leaderboard ]   [ Practice run ]           |
+--------------------------------------------------+
```

---

## 8. Leaderboard

**Route:** `/leaderboard`

**Reads**

- `GET /api/leaderboard?date=&limit=50&offset=0` →
  `LeaderboardResponse { date, total, entries, me }`.
- Each `LeaderboardEntry`: `rank`, `displayName`, `outcome`, `nodesCleared`, `score`, `turns`,
  `submittedAt`, `isMe`.

**Sends:** nothing else. Paging repeats the request with a new `offset`.

**Notes**

- Only official, verified runs appear. The order is the server's: `nodesCleared` high to low,
  `score` high to low, `turns` low to high, `submittedAt` early to late. The client never
  sorts.
- The "reached" column shows "Cleared" when `outcome === 'won'`, otherwise
  "`nodesCleared` sites".
- The row with `isMe` is highlighted. When `me` is not `null` and is not in `entries`, it is
  pinned under the table.
- `total === 0`: "No runs yet today. Be the first."
- 400 (a bad `date`): fall back to today.

**Actions dispatched:** none.

```
+--------------------------------------------------+
|  Leaderboard                2026-11-12           |
|                                                  |
|  #   Player        Reached     Score  Turns Time |
|  1   Aaron         Cleared     1,310    36  09:14|
|  2   Justin        Cleared     1,240    41  11:02|
|  3 > Tyler         Cleared     1,180    44  13:40|
|  4   Antonio       8 sites       815    52  10:27|
|  ...                                             |
|  ----------------------------------------------- |
|  61 > Tyler        5 sites       520    33  14:05|
|                    (pinned when off this page)   |
|                                                  |
|  [ < Prev ]   Page 1 of 2   [ Next > ]           |
+--------------------------------------------------+
```

---

## 9. Profile

**Route:** `/profile` (logged in only)

**Reads**

- `GET /api/me` → `{ user: User }`: `username`, `displayName`, `joinedAt`.
- `GET /api/me/runs?limit=20&offset=0` → `RunListResponse { runs, total }`.
- Each `RunSummary`: `id`, `date`, `official`, `verified`, `rejectReason`, `outcome`,
  `nodesCleared`, `score`, `turns`, `submittedAt`.

**Sends**

- `PATCH /api/me` with `UpdateMeRequest { displayName }` to rename.
- `PATCH /api/me` with `UpdateMeRequest { currentPassword, newPassword }` to change the
  password. 401 `INVALID_CREDENTIALS` means the current password was wrong.
- `DELETE /api/runs/:id` to delete a run. The button is hidden when
  `official && verified`; the server answers 409 `CANNOT_DELETE_OFFICIAL` for those anyway.
- `DELETE /api/me` with `DeleteMeRequest { password }`, after a typed confirmation. Then log
  out and go to `/register`.
- `POST /api/auth/logout`.

**Notes**

- The result column shows "Won", "Lost", or "Rejected" (when `outcome === null`, with
  `rejectReason` as a hint).
- `total === 0`: "No runs yet. Play today's dungeon."

**Actions dispatched:** none.

```
+--------------------------------------------------+
|  Profile                                         |
|                                                  |
|  Username      tyler                             |
|  Display name  [Tyler_________]  [ Save ]        |
|  Joined        2026-11-10                        |
|                                                  |
|  Change password                                 |
|  Current [________]  New [________]  [ Change ]  |
|                                                  |
|  Run history (12)                                |
|  Date        Mode      Result  Score  Verified   |
|  2026-11-12  Official  Won     1,180  yes        |
|  2026-11-12  Practice  Lost      520  yes  [Del] |
|  2026-11-11  Practice  Rejected    0  no   [Del] |
|  [ < Prev ]  [ Next > ]                          |
|                                                  |
|  [ Log out ]              [ Delete account... ]  |
+--------------------------------------------------+
```

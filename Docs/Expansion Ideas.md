# Daily Delve: Expansion Ideas

Ranked by how much they add for how little they cost to build on the current engine.
Each idea names the game it borrows from and what it would touch in our code.

## Tier 1: build next (small, high impact)

1. **Share grid and streaks** (Wordle). After a run, copy a spoiler-free result: score, moves vs par, time, and the elements you picked as emoji. Add a streak counter for consecutive days cleared. The result text already exists in the client; streaks need one more localStorage value, then the server.
2. **Ghost replays** (Trackmania, Super Meat Boy). Watch the top run of the day, or race a friend's ghost drawn as a faded sprite. A run is already just `map : cards : action string`, so a ghost is a second `State` stepped alongside yours.
3. **Undo in practice mode** (Baba Is You, Stephen's Sausage Roll). Puzzle players expect it. Because `step` never mutates state, undo is a stack of previous states. Keep it out of official runs, or charge score for it.
4. **Three-star par medals** (Cut the Rope, Hitman GO). Bronze for a clear, silver for beating par x 1.25, gold for beating par. Gives a goal other than the raw number and makes "one more try" tempting.
5. **Daily modifiers** (Slay the Spire daily climb; already in our design doc). One rule twist per day: "Hot and Cold" (Fire cards +1 charge, Frost -1), "Iron Hides" (all enemies +1 armor), "Thin Air" (8 HP), "Lights Out" (you only see 5 tiles around you). Modifiers are data that tweak `createRun`, and the bot gate already re-checks the day with them applied.
6. **Hint ladder** (NYT puzzles). Three hints, each costing score: reveal one useful card, reveal the route, reveal the first ten moves. The bot's stored answers already contain all three.

## Tier 2: deeper systems (medium cost)

7. **Forge fusions** (our design doc; Loop Hero, Wildfrost). Spend a pick slot to fuse two offered cards into one: Fire + Frost = **Steam Burst** (blinds enemies in a line and opens both ice walls and water), Poison + Fire = **Toxic Blaze** (burning gas), Frost + Poison = **Brittle Venom** (frozen enemies take double poison). One secret recipe per day for players to discover.
8. **Charms** (our design doc; Balatro jokers, Hades boons). One passive picked alongside the 4 cards, each with a drawback: "Glass Charm: +1 damage, 7 HP", "Light Feet: traps never trigger, cannot push crates", "Magpie Ring: gold counts double, par is 10% lower". Uses the same hook points the Phoenix Feather already uses.
9. **Reactive terrain chains** (Divinity: Original Sin, Noita). Water + lightning, frozen floor that makes everything slide (Pokemon ice puzzles), steam clouds when fire meets water that block imp sightlines, poison gas that explodes when lit. We already have fire/gas/oil overlays, so each is a new row in the `reaction` table.
10. **More mechanical enemies** (Crypt of the NecroDancer, Into the Breach, Hoplite):
    - **Mirror Shade** that copies your moves in reverse; trap it against a wall.
    - **Archer** that telegraphs a whole row, Into the Breach style.
    - **Thief Goblin** that grabs gold and runs for the exit; catch it for a bonus.
    - **Necromancer** that re-raises the first enemy you kill unless you burn the bones.
    - **Shield Bearer** that can only be hurt from behind or the side.
11. **Boss rooms** (Zelda dungeons, Hades). A final-room boss with a three-step pattern that is itself a small puzzle: a hydra whose heads must be frozen in order, a furnace golem that must be lured onto oil. Killing it is optional but worth a large style bonus.
12. **Keys with colors, switches and one-way doors** (Zelda, Chip's Challenge). More lock-and-key vocabulary for the generator: colored keys, levers that flip two gates at once, conveyor floors, collapsing floors you can cross once.
13. **Secrets and optional objectives** (Spelunky, Hitman). A hidden room behind a cracked wall, a "pacifist" bonus for zero kills, a "purist" bonus for finishing with a card unused, a daily bounty ("shove an enemy into lava").

## Tier 3: bigger bets

14. **Weekly gauntlet** (Slay the Spire acts, Spelunky daily). Three linked floors on Sunday; HP and unused charges carry over, and you draft one new card between floors. This is the bridge back to the full roguelike in the original design doc.
15. **Level editor and community dungeons** (Mario Maker, Baba Is You). Players build a map in the browser; it can only be published once the solver proves it has two solutions. The verifier is the moderation tool.
16. **Draft mode** (Hearthstone Arena). Instead of 4 from 9, pick 1 of 3 four times, with later offers reacting to earlier picks.
17. **Asynchronous versus** (Tetris 99 targeting, daily chess puzzles). Two friends play the same dungeon at once; clearing a room first drops a hazard in the other player's version. Needs a server but no new rules.
18. **Classes and meta-unlocks** (Hades mirror, Dead Cells). A Pyromancer starts with one free Torch charge, a Rogue has 8 HP but can step diagonally. Unlock new cards into the offer pool by clearing dungeons, so the first week teaches the game gradually.
19. **Dungeon Gazette** (our design doc). An AI-written morning recap built from real run statistics: most-picked card, the tile where most players died, the cleverest route. A "graveyard map" overlay showing death counts per tile comes for free from stored replays.
20. **Themed biomes and seasons** (Dead Cells, Spelunky). Ice caves where everything slides, a foundry full of lava and conveyor belts, a flooded crypt. Each biome is a tile palette plus a different weighting of the generator's lock pools.

## Balance and tooling ideas

- **Exact par.** Run the solver a second time with weight 1 on the best card set so par is truly optimal, and show "you beat the bot" when a player does better.
- **Difficulty rating from data.** Rate each dungeon by the share of winning loadouts and the bot's node count, then schedule easy Mondays and brutal Saturdays (NYT crossword rhythm).
- **Three-card answers.** The bot currently proves 1- and 2-card solutions only. Searching triples would unlock harder days where the full hand matters.
- **Solver as tutor.** After a failed run, show the first place the player's route diverged from a known solution.

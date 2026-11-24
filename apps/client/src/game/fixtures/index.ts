// Hand-written game states for component tests (task P1-C2). combat.json is a CombatState in
// the exact shape of TODO.md, Reference R4: turn 3 of a fight against the Bone Archer and the
// Gel Slime, with every pile, status, and badge in use.
//
// dungeon.json (task P2-C1) is a Dungeon in the same shape: a 33 by 19 grid of 4 by 3 rooms
// with all three gate kinds and ten sites (6 fights, an elite, 2 shrines, the boss), written
// by hand to follow the R3 dungeon rules, so the map screens can be built before the
// generator (task P2-A1) exists.
import { ENGINE_VERSION } from '@daily-delve/shared';
import type { CombatState, Dungeon, RunState } from '@daily-delve/shared';
import combat from './combat.json';
import dungeon from './dungeon.json';

/** The player's HP in the fixture run. CombatState has no HP of its own. */
export const FIXTURE_HP = 48;
export const FIXTURE_MAX_HP = 60;

/** A fresh copy of combat.json, safe to change. */
export function fixtureCombat(): CombatState {
  return structuredClone(combat) as unknown as CombatState;
}

/** A fresh copy of dungeon.json, safe to change. */
export function fixtureDungeon(): Dungeon {
  return structuredClone(dungeon) as Dungeon;
}

/** The ten cards a run starts with, as in the engine's STARTER_DECK. */
const FIXTURE_DECK = [
  'kip',
  'pyra',
  'sera',
  'brother-ash',
  'nix',
  'bryn',
  'halvard',
  'vex',
  'bog-witch',
  'rook',
];

/**
 * A run in the map phase on the fixture dungeon: the first fight (n2, in the doorway south of
 * the start room) is cleared and the player stands just past it, in the west room of the
 * middle row.
 */
export function fixtureMapRun(change?: (state: RunState) => void): RunState {
  const state: RunState = {
    engineVersion: ENGINE_VERSION,
    seed: 'fixture-dungeon',
    phase: 'map',
    outcome: null,
    dungeon: fixtureDungeon(),
    pos: { x: 4, y: 8 },
    cleared: ['n2'],
    openedGates: [],
    nodesCleared: 1,
    hp: FIXTURE_HP,
    maxHp: FIXTURE_MAX_HP,
    deck: [...FIXTURE_DECK],
    combat: null,
    rewardOffers: null,
    stats: { turns: 4, comboTriggers: 1, steps: 9 },
  };
  change?.(state);
  return state;
}

/**
 * The fixture fight inside a run, on a one-tile dungeon whose only site is the boss, as in
 * createTestFight: winning this fight wins the run.
 */
export function fixtureRun(change?: (state: RunState) => void): RunState {
  const state: RunState = {
    engineVersion: ENGINE_VERSION,
    seed: 'fixture',
    phase: 'combat',
    outcome: null,
    dungeon: {
      seed: 'fixture',
      width: 3,
      height: 3,
      tiles: ['###', '#.#', '###'],
      start: { x: 1, y: 1 },
      nodes: [{ id: 'n0', x: 1, y: 1, type: 'boss' }],
      encounters: { n0: ['bone-archer', 'gel-slime'] },
      rewards: {},
    },
    pos: { x: 1, y: 1 },
    cleared: [],
    openedGates: [],
    nodesCleared: 0,
    hp: FIXTURE_HP,
    maxHp: FIXTURE_MAX_HP,
    deck: [...FIXTURE_DECK],
    combat: fixtureCombat(),
    rewardOffers: null,
    stats: { turns: 3, comboTriggers: 1, steps: 0 },
  };
  change?.(state);
  return state;
}

// Hand-written game states for component tests (task P1-C2). combat.json is a CombatState in
// the exact shape of TODO.md, Reference R4: turn 3 of a fight against the Bone Archer and the
// Gel Slime, with every pile, status, and badge in use.
import { ENGINE_VERSION } from '@daily-delve/shared';
import type { CombatState, RunState } from '@daily-delve/shared';
import combat from './combat.json';

/** The player's HP in the fixture run. CombatState has no HP of its own. */
export const FIXTURE_HP = 48;
export const FIXTURE_MAX_HP = 60;

/** A fresh copy of combat.json, safe to change. */
export function fixtureCombat(): CombatState {
  return structuredClone(combat) as unknown as CombatState;
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
    deck: [
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
    ],
    combat: fixtureCombat(),
    rewardOffers: null,
    stats: { turns: 3, comboTriggers: 1, steps: 0 },
  };
  change?.(state);
  return state;
}

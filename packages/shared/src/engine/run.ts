// The run: the public entry points that turn a seed and a list of actions into game states
// (TODO.md, Reference R4).
import { activeCombat, combatActions, endTurn, playCard, startCombat } from './combat.ts';
import { TEST_FIGHT_ENEMIES } from './content/enemies.ts';
import { DEFS } from './defs.ts';
import type { Defs } from './defs.ts';
import { notImplemented } from './notImplemented.ts';
import { createRng, pick } from './rng.ts';
import { cloneRun, newRun } from './state.ts';
import type { Action, ApplyResult, EngineError, RunResult, RunState, SimResult } from './types.ts';

/** Starts a run of the dungeon generated from `seed`. */
export function createRun(_seed: string): RunState {
  return notImplemented('createRun', 'P2-A3');
}

/** The test fight's only site. */
const TEST_FIGHT_NODE = 'n0';

/**
 * Phase 1 helper: a run already in combat against one enemy, chosen by the seed on the
 * site's `encounters` stream. The dungeon is one floor tile holding a boss site, with the
 * player standing on it, so winning the fight wins the run. The rest is a new run: full HP,
 * the starter deck shuffled on the `shuffle` stream, and turn 1 dealt.
 */
export function createTestFight(seed: string): RunState {
  const enemyId = pick(createRng(seed, `encounters:${TEST_FIGHT_NODE}`), TEST_FIGHT_ENEMIES);
  const state = newRun(seed, {
    seed,
    width: 3,
    height: 3,
    tiles: ['###', '#.#', '###'],
    start: { x: 1, y: 1 },
    nodes: [{ id: TEST_FIGHT_NODE, x: 1, y: 1, type: 'boss' }],
    encounters: { [TEST_FIGHT_NODE]: [enemyId] },
    rewards: {},
  });
  startCombat(state, TEST_FIGHT_NODE, DEFS);
  return state;
}

/** Every action that `applyAction` would accept in this state. */
export function legalActions(state: RunState): Action[] {
  return legalActionsWith(state, DEFS);
}

/** `legalActions` with the content tables passed in, as for `applyActionWith`. */
export function legalActionsWith(state: RunState, defs: Defs): Action[] {
  switch (state.phase) {
    case 'ended':
      return [];
    case 'combat':
      return combatActions(activeCombat(state), defs);
    case 'map':
      return notImplemented('legalActions in the map phase', 'P2-A3');
    case 'reward':
      return notImplemented('legalActions in the reward phase', 'P2-A4');
    case 'shrine':
      return notImplemented('legalActions in the shrine phase', 'P2-A5');
  }
}

/** Applies one action. Never changes `state`; returns a new state or an error. */
export function applyAction(state: RunState, action: Action): ApplyResult {
  return applyActionWith(state, action, DEFS);
}

/**
 * `applyAction` with the content tables passed in. The public API always uses the real
 * content; rule tests pass small tables of their own.
 */
export function applyActionWith(state: RunState, action: Action, defs: Defs): ApplyResult {
  if (state.phase === 'ended') {
    return { ok: false, error: { code: 'RUN_ENDED', message: 'The run is over' } };
  }
  const next = cloneRun(state);
  const error = dispatch(next, action, defs);
  return error ? { ok: false, error } : { ok: true, state: next };
}

/** Changes `state` (a copy) by one action, or returns why the action is refused. */
function dispatch(state: RunState, action: Action, defs: Defs): EngineError | null {
  if (typeof action !== 'object' || action === null) return refuse('An action must be an object');
  switch (action.type) {
    case 'playCard':
      if (state.phase !== 'combat') return wrongPhase(action.type, state);
      return playCard(state, action.handIndex, action.target, defs);
    case 'endTurn':
      if (state.phase !== 'combat') return wrongPhase(action.type, state);
      return endTurn(state, defs);
    case 'move':
      if (state.phase !== 'map') return wrongPhase(action.type, state);
      return notImplemented('move', 'P2-A3');
    case 'pickReward':
      if (state.phase !== 'reward') return wrongPhase(action.type, state);
      return notImplemented('pickReward', 'P2-A4');
    case 'shrine':
      if (state.phase !== 'shrine') return wrongPhase(action.type, state);
      return notImplemented('shrine', 'P2-A5');
    default:
      return refuse(`Unknown action type "${String((action as { type?: unknown }).type)}"`);
  }
}

function refuse(message: string): EngineError {
  return { code: 'ILLEGAL_ACTION', message };
}

function wrongPhase(type: Action['type'], state: RunState): EngineError {
  return refuse(`"${type}" is not allowed in the ${state.phase} phase`);
}

/** Replays a whole run from its seed and action list. */
export function simulate(_seed: string, _actions: Action[]): SimResult {
  return notImplemented('simulate', 'P2-A7');
}

/** The result and score of an ended run. */
export function summarize(_state: RunState): RunResult {
  return notImplemented('summarize', 'P2-A6');
}

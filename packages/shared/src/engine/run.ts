// The run: the public entry points that turn a seed and a list of actions into game states
// (TODO.md, Reference R4).
import { playCard } from './combat.ts';
import { DEFS } from './defs.ts';
import type { Defs } from './defs.ts';
import { notImplemented } from './notImplemented.ts';
import { cloneRun } from './state.ts';
import type { Action, ApplyResult, EngineError, RunResult, RunState, SimResult } from './types.ts';

/** Starts a run of the dungeon generated from `seed`. */
export function createRun(_seed: string): RunState {
  return notImplemented('createRun', 'P2-A3');
}

/** Phase 1 helper: a run already in combat against one enemy. */
export function createTestFight(_seed: string): RunState {
  return notImplemented('createTestFight', 'P1-A7');
}

/** Every action that `applyAction` would accept in this state. */
export function legalActions(_state: RunState): Action[] {
  return notImplemented('legalActions', 'P1-A8');
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
      return notImplemented('endTurn', 'P1-A4');
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

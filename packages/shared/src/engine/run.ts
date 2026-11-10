import { notImplemented } from './notImplemented.ts';
import type { Action, ApplyResult, RunResult, RunState, SimResult } from './types.ts';

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
export function applyAction(_state: RunState, _action: Action): ApplyResult {
  return notImplemented('applyAction', 'P1-A3');
}

/** Replays a whole run from its seed and action list. */
export function simulate(_seed: string, _actions: Action[]): SimResult {
  return notImplemented('simulate', 'P2-A7');
}

/** The result and score of an ended run. */
export function summarize(_state: RunState): RunResult {
  return notImplemented('summarize', 'P2-A6');
}

import { notImplemented } from './notImplemented.ts';
import type { RunState } from './types.ts';

/** Hex hash of the canonical JSON of a run state. */
export function hashState(_state: RunState): string {
  return notImplemented('hashState', 'P1-B7');
}

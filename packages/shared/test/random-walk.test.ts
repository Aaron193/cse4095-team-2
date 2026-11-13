// The purity property test (task P1-A8): random walks through the test fight for 50 seeds,
// with every input state deep-frozen, then a replay of each walk's recorded actions.
import { applyAction, createTestFight, hashState, legalActions } from '@daily-delve/shared';
import type { Action, RunState } from '@daily-delve/shared';
import { describe, expect, it } from 'vitest';
import { FIGHT_TURN_CAP } from '../src/engine/content/balance.ts';
import { createRng, nextInt } from '../src/engine/rng.ts';
import { deepFreeze } from './support.ts';

const SEEDS = Array.from({ length: 50 }, (_, i) => `walk-${i}`);
/** More steps than any fight can take: FIGHT_TURN_CAP turns of at most a full hand each. */
const STEP_LIMIT = FIGHT_TURN_CAP * 12;

interface Walk {
  actions: Action[];
  hashes: string[];
  final: RunState;
}

/** Plays random legal actions from the test fight for `seed` until the run ends. */
function randomWalk(seed: string): Walk {
  const rng = createRng(seed, 'walk'); // the test's own stream, not one the engine uses
  let state = deepFreeze(createTestFight(seed));
  const actions: Action[] = [];
  const hashes = [hashState(state)];
  while (state.phase !== 'ended') {
    if (actions.length >= STEP_LIMIT) throw new Error(`${seed}: no end after ${STEP_LIMIT} steps`);
    const before = JSON.stringify(state);
    const choices = legalActions(state);
    expect(choices.length).toBeGreaterThan(0);
    // Every listed action is accepted, and trying them all changes nothing.
    for (const action of choices) expect(applyAction(state, action).ok).toBe(true);
    expect(JSON.stringify(state)).toBe(before);

    const action = choices[nextInt(rng, choices.length)]!;
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(`${seed}: ${result.error.message}`);
    expect(JSON.stringify(state)).toBe(before);
    actions.push(action);
    state = deepFreeze(result.state);
    hashes.push(hashState(state));
  }
  return { actions, hashes, final: state };
}

/** Applies `actions` from a fresh test fight, recording the hash after each. */
function replay(seed: string, actions: readonly Action[]): string[] {
  let state = createTestFight(seed);
  const hashes = [hashState(state)];
  for (const action of actions) {
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(`replay ${seed}: ${result.error.message}`);
    state = result.state;
    hashes.push(hashState(state));
  }
  return hashes;
}

describe('random walks through the test fight', () => {
  it('end on every one of 50 seeds without changing an input, and replay to the same hashes', () => {
    const outcomes = new Set<string>();
    for (const seed of SEEDS) {
      const walk = randomWalk(seed);
      expect(walk.final.phase).toBe('ended');
      expect(legalActions(walk.final)).toEqual([]);
      outcomes.add(walk.final.outcome ?? 'none');

      const replayed = replay(seed, walk.actions);
      expect(replayed).toEqual(walk.hashes);
      expect(replayed.at(-1)).toBe(hashState(walk.final));
    }
    expect([...outcomes].every((outcome) => outcome === 'won' || outcome === 'lost')).toBe(true);
  }, 5000);

  it('are the same walk every time for the same seed', () => {
    const first = randomWalk(SEEDS[0]!);
    const second = randomWalk(SEEDS[0]!);
    expect(second.actions).toEqual(first.actions);
    expect(second.hashes).toEqual(first.hashes);
  });
});

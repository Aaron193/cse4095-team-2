// State hashing (task P1-B7): canonical JSON and hashState.
import { hashState } from '@daily-delve/shared';
import type { RunState } from '@daily-delve/shared';
import { describe, expect, it } from 'vitest';
import { canonicalJson, hashText } from '../src/engine/hash.ts';
import { deepFreeze } from './support.ts';

/**
 * A committed sample state: turn 2 of a test fight against the Gel Slime. SAMPLE_HASH is its
 * committed hash. If the hash of this object ever changes, every stored hash (replay
 * fixtures, saved games) changes with it, so that change needs its own pull request.
 */
const SAMPLE: RunState = {
  engineVersion: '0.3.0',
  seed: 'sample-seed',
  phase: 'combat',
  outcome: null,
  dungeon: {
    seed: 'sample-seed',
    width: 3,
    height: 3,
    tiles: ['###', '#.#', '###'],
    start: { x: 1, y: 1 },
    nodes: [{ id: 'n0', x: 1, y: 1, type: 'boss' }],
    encounters: { n0: ['gel-slime'] },
    rewards: {},
  },
  pos: { x: 1, y: 1 },
  cleared: [],
  openedGates: [],
  nodesCleared: 0,
  hp: 48,
  maxHp: 60,
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
  combat: {
    nodeId: 'n0',
    turn: 2,
    energy: 3,
    hand: ['nix', 'vex', 'pyra', 'kip', 'bryn'],
    drawPile: ['rook', 'bog-witch', 'brother-ash'],
    discardPile: ['halvard'],
    exhaustPile: ['sera'],
    enemies: [
      {
        defId: 'gel-slime',
        hp: 51,
        maxHp: 70,
        shield: 10,
        statuses: { Burn: 2, Chill: 0, Poison: 3 },
        strength: 0,
        intentIndex: 1,
        phase: 1,
      },
    ],
    player: { shield: 0, statuses: { Burn: 0, Chill: 1, Poison: 0 }, powers: [] },
    tagsPlayedThisTurn: { Fire: 0, Frost: 0, Poison: 0 },
    rng: { a: 2654435769, b: 1013904242, c: 3668340011, d: 2773480762 },
  },
  rewardOffers: null,
  stats: { turns: 2, comboTriggers: 1, steps: 0 },
};
const SAMPLE_HASH = 'a9c1f3dae631de95';

/** A copy of `value` with every object's keys inserted in reverse order. */
function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value === null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).reverse()) {
    out[key] = reverseKeys((value as Record<string, unknown>)[key]);
  }
  return out;
}

describe('canonicalJson', () => {
  it('sorts the keys of every object and leaves out whitespace', () => {
    const value = { b: [3, 1, 2], a: { z: null, y: true, x: 'Fire "hot"' }, c: -7 };
    expect(canonicalJson(value)).toBe(
      '{"a":{"x":"Fire \\"hot\\"","y":true,"z":null},"b":[3,1,2],"c":-7}',
    );
  });

  it('sorts keys by UTF-16 code unit, not by locale', () => {
    expect(canonicalJson({ b: 1, B: 2, a: 3, _: 4 })).toBe('{"B":2,"_":4,"a":3,"b":1}');
  });

  it('keeps array order, and arrays of objects are sorted inside', () => {
    expect(canonicalJson([{ y: 1, x: 2 }, 'b', 'a'])).toBe('[{"x":2,"y":1},"b","a"]');
  });

  it('parses back to the same value', () => {
    expect(JSON.parse(canonicalJson(SAMPLE))).toEqual(SAMPLE);
  });

  it('treats undefined as JSON.stringify does', () => {
    expect(canonicalJson({ a: undefined, b: 1 })).toBe('{"b":1}');
    expect(canonicalJson([undefined, 1])).toBe('[null,1]');
  });

  it('refuses a value that has no JSON form', () => {
    expect(() => canonicalJson(undefined)).toThrow(TypeError);
    expect(() => canonicalJson(() => 1)).toThrow(TypeError);
  });
});

describe('hashState', () => {
  it('gives the committed hash for the committed sample', () => {
    expect(hashState(SAMPLE)).toBe(SAMPLE_HASH);
  });

  it('is 16 lowercase hex digits', () => {
    expect(hashState(SAMPLE)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('does not depend on key order', () => {
    const reordered = reverseKeys(SAMPLE) as RunState;
    expect(JSON.stringify(reordered)).not.toBe(JSON.stringify(SAMPLE));
    expect(hashState(reordered)).toBe(SAMPLE_HASH);
  });

  const changes: [string, (state: RunState) => void][] = [
    ['HP', (state) => (state.hp -= 1)],
    ['a status deep inside', (state) => (state.combat!.enemies[0]!.statuses.Poison += 1)],
    ['the order of the hand', (state) => state.combat!.hand.reverse()],
    ['one bit of the rng state', (state) => (state.combat!.rng.d ^= 1)],
    ['a string', (state) => (state.seed = 'sample-seee')],
    ['null to a value', (state) => (state.outcome = 'won')],
    ['an empty list to a non-empty one', (state) => state.cleared.push('n0')],
    [
      'a card moved between piles',
      (state) => state.combat!.discardPile.push(state.combat!.hand.pop()!),
    ],
  ];

  it.each(changes)('changes when %s changes', (_name, change) => {
    const changed = structuredClone(SAMPLE);
    change(changed);
    expect(hashState(changed)).not.toBe(SAMPLE_HASH);
  });

  it('tells apart thousands of states that differ in one number', () => {
    const hashes = new Set<string>();
    for (let hp = 0; hp < 5000; hp++) hashes.add(hashState({ ...SAMPLE, hp }));
    expect(hashes.size).toBe(5000);
  });

  it('never changes its input', () => {
    const frozen = deepFreeze(structuredClone(SAMPLE));
    expect(hashState(frozen)).toBe(SAMPLE_HASH);
    expect(frozen).toEqual(SAMPLE);
  });
});

describe('hashText', () => {
  it('gives committed values', () => {
    expect(hashText('')).toBe('488bdcb81aee8d83');
    expect(hashText('a')).toBe('501c2ba782c97901');
    expect(hashText('b')).toBe('459eda5bc254d2bf');
  });
});

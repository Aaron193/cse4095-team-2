import { describe, expect, it } from 'vitest';
import { createRng, nextInt, nextU32, pick, shuffle } from '@daily-delve/shared';
import type { RngState } from '@daily-delve/shared';

function take(rng: RngState, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(nextU32(rng));
  return out;
}

// Known-answer table. These values are part of the engine's contract: the browser and the
// server must both produce them. If this table has to change, ENGINE_VERSION changes too.
const KNOWN: { seed: string; stream: string; state: RngState; u32: number[] }[] = [
  {
    seed: 'selfcheck',
    stream: 'health',
    state: { a: 2581809148, b: 2819420493, c: 562814905, d: 1533758099 },
    u32: [
      2640020444, 833560394, 3252999059, 1434178197, 390000499, 419666460, 3851568208, 3413255368,
    ],
  },
  {
    seed: '2026-11-10',
    stream: 'map',
    state: { a: 3297620059, b: 1312639546, c: 3809544059, d: 751059840 },
    u32: [
      1066352149, 1987566451, 3490805073, 973798703, 1745274521, 906309919, 90973107, 2570625218,
    ],
  },
  {
    seed: 'a3f9c2d4e5b60718',
    stream: 'shuffle:f1n0',
    state: { a: 540317818, b: 41803862, c: 3270948484, d: 1058435519 },
    u32: [
      1640557199, 473938698, 3745727199, 2486555604, 3263437381, 4231012692, 1794807752,
      2562920788,
    ],
  },
];

describe('rng known answers', () => {
  it.each(KNOWN)('createRng($seed, $stream) matches the committed table', (row) => {
    const rng = createRng(row.seed, row.stream);
    expect(rng).toEqual(row.state);
    expect(take(rng, row.u32.length)).toEqual(row.u32);
  });

  it('gives the R5 health-check numbers', () => {
    const rng = createRng('selfcheck', 'health');
    const values = [0, 1, 2, 3, 4].map(() => nextInt(rng, 1000));
    expect(values).toEqual([444, 394, 59, 197, 499]);
  });

  it('gives a committed shuffle', () => {
    const rng = createRng('selfcheck', 'shuffle:f1n0');
    expect(shuffle(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([7, 4, 3, 9, 8, 5, 2, 6, 1, 0]);
  });
});

describe('rng streams', () => {
  it('is repeatable for the same seed and stream', () => {
    expect(take(createRng('seed', 'map'), 20)).toEqual(take(createRng('seed', 'map'), 20));
  });

  it('differs by seed and by stream', () => {
    const base = take(createRng('seed', 'map'), 8);
    expect(take(createRng('seed2', 'map'), 8)).not.toEqual(base);
    expect(take(createRng('seed', 'rewards:f1n0'), 8)).not.toEqual(base);
  });

  it('does not confuse where the seed ends and the stream begins', () => {
    expect(createRng('ab', 'c')).not.toEqual(createRng('a', 'bc'));
  });

  it('drawing from one stream never changes another', () => {
    const expected = take(createRng('seed', 'map'), 10);

    const map = createRng('seed', 'map');
    const shuffleStream = createRng('seed', 'shuffle:f1n0');
    const rewards = createRng('seed', 'rewards:f1n0');
    const interleaved: number[] = [];
    for (let i = 0; i < 10; i++) {
      take(shuffleStream, i + 1);
      shuffle(rewards, [1, 2, 3, 4, 5]);
      interleaved.push(nextU32(map));
      nextInt(shuffleStream, 7);
    }
    expect(interleaved).toEqual(expected);
  });

  it('keeps its state as plain JSON that can be saved and resumed', () => {
    const rng = createRng('seed', 'map');
    take(rng, 5);
    const saved = JSON.parse(JSON.stringify(rng)) as RngState;
    expect(saved).toEqual(rng);
    expect(take(saved, 10)).toEqual(take(rng, 10));
  });

  it('keeps every state field an unsigned 32-bit integer', () => {
    const rng = createRng('seed', 'map');
    for (let i = 0; i < 1000; i++) {
      nextU32(rng);
      for (const v of [rng.a, rng.b, rng.c, rng.d]) {
        expect(Number.isInteger(v) && v >= 0 && v <= 0xffffffff).toBe(true);
      }
    }
  });
});

describe('nextU32', () => {
  it('returns unsigned 32-bit integers', () => {
    const rng = createRng('range', 'u32');
    for (const v of take(rng, 5000)) {
      expect(Number.isInteger(v) && v >= 0 && v <= 0xffffffff).toBe(true);
    }
  });
});

describe('nextInt', () => {
  it.each([1, 2, 3, 6, 7, 10, 100, 1000, 65536, 4294967295, 4294967296])(
    'stays in [0, %i)',
    (n) => {
      const rng = createRng('range', `int:${n}`);
      for (let i = 0; i < 2000; i++) {
        const v = nextInt(rng, n);
        expect(Number.isInteger(v) && v >= 0 && v < n).toBe(true);
      }
    },
  );

  it('always returns 0 when n is 1', () => {
    const rng = createRng('range', 'one');
    for (let i = 0; i < 50; i++) expect(nextInt(rng, 1)).toBe(0);
  });

  it('reaches every value and is roughly even', () => {
    const rng = createRng('range', 'spread');
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 60000; i++) counts[nextInt(rng, 6)]!++;
    for (const c of counts) {
      expect(c).toBeGreaterThan(9500);
      expect(c).toBeLessThan(10500);
    }
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 4294967297])('rejects n = %s', (n) => {
    expect(() => nextInt(createRng('range', 'bad'), n)).toThrow(RangeError);
  });
});

describe('shuffle', () => {
  it('returns a permutation and leaves the input unchanged', () => {
    const input = Object.freeze(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    const out = shuffle(createRng('deck', 'shuffle:f1n0'), input);
    expect(out).not.toBe(input);
    expect(out.slice().sort()).toEqual(input.slice().sort());
    expect(input).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  });

  it('gives different orders for different node streams', () => {
    const deck = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const one = shuffle(createRng('deck', 'shuffle:f1n0'), deck);
    const two = shuffle(createRng('deck', 'shuffle:f1n1'), deck);
    expect(one).not.toEqual(two);
  });

  it('handles empty and single-element arrays without drawing', () => {
    const rng = createRng('deck', 'tiny');
    const before = { ...rng };
    expect(shuffle(rng, [])).toEqual([]);
    expect(shuffle(rng, ['x'])).toEqual(['x']);
    expect(rng).toEqual(before);
  });
});

describe('pick', () => {
  it('returns elements of the array and reaches all of them', () => {
    const rng = createRng('pick', 'p');
    const options = ['fight', 'elite', 'shrine'];
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const v = pick(rng, options);
      expect(options).toContain(v);
      seen.add(v);
    }
    expect(seen.size).toBe(3);
  });

  it('rejects an empty array', () => {
    expect(() => pick(createRng('pick', 'empty'), [])).toThrow(RangeError);
  });
});

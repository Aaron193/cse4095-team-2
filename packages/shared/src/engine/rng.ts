// Seeded random numbers for the engine (TODO.md, Reference R2 rule 4).
//
// A stream is createRng(seed, streamName). Its state is four unsigned 32-bit integers, so it
// can be stored in the game state as plain JSON. Each system owns its own stream, so drawing
// from one stream never changes what another produces.
//
// The functions below ADVANCE THE STATE OBJECT THEY ARE GIVEN. Engine code that must not
// change its input (R2 rule 6) copies the game state first and passes the copy's rng.
//
// Generator: sfc32. Seeding: an xmur3-style string hash. Integer math only.

/** Plain-JSON generator state: four unsigned 32-bit integers. */
export interface RngState {
  a: number;
  b: number;
  c: number;
  d: number;
}

const U32_RANGE = 4294967296; // 2^32
const WARMUP_ROUNDS = 15;

/** Returns a function producing successive 32-bit hashes of `text`. */
function stringHasher(text: string): () => number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/**
 * Creates the stream `stream` of the seed `seed`.
 * The seed's length is mixed in so ('ab', 'c') and ('a', 'bc') are different streams.
 */
export function createRng(seed: string, stream: string): RngState {
  const next = stringHasher(`${seed.length}:${seed}${stream}`);
  const rng: RngState = { a: next(), b: next(), c: next(), d: next() };
  for (let i = 0; i < WARMUP_ROUNDS; i++) nextU32(rng);
  return rng;
}

/** Advances `rng` and returns an integer in [0, 2^32). */
export function nextU32(rng: RngState): number {
  const t = (((rng.a + rng.b) | 0) + rng.d) | 0;
  const b = rng.b | 0;
  const c = rng.c | 0;
  rng.d = (rng.d + 1) >>> 0;
  rng.a = (b ^ (b >>> 9)) >>> 0;
  rng.b = (c + (c << 3)) >>> 0;
  rng.c = ((((c << 21) | (c >>> 11)) + t) | 0) >>> 0;
  return t >>> 0;
}

/**
 * Advances `rng` and returns an integer in [0, n), every value equally likely.
 * `n` must be an integer from 1 to 2^32.
 */
export function nextInt(rng: RngState, n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > U32_RANGE) {
    throw new RangeError(`nextInt: n must be an integer from 1 to 2^32, got ${n}`);
  }
  // Reject the top partial bucket so the result has no modulo bias.
  const limit = U32_RANGE - (U32_RANGE % n);
  let value = nextU32(rng);
  while (value >= limit) value = nextU32(rng);
  return value % n;
}

/** Advances `rng` and returns a shuffled copy of `array`. The input array is not changed. */
export function shuffle<T>(rng: RngState, array: readonly T[]): T[] {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = nextInt(rng, i + 1);
    const atI = out[i] as T;
    out[i] = out[j] as T;
    out[j] = atI;
  }
  return out;
}

/** Advances `rng` and returns one element of `array`, which must not be empty. */
export function pick<T>(rng: RngState, array: readonly T[]): T {
  if (array.length === 0) throw new RangeError('pick: array is empty');
  return array[nextInt(rng, array.length)] as T;
}

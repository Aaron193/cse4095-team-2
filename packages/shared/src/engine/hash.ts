// State hashing (task P1-B7). Two states with the same content always give the same hash, in
// every JavaScript engine: the state is written as canonical JSON, then hashed with 32-bit
// integer arithmetic only (Math.imul and shifts), so no platform detail can change the result.
import type { RunState } from './types.ts';

/**
 * JSON with every object's keys in sorted order and no whitespace. Otherwise it is exactly
 * `JSON.stringify`: strings are escaped the same way, array order is kept, and an object
 * property whose value is `undefined` is left out (R2 rule 5 keeps those out of game state).
 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    const items = value.map((item) => (item === undefined ? 'null' : canonicalJson(item)));
    return `[${items.join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    // Keys of one object are all different, so this comparator never returns 0 (R2 rule 8).
    const keys = Object.keys(record).sort((a, b) => (a < b ? -1 : 1));
    const fields: string[] = [];
    for (const key of keys) {
      const field = record[key];
      if (field !== undefined) fields.push(`${JSON.stringify(key)}:${canonicalJson(field)}`);
    }
    return `{${fields.join(',')}}`;
  }
  const text = JSON.stringify(value) as string | undefined;
  if (text === undefined) throw new TypeError(`canonicalJson: ${typeof value} is not JSON`);
  return text;
}

/** Eight lowercase hex digits for an unsigned 32-bit integer. */
function hex32(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0');
}

/**
 * A 64-bit hash of a string, as 16 hex digits: two 32-bit multiply-xor lanes over its UTF-16
 * code units, each mixed with the other at the end (the cyrb53 construction, keeping all 64
 * bits). Not cryptographic: it tells states apart, it does not defend against forgery.
 */
export function hashText(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x9e3779b1);
    h2 = Math.imul(h2 ^ code, 0x5f356495);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 0x85ebca6b) ^ Math.imul(h2 ^ (h2 >>> 13), 0xc2b2ae35);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 0x85ebca6b) ^ Math.imul(h1 ^ (h1 >>> 13), 0xc2b2ae35);
  return hex32(h2) + hex32(h1);
}

/** Hex hash of the canonical JSON of a run state. */
export function hashState(state: RunState): string {
  return hashText(canonicalJson(state));
}

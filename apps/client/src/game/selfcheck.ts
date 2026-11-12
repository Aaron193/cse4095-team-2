import { createRng, nextInt } from '@daily-delve/shared';

/**
 * The same five numbers the server returns as `Health.rngCheck` (TODO.md, Reference R5),
 * computed here in the browser.
 */
export function browserRngCheck(): number[] {
  const rng = createRng('selfcheck', 'health');
  const values: number[] = [];
  for (let i = 0; i < 5; i++) values.push(nextInt(rng, 1000));
  return values;
}

export function sameNumbers(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

// The number pipeline (task P1-A1; TODO.md, Reference R2 rule 7 and R3 "Attack damage").
//
// Every change to a game number goes through this file, in one order: additive changes,
// then multiplicative changes (integer percent, floored at once), then caps, then the floor
// of 0. Rule code never does this arithmetic itself, so a combo always resolves the same way.

/** What one hit of damage is made of, before it meets Shield. */
export interface DamageInput {
  /** The number printed on the card or the intent. */
  base: number;
  /** Additive changes, applied first and in order: tag bonus, power bonus, strength, minus Chill. */
  add?: readonly number[];
  /** Multiplicative changes in integer percent (150 means times 1.5), each floored at once. */
  percent?: readonly number[];
  /** An upper limit, applied after the multiplicative changes. */
  cap?: number;
}

/** The damage of one hit: base, plus additive, times multiplicative, capped, never below 0. */
export function computeDamage(input: DamageInput): number {
  let value = input.base;
  for (const change of input.add ?? []) value += change;
  for (const percent of input.percent ?? []) value = Math.floor((value * percent) / 100);
  if (input.cap !== undefined) value = Math.min(value, input.cap);
  return Math.max(0, value);
}

/** Anything that can be hit: a player or an enemy. */
export interface Damageable {
  hp: number;
  shield: number;
}

/** A unit after a hit, and where the damage went. */
export interface DamageResult {
  hp: number;
  shield: number;
  /** Damage Shield absorbed. */
  blocked: number;
  /** HP actually lost. */
  hpLost: number;
}

export interface ApplyDamageOptions {
  /** Poison: the damage skips Shield and goes straight to HP. */
  ignoreShield?: boolean;
}

/** Removes Shield first, then HP. Neither goes below 0. Does not change `unit`. */
export function applyDamage(
  unit: Damageable,
  amount: number,
  options: ApplyDamageOptions = {},
): DamageResult {
  const incoming = Math.max(0, amount);
  const blocked = options.ignoreShield ? 0 : Math.min(unit.shield, incoming);
  const hpLost = Math.min(unit.hp, incoming - blocked);
  return { hp: unit.hp - hpLost, shield: unit.shield - blocked, blocked, hpLost };
}

/** Adds `amount` to `value`, then applies the cap and the floor of 0 (Shield, statuses, energy). */
export function addCapped(value: number, amount: number, cap: number): number {
  return Math.max(0, Math.min(cap, value + amount));
}

/** The damage a Shatter deals: `perStack` for each stack of Chill it removed. */
export function shatterDamage(perStack: number, stacks: number): number {
  return computeDamage({ base: perStack * stacks });
}

/** Burn after it ticks: halved, rounded down (R3, Statuses). */
export function burnAfterTick(burn: number): number {
  return Math.floor(burn / 2);
}

/** Poison or Chill after it ticks: one less, not below 0 (R3, Statuses). */
export function decayByOne(stacks: number): number {
  return Math.max(0, stacks - 1);
}

/** `percent` of `value`, rounded down (R2 rule 3). */
export function percentOf(value: number, percent: number): number {
  return Math.floor((value * percent) / 100);
}

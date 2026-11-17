// The number pipeline (task P1-A1). calc.ts is engine-internal, so it is imported by path.
import { describe, expect, it } from 'vitest';
import {
  addCapped,
  applyDamage,
  burnAfterTick,
  computeDamage,
  decayByOne,
  percentOf,
  shatterDamage,
} from '../src/engine/calc.ts';
import type { DamageInput } from '../src/engine/calc.ts';

describe('computeDamage: additive, then multiplicative, then caps and the floor of 0', () => {
  const cases: [name: string, input: DamageInput, expected: number][] = [
    ['base only', { base: 6 }, 6],
    ['base 4, plus 3, times 150 percent gives 10', { base: 4, add: [3], percent: [150] }, 10],
    // If the percent applied first it would be floor(4 * 1.5) + 3 = 9, not 10.
    ['adds before it multiplies', { base: 4, add: [3], percent: [150] }, 10],
    ['several additive changes in order', { base: 5, add: [3, 2, -1] }, 9],
    ['minus Chill', { base: 6, add: [-2] }, 4],
    ['floors a fractional percent at once', { base: 5, percent: [150] }, 7],
    ['applies several percents in order, each floored', { base: 5, percent: [150, 150] }, 10],
    ['percent below 100', { base: 9, percent: [50] }, 4],
    ['caps after the multiplier', { base: 10, add: [10], percent: [200], cap: 25 }, 25],
    ['a cap above the value does nothing', { base: 7, cap: 99 }, 7],
    ['never below 0 from additive changes', { base: 3, add: [-5] }, 0],
    ['never below 0 after a multiplier', { base: 2, add: [-5], percent: [150] }, 0],
    ['zero base stays zero', { base: 0, add: [], percent: [] }, 0],
  ];

  it.each(cases)('%s', (_name, input, expected) => {
    expect(computeDamage(input)).toBe(expected);
  });

  it('always returns an integer', () => {
    for (let base = 0; base < 30; base++) {
      for (const percent of [33, 50, 75, 125, 150, 175]) {
        expect(Number.isInteger(computeDamage({ base, add: [1], percent: [percent] }))).toBe(true);
      }
    }
  });
});

describe('applyDamage: Shield before HP', () => {
  const cases: [
    name: string,
    unit: { hp: number; shield: number },
    amount: number,
    ignoreShield: boolean,
    expected: { hp: number; shield: number; blocked: number; hpLost: number },
  ][] = [
    ['no Shield', { hp: 20, shield: 0 }, 6, false, { hp: 14, shield: 0, blocked: 0, hpLost: 6 }],
    [
      'Shield absorbs all of it',
      { hp: 20, shield: 8 },
      6,
      false,
      { hp: 20, shield: 2, blocked: 6, hpLost: 0 },
    ],
    [
      'Shield absorbs part of it',
      { hp: 20, shield: 4 },
      6,
      false,
      { hp: 18, shield: 0, blocked: 4, hpLost: 2 },
    ],
    [
      'exactly the Shield',
      { hp: 20, shield: 6 },
      6,
      false,
      { hp: 20, shield: 0, blocked: 6, hpLost: 0 },
    ],
    [
      'ignoreShield goes straight to HP',
      { hp: 20, shield: 8 },
      6,
      true,
      { hp: 14, shield: 8, blocked: 0, hpLost: 6 },
    ],
    [
      'HP never below 0',
      { hp: 5, shield: 0 },
      12,
      false,
      { hp: 0, shield: 0, blocked: 0, hpLost: 5 },
    ],
    [
      'HP never below 0 through Shield',
      { hp: 5, shield: 3 },
      12,
      false,
      { hp: 0, shield: 0, blocked: 3, hpLost: 5 },
    ],
    [
      'HP never below 0 with ignoreShield',
      { hp: 2, shield: 9 },
      7,
      true,
      { hp: 0, shield: 9, blocked: 0, hpLost: 2 },
    ],
    ['zero damage', { hp: 10, shield: 2 }, 0, false, { hp: 10, shield: 2, blocked: 0, hpLost: 0 }],
    [
      'negative damage is treated as 0',
      { hp: 10, shield: 2 },
      -4,
      false,
      { hp: 10, shield: 2, blocked: 0, hpLost: 0 },
    ],
  ];

  it.each(cases)('%s', (_name, unit, amount, ignoreShield, expected) => {
    expect(applyDamage(unit, amount, { ignoreShield })).toEqual(expected);
  });

  it('does not change the unit it is given', () => {
    const unit = Object.freeze({ hp: 10, shield: 4 });
    applyDamage(unit, 6);
    expect(unit).toEqual({ hp: 10, shield: 4 });
  });
});

describe('capped gains and status decay', () => {
  it.each([
    [5, 4, 99, 9],
    [97, 4, 99, 99],
    [99, 1, 99, 99],
    [3, -5, 99, 0],
  ])('addCapped(%i, %i, cap %i) is %i', (value, amount, cap, expected) => {
    expect(addCapped(value, amount, cap)).toBe(expected);
  });

  it.each([
    [7, 3],
    [4, 2],
    [1, 0],
    [0, 0],
  ])('Burn %i becomes %i after it ticks', (burn, expected) => {
    expect(burnAfterTick(burn)).toBe(expected);
  });

  it.each([
    [3, 2],
    [1, 0],
    [0, 0],
  ])('Poison or Chill %i becomes %i after it ticks', (stacks, expected) => {
    expect(decayByOne(stacks)).toBe(expected);
  });

  it('Shatter deals its per-stack damage for each stack', () => {
    expect(shatterDamage(3, 4)).toBe(12);
    expect(shatterDamage(3, 0)).toBe(0);
  });

  it('percentages round down', () => {
    expect(percentOf(60, 30)).toBe(18);
    expect(percentOf(55, 30)).toBe(16);
  });
});

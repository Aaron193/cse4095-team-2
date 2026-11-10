// Checks content/balance.ts against the constants table in TODO.md, Reference R3 (task P0-A4).
// balance.ts is engine-internal, so this test imports it by path rather than from the package.
import { describe, expect, it } from 'vitest';
import * as balance from '../src/engine/content/balance.ts';

/** The R3 table, copied by hand. A change here is a contract change. */
const R3_TABLE: Record<string, number | boolean> = {
  PLAYER_MAX_HP: 60,
  HAND_SIZE: 5,
  MAX_HAND: 10,
  ENERGY_PER_TURN: 3,
  ENERGY_CAP: 9,
  STATUS_CAP: 30,
  SHIELD_CAP: 99,
  SHIELD_PERSISTS: false,
  FIGHT_TURN_CAP: 40,
  MIN_ROUTE_FIGHTS: 4,
  GATE_TAG_CARDS: 4,
  MIN_DECK_SIZE: 5,
  SHRINE_HEAL_PERCENT: 30,
  MAX_ACTIONS: 2000,
  SCORE_PER_NODE: 100,
  SCORE_CLEAR_BONUS: 300,
  SCORE_SPEED_BASE: 300,
  SCORE_SPEED_PER_TURN: 3,
  SCORE_PER_COMBO: 5,
  SCORE_STYLE_CAP: 150,
};

const exported = balance as Record<string, unknown>;

describe('balance constants (R3)', () => {
  it('exports exactly the names in the R3 table', () => {
    expect(Object.keys(exported).sort()).toEqual(Object.keys(R3_TABLE).sort());
  });

  it.each(Object.keys(exported))('%s is an integer or a boolean', (name) => {
    const value = exported[name];
    expect(typeof value === 'boolean' || Number.isInteger(value)).toBe(true);
  });

  it.each(Object.entries(R3_TABLE))('%s has the R3 default %s', (name, value) => {
    expect(exported[name]).toBe(value);
  });

  it('keeps the numbers consistent with each other', () => {
    expect(balance.HAND_SIZE).toBeLessThanOrEqual(balance.MAX_HAND);
    expect(balance.ENERGY_PER_TURN).toBeLessThanOrEqual(balance.ENERGY_CAP);
    expect(balance.SHRINE_HEAL_PERCENT).toBeGreaterThan(0);
    expect(balance.SHRINE_HEAL_PERCENT).toBeLessThanOrEqual(100);
    for (const [name, value] of Object.entries(exported)) {
      if (typeof value === 'number') expect(value, name).toBeGreaterThan(0);
    }
  });
});

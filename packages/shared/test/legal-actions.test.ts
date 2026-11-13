// Legal actions in combat (task P1-A8): legalActions lists exactly what applyAction accepts.
import type { Action, RunState } from '@daily-delve/shared';
import { describe, expect, it } from 'vitest';
import { applyActionWith, legalActionsWith } from '../src/engine/run.ts';
import { combatOf, deepFreeze, fight, TEST_DEFS } from './support.ts';

const legal = (state: RunState) => legalActionsWith(deepFreeze(state), TEST_DEFS);

/** Every playCard action with a hand index and target from one below to one past the ends. */
function candidates(state: RunState): Action[] {
  const combat = combatOf(state);
  const out: Action[] = [{ type: 'endTurn' }];
  for (let handIndex = -1; handIndex <= combat.hand.length; handIndex++) {
    out.push({ type: 'playCard', handIndex });
    for (let target = -1; target <= combat.enemies.length; target++) {
      out.push({ type: 'playCard', handIndex, target });
    }
  }
  return out;
}

describe('legalActions in combat', () => {
  it('lists each card that can be paid for, with each living target, then endTurn', () => {
    const state = fight({
      encounter: ['dummy', 'dummy', 'dummy'],
      combat: { hand: ['strike', 'guard', 'heavy', 'sweep'], energy: 2 },
    });
    combatOf(state).enemies[1]!.hp = 0;
    expect(legal(state)).toEqual([
      { type: 'playCard', handIndex: 0, target: 0 },
      { type: 'playCard', handIndex: 0, target: 2 },
      { type: 'playCard', handIndex: 1 },
      // heavy costs 3: not listed
      { type: 'playCard', handIndex: 3 },
      { type: 'endTurn' },
    ]);
  });

  it('lists a status card aimed at one enemy once per living enemy, and Shatter too', () => {
    const state = fight({ encounter: ['dummy', 'dummy'], combat: { hand: ['venom', 'shatter'] } });
    expect(legal(state)).toEqual([
      { type: 'playCard', handIndex: 0, target: 0 },
      { type: 'playCard', handIndex: 0, target: 1 },
      { type: 'playCard', handIndex: 1, target: 0 },
      { type: 'playCard', handIndex: 1, target: 1 },
      { type: 'endTurn' },
    ]);
  });

  it('lists only free cards with no energy left, and only endTurn with an empty hand', () => {
    const broke = fight({ combat: { hand: ['strike', 'surge', 'selfBurn'], energy: 0 } });
    expect(legal(broke)).toEqual([
      { type: 'playCard', handIndex: 1 },
      { type: 'playCard', handIndex: 2 },
      { type: 'endTurn' },
    ]);
    expect(legal(fight({ combat: { hand: [] } }))).toEqual([{ type: 'endTurn' }]);
  });

  it('lists the same card twice when two copies are in hand', () => {
    const state = fight({ combat: { hand: ['guard', 'guard'] } });
    expect(legal(state)).toEqual([
      { type: 'playCard', handIndex: 0 },
      { type: 'playCard', handIndex: 1 },
      { type: 'endTurn' },
    ]);
  });

  const states: [string, () => RunState][] = [
    ['an opening hand', () => fight({ encounter: ['dummy', 'brute'] })],
    [
      'a mixed hand with a defeated enemy and little energy',
      () => {
        const state = fight({
          encounter: ['dummy', 'weakling', 'brute'],
          combat: { hand: ['strike', 'sweep', 'venom', 'heavy', 'insight', 'shatter'], energy: 1 },
        });
        combatOf(state).enemies[1]!.hp = 0;
        return state;
      },
    ],
    [
      'a full hand of free cards',
      () => fight({ combat: { hand: ['surge', 'kindle', 'spark', 'bulwark'] } }),
    ],
  ];

  it.each(states)('agrees with applyAction on every candidate action: %s', (_name, make) => {
    const state = deepFreeze(make());
    const listed = legal(state).map((action) => JSON.stringify(action));
    const accepted = candidates(state)
      .filter((action) => applyActionWith(state, action, TEST_DEFS).ok)
      .map((action) => JSON.stringify(action));
    expect(listed.slice().sort()).toEqual(accepted.slice().sort());
    expect(new Set(listed).size).toBe(listed.length);
  });
});

describe('legalActions outside combat', () => {
  it('is empty once the run has ended', () => {
    const won = fight({ nodeId: 'n1', encounter: ['weakling'], combat: { hand: ['strike'] } });
    const result = applyActionWith(won, { type: 'playCard', handIndex: 0, target: 0 }, TEST_DEFS);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.state.phase).toBe('ended');
    expect(legal(result.state)).toEqual([]);
  });

  it('is not written yet for the map, reward, and shrine phases (tasks P2-A3 to P2-A5)', () => {
    for (const phase of ['map', 'reward', 'shrine'] as const) {
      expect(() => legal({ ...fight(), phase, combat: null })).toThrow('not implemented');
    }
  });
});

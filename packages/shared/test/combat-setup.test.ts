// Combat setup and drawing (task P1-A2).
import { createRng, shuffle } from '@daily-delve/shared';
import type { CombatState, RunState } from '@daily-delve/shared';
import { describe, expect, it } from 'vitest';
import { drawCards, startCombat } from '../src/engine/combat.ts';
import { ENERGY_PER_TURN, HAND_SIZE, MAX_HAND } from '../src/engine/content/balance.ts';
import { makeRun, TEST_DEFS } from './support.ts';

/** Ten different cards, so the order of the draw pile is visible. */
const DECK = [
  'strike',
  'twinStrike',
  'sweep',
  'heavy',
  'guard',
  'bulwark',
  'insight',
  'surge',
  'ignite',
  'venom',
];

function fightAt(nodeId: string, seed = 'seed-a'): RunState {
  const state = makeRun({ seed, deck: DECK.slice() });
  startCombat(state, nodeId, TEST_DEFS);
  return state;
}

function combatOf(state: RunState): CombatState {
  if (!state.combat) throw new Error('expected a fight');
  return state.combat;
}

/** Every card the fight holds, in pile order. */
function allCards(combat: CombatState): string[] {
  return [...combat.hand, ...combat.drawPile, ...combat.discardPile, ...combat.exhaustPile];
}

describe('startCombat', () => {
  it('gives the same opening hand and draw pile for the same seed', () => {
    const one = combatOf(fightAt('n0'));
    const two = combatOf(fightAt('n0'));
    expect(two.hand).toEqual(one.hand);
    expect(two.drawPile).toEqual(one.drawPile);
  });

  it('gives a different order for a different node ID', () => {
    const n0 = combatOf(fightAt('n0'));
    const n1 = combatOf(fightAt('n1'));
    expect(allCards(n1)).not.toEqual(allCards(n0));
    expect(allCards(n1).sort()).toEqual(allCards(n0).sort());
  });

  it('gives a different order for a different seed', () => {
    expect(allCards(combatOf(fightAt('n0', 'seed-b')))).not.toEqual(
      allCards(combatOf(fightAt('n0', 'seed-a'))),
    );
  });

  it('shuffles the deck with the stream shuffle:<nodeId>', () => {
    const expected = shuffle(createRng('seed-a', 'shuffle:n0'), DECK);
    const combat = combatOf(fightAt('n0'));
    expect(allCards(combat)).toEqual(expected);
  });

  it('starts turn 1 with HAND_SIZE cards and ENERGY_PER_TURN energy', () => {
    const state = fightAt('n0');
    const combat = combatOf(state);
    expect(state.phase).toBe('combat');
    expect(combat.turn).toBe(1);
    expect(state.stats.turns).toBe(1);
    expect(combat.hand).toHaveLength(HAND_SIZE);
    expect(combat.drawPile).toHaveLength(DECK.length - HAND_SIZE);
    expect(combat.energy).toBe(ENERGY_PER_TURN);
    expect(combat.discardPile).toEqual([]);
    expect(combat.exhaustPile).toEqual([]);
    expect(combat.tagsPlayedThisTurn).toEqual({ Fire: 0, Frost: 0, Poison: 0 });
    expect(combat.player).toEqual({
      shield: 0,
      statuses: { Burn: 0, Chill: 0, Poison: 0 },
      powers: [],
    });
  });

  it('builds the enemies from their definitions, showing their first intent', () => {
    const state = makeRun({
      dungeon: { ...makeRun().dungeon, encounters: { n0: ['dummy', 'brute'] } },
    });
    startCombat(state, 'n0', TEST_DEFS);
    expect(combatOf(state).enemies).toEqual([
      {
        defId: 'dummy',
        hp: 30,
        maxHp: 30,
        shield: 0,
        statuses: { Burn: 0, Chill: 0, Poison: 0 },
        strength: 0,
        intentIndex: 0,
        phase: 1,
      },
      {
        defId: 'brute',
        hp: 50,
        maxHp: 50,
        shield: 0,
        statuses: { Burn: 0, Chill: 0, Poison: 0 },
        strength: 0,
        intentIndex: 0,
        phase: 1,
      },
    ]);
  });

  it('stores the shuffle stream as plain JSON numbers in the state', () => {
    const combat = combatOf(fightAt('n0'));
    expect(Object.keys(combat.rng).sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(JSON.parse(JSON.stringify(combat.rng))).toEqual(combat.rng);
  });

  it('refuses a node with no encounter', () => {
    expect(() => startCombat(makeRun(), 'n9', TEST_DEFS)).toThrow('no encounter');
  });
});

describe('drawCards', () => {
  function combatWith(piles: Partial<CombatState>): CombatState {
    const combat = combatOf(fightAt('n0'));
    return { ...combat, hand: [], drawPile: [], discardPile: [], ...piles };
  }

  it('draws from the top of the draw pile', () => {
    const combat = combatWith({ drawPile: ['a', 'b', 'c'] });
    expect(drawCards(combat, 2)).toBe(2);
    expect(combat.hand).toEqual(['a', 'b']);
    expect(combat.drawPile).toEqual(['c']);
  });

  it('reshuffles the discard pile when the draw pile is empty', () => {
    const discard = ['a', 'b', 'c', 'd', 'e', 'f'];
    const combat = combatWith({ drawPile: [], discardPile: discard.slice() });
    const expectedOrder = shuffle({ ...combat.rng }, discard);

    expect(drawCards(combat, 5)).toBe(5);
    expect(combat.hand).toEqual(expectedOrder.slice(0, 5));
    expect(combat.drawPile).toEqual(expectedOrder.slice(5));
    expect(combat.discardPile).toEqual([]);
  });

  it('reshuffles in the middle of a draw', () => {
    const combat = combatWith({ drawPile: ['x', 'y'], discardPile: ['a', 'b', 'c'] });
    expect(drawCards(combat, 4)).toBe(4);
    expect(combat.hand.slice(0, 2)).toEqual(['x', 'y']);
    expect([...combat.hand.slice(2), ...combat.drawPile].sort()).toEqual(['a', 'b', 'c']);
    expect(combat.discardPile).toEqual([]);
  });

  it('reshuffles the same way every time for the same state', () => {
    const one = combatWith({ discardPile: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] });
    const two = combatWith({ discardPile: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] });
    drawCards(one, 3);
    drawCards(two, 3);
    expect(two.hand).toEqual(one.hand);
    expect(two.rng).toEqual(one.rng);
  });

  it('stops when both piles are empty', () => {
    const combat = combatWith({ drawPile: ['a'], discardPile: [] });
    expect(drawCards(combat, 5)).toBe(1);
    expect(combat.hand).toEqual(['a']);
  });

  it('stops when the hand holds MAX_HAND cards', () => {
    const hand = Array.from({ length: MAX_HAND - 1 }, (_, i) => `h${i}`);
    const combat = combatWith({ hand, drawPile: ['a', 'b', 'c'] });
    expect(drawCards(combat, 3)).toBe(1);
    expect(combat.hand).toHaveLength(MAX_HAND);
    expect(combat.drawPile).toEqual(['b', 'c']);
  });
});

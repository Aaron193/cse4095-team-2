// The test fight (task P1-A7): createTestFight, and a scripted win with legal actions only.
import { applyAction, CARDS, createTestFight, ENEMIES } from '@daily-delve/shared';
import type { Action, RunState } from '@daily-delve/shared';
import { describe, expect, it } from 'vitest';
import { needsTarget } from '../src/engine/combat.ts';
import { ENERGY_PER_TURN, HAND_SIZE, PLAYER_MAX_HP } from '../src/engine/content/balance.ts';
import { STARTER_DECK } from '../src/engine/content/cards.ts';
import { TEST_FIGHT_ENEMIES } from '../src/engine/content/enemies.ts';
import { deepFreeze } from './support.ts';

const enemyOf = (state: RunState) => state.combat!.enemies[0]!;

/** The first of seed-0, seed-1, ... whose test fight is against `enemyId`. */
function seedFor(enemyId: string): string {
  for (let i = 0; i < 1000; i++) {
    const seed = `seed-${i}`;
    if (enemyOf(createTestFight(seed)).defId === enemyId) return seed;
  }
  throw new Error(`no seed picks ${enemyId}`);
}

describe('createTestFight', () => {
  it('is a new run in combat at turn 1 against one enemy, at full HP', () => {
    const state = createTestFight('2026-11-12');
    expect(state).toMatchObject({
      seed: '2026-11-12',
      phase: 'combat',
      outcome: null,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      nodesCleared: 0,
      cleared: [],
      openedGates: [],
      rewardOffers: null,
      stats: { turns: 1, comboTriggers: 0, steps: 0 },
    });
    expect(state.deck).toEqual(STARTER_DECK);

    const combat = state.combat!;
    expect(combat).toMatchObject({ nodeId: 'n0', turn: 1, energy: ENERGY_PER_TURN });
    expect(combat.hand).toHaveLength(HAND_SIZE);
    expect([...combat.hand, ...combat.drawPile].sort()).toEqual([...STARTER_DECK].sort());
    expect(combat.enemies).toHaveLength(1);
    expect(TEST_FIGHT_ENEMIES).toContain(enemyOf(state).defId);
    expect(enemyOf(state).hp).toBe(ENEMIES[enemyOf(state).defId]!.maxHp);
  });

  it('stands the player on a single boss site, so winning wins the run', () => {
    const state = createTestFight('site');
    expect(state.dungeon.nodes).toEqual([{ id: 'n0', x: 1, y: 1, type: 'boss' }]);
    expect(state.pos).toEqual(state.dungeon.start);
    expect(state.dungeon.encounters.n0).toEqual([enemyOf(state).defId]);
  });

  it('gives the same state for the same seed, as plain JSON', () => {
    const state = createTestFight('same');
    expect(createTestFight('same')).toEqual(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('picks the enemy and shuffles the deck by seed', () => {
    const fights = Array.from({ length: 24 }, (_, i) => createTestFight(`seed-${i}`));
    const enemies = new Set(fights.map((state) => enemyOf(state).defId));
    expect([...enemies].sort()).toEqual([...TEST_FIGHT_ENEMIES].sort());
    const hands = new Set(fights.map((state) => state.combat!.hand.join(',')));
    expect(hands.size).toBeGreaterThan(12);
  });
});

/** A plain script: play the first card in hand that can be paid for, aimed at the first
 * living enemy when it needs a target; with none left, end the turn. */
function scriptedAction(state: RunState): Action {
  const combat = state.combat!;
  const target = combat.enemies.findIndex((enemy) => enemy.hp > 0);
  const handIndex = combat.hand.findIndex((id) => CARDS[id]!.cost <= combat.energy);
  if (handIndex === -1) return { type: 'endTurn' };
  return needsTarget(CARDS[combat.hand[handIndex]!]!)
    ? { type: 'playCard', handIndex, target }
    : { type: 'playCard', handIndex };
}

describe('the test fight, played by a script', () => {
  it.each(TEST_FIGHT_ENEMIES)('is won against %s with legal actions only', (enemyId) => {
    let state = createTestFight(seedFor(enemyId));
    const actions: Action[] = [];
    while (state.phase === 'combat') {
      const action = scriptedAction(state);
      const result = applyAction(deepFreeze(state), action);
      if (!result.ok) throw new Error(`refused ${JSON.stringify(action)}: ${result.error.message}`);
      actions.push(action);
      state = result.state;
      expect(actions.length).toBeLessThan(200);
    }
    expect(state).toMatchObject({ phase: 'ended', outcome: 'won', nodesCleared: 1 });
    expect(state.cleared).toEqual(['n0']);
    expect(enemyOf(state).hp).toBe(0);
    expect(state.hp).toBeGreaterThan(0);
    expect(actions.filter((action) => action.type === 'endTurn').length).toBeGreaterThan(0);
  });
});

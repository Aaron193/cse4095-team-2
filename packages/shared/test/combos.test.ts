// Tag synergy, Exhaust, and combo triggers (task P1-A6; TODO.md, Reference R3).
import type { RunState } from '@daily-delve/shared';
import { describe, expect, it } from 'vitest';
import { startCombat } from '../src/engine/combat.ts';
import { combatOf, endTurn, fight, playId, TEST_DEFS } from './support.ts';

const enemy = (state: RunState, index = 0) => combatOf(state).enemies[index]!;

/** Plays a card and returns the new state and the HP the first enemy lost to it. */
function hitWith(state: RunState, cardId: string, target?: number): [RunState, number] {
  const before = enemy(state).hp;
  const next = playId(state, cardId, target);
  return [next, before - enemy(next).hp];
}

describe('tag synergy (perTagPlayed)', () => {
  it('the second "+3 per Fire card played" card deals base plus 3; the first deals base', () => {
    let state = fight({ encounter: ['pacifist'], combat: { hand: ['kindle', 'kindle'] } });
    let dealt: number;
    [state, dealt] = hitWith(state, 'kindle', 0);
    expect(dealt).toBe(5);
    [state, dealt] = hitWith(state, 'kindle', 0);
    expect(dealt).toBe(5 + 3);
  });

  it('counts every card with that tag played earlier this turn, and no other tag', () => {
    let state = fight({
      encounter: ['pacifist'],
      combat: { hand: ['strike', 'surge', 'guard', 'kindle'] },
    });
    state = playId(state, 'strike', 0); // Fire
    state = playId(state, 'surge'); // Fire
    state = playId(state, 'guard'); // Frost
    expect(combatOf(state).tagsPlayedThisTurn).toEqual({ Fire: 2, Frost: 1, Poison: 0 });
    const [, dealt] = hitWith(state, 'kindle', 0);
    expect(dealt).toBe(5 + 3 * 2);
  });

  it('counts a card with two tags once for each tag', () => {
    const next = playId(fight({ combat: { hand: ['fireAndIce'] } }), 'fireAndIce');
    expect(combatOf(next).tagsPlayedThisTurn).toEqual({ Fire: 1, Frost: 1, Poison: 0 });
  });

  it('resets at the start of each turn', () => {
    let state = fight({
      encounter: ['pacifist'],
      combat: { hand: ['strike'], drawPile: ['kindle'], discardPile: [] },
    });
    state = playId(state, 'strike', 0);
    state = endTurn(state);
    expect(combatOf(state).tagsPlayedThisTurn).toEqual({ Fire: 0, Frost: 0, Poison: 0 });
    const [, dealt] = hitWith(state, 'kindle', 0);
    expect(dealt).toBe(5);
  });

  it("is an additive change, so the player's Chill still applies after it", () => {
    let state = fight({ encounter: ['pacifist'], combat: { hand: ['strike', 'kindle'] } });
    combatOf(state).player.statuses.Chill = 2;
    state = playId(state, 'strike', 0); // 6 - 2
    const [, dealt] = hitWith(state, 'kindle', 0);
    expect(dealt).toBe(5 + 3 - 2);
  });

  it('adds to every hit on every enemy', () => {
    let state = fight({
      encounter: ['pacifist', 'pacifist'],
      combat: { hand: ['surge', 'flameFan'] },
    });
    state = playId(state, 'surge'); // Fire
    state = playId(state, 'flameFan'); // (2 + 1) twice, on each enemy
    expect(combatOf(state).enemies.map((e) => e.hp)).toEqual([494, 494]);
  });
});

describe('Exhaust', () => {
  it('sends the card to the exhaust pile instead of the discard pile', () => {
    const next = playId(fight({ combat: { hand: ['spark', 'strike'], energy: 3 } }), 'spark');
    const combat = combatOf(next);
    expect(combat.exhaustPile).toEqual(['spark']);
    expect(combat.discardPile).toEqual([]);
    expect(combat.hand).toEqual(['strike']);
    expect(combat.energy).toBe(4);
  });

  it('an exhausted card never returns in a reshuffle', () => {
    let state = fight({
      encounter: ['pacifist'],
      combat: { hand: ['spark', 'strike', 'insight'], drawPile: [], discardPile: [] },
    });
    state = playId(state, 'spark');
    state = playId(state, 'strike', 0);
    state = playId(state, 'insight'); // the draw pile is empty, so the discard pile reshuffles
    for (let turn = 0; turn < 6; turn++) {
      const combat = combatOf(state);
      const inPlay = [...combat.hand, ...combat.drawPile, ...combat.discardPile];
      expect(combat.exhaustPile).toEqual(['spark']);
      expect(inPlay.sort()).toEqual(['insight', 'strike']);
      state = endTurn(state);
    }
  });

  it('lasts for this fight only: the run deck keeps the card for the next one', () => {
    let state = fight({
      encounter: ['weakling'],
      combat: { hand: ['spark', 'strike'] },
      run: { deck: ['spark', 'strike', 'guard', 'guard', 'guard'] },
    });
    state = playId(state, 'spark');
    state = playId(state, 'strike', 0); // wins the fight at n0, back to the map
    expect(state.phase).toBe('map');
    expect(state.deck).toEqual(['spark', 'strike', 'guard', 'guard', 'guard']);

    startCombat(state, 'n1', TEST_DEFS);
    const combat = combatOf(state);
    expect(combat.exhaustPile).toEqual([]);
    expect([...combat.hand, ...combat.drawPile].sort()).toEqual(
      ['guard', 'guard', 'guard', 'spark', 'strike'].sort(),
    );
  });
});

describe('combo triggers (stats.comboTriggers)', () => {
  it('counts each tag bonus above 0 that is applied', () => {
    let state = fight({ encounter: ['pacifist'], combat: { hand: ['kindle', 'kindle', 'kindle'] } });
    state = playId(state, 'kindle', 0); // no Fire card before it: bonus 0
    expect(state.stats.comboTriggers).toBe(0);
    state = playId(state, 'kindle', 0);
    state = playId(state, 'kindle', 0);
    expect(state.stats.comboTriggers).toBe(2);
  });

  it('counts a tag bonus once per effect, however many hits or enemies it reaches', () => {
    let state = fight({
      encounter: ['pacifist', 'pacifist'],
      combat: { hand: ['surge', 'flameFan'] },
    });
    state = playId(state, 'surge');
    state = playId(state, 'flameFan');
    expect(state.stats.comboTriggers).toBe(1);
  });

  it('counts a Shatter that removes at least one Chill, and not one that removes none', () => {
    let state = fight({ encounter: ['pacifist'], combat: { hand: ['shatter', 'shatter'] } });
    state = playId(state, 'shatter', 0);
    expect(state.stats.comboTriggers).toBe(0);
    enemy(state).statuses.Chill = 1;
    state = playId(state, 'shatter', 0);
    expect(state.stats.comboTriggers).toBe(1);
  });

  it('counts both kinds across turns, and a winning Shatter still counts', () => {
    let state = fight({
      nodeId: 'n1',
      encounter: ['dummy'],
      combat: {
        hand: ['strike', 'kindle', 'frostNova'],
        drawPile: ['shatter', 'guard', 'guard', 'guard', 'guard'],
        discardPile: [],
      },
    });
    state = playId(state, 'strike', 0); // 30 -> 24
    state = playId(state, 'kindle', 0); // 5 + 3: 24 -> 16, trigger 1
    state = playId(state, 'frostNova'); // Chill 3
    expect(state.stats.comboTriggers).toBe(1);
    state = endTurn(state); // the dummy's attack is chilled; its Chill falls to 2
    expect(enemy(state).statuses.Chill).toBe(2);
    enemy(state).hp = 8;
    state = playId(state, 'shatter', 0); // 2 stacks x 4 = 8: wins the boss fight, trigger 2
    expect(state).toMatchObject({ phase: 'ended', outcome: 'won' });
    expect(state.stats.comboTriggers).toBe(2);
  });
});

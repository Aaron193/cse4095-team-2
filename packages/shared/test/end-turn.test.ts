// End turn and the enemy phase (task P1-A4).
import { describe, expect, it } from 'vitest';
import {
  ENERGY_PER_TURN,
  FIGHT_TURN_CAP,
  HAND_SIZE,
  SHIELD_PERSISTS,
  STATUS_CAP,
} from '../src/engine/content/balance.ts';
import { applyActionWith } from '../src/engine/run.ts';
import { combatOf, endTurn, fight, playId, TEST_DEFS } from './support.ts';

describe('endTurn: a scripted three-turn fight', () => {
  // The numbers below assume Shield expires at the start of its owner's next turn (R3,
  // decision 2). Training Dummy (30 HP): attack 5, block 4, buff 2 strength. Brute (50 HP):
  // attack 6 twice, every turn. The player has 60 HP and draws from the top of a set pile.
  it('assumes SHIELD_PERSISTS is off', () => {
    expect(SHIELD_PERSISTS).toBe(false);
  });

  it('matches the expected HP and Shield after every turn', () => {
    let state = fight({
      encounter: ['dummy', 'brute'],
      combat: {
        hand: ['strike', 'guard', 'guard', 'sweep', 'twinStrike'],
        drawPile: ['strike', 'strike', 'guard', 'twinStrike', 'guard'].concat(
          ['guard', 'strike', 'sweep', 'guard', 'strike'],
          ['heavy'],
        ),
      },
    });
    const look = () => {
      const combat = combatOf(state);
      return {
        hp: state.hp,
        shield: combat.player.shield,
        enemies: combat.enemies.map((e) => ({ hp: e.hp, shield: e.shield, strength: e.strength })),
      };
    };

    // Turn 1: Guard (Shield 5) and Sweep (5 to all). The dummy's 5 is absorbed; the brute's
    // 6 + 6 takes 12 HP.
    state = playId(state, 'guard');
    state = playId(state, 'sweep');
    expect(look()).toEqual({
      hp: 60,
      shield: 5,
      enemies: [
        { hp: 25, shield: 0, strength: 0 },
        { hp: 45, shield: 0, strength: 0 },
      ],
    });
    state = endTurn(state);
    expect(look()).toEqual({
      hp: 48,
      shield: 0,
      enemies: [
        { hp: 25, shield: 0, strength: 0 },
        { hp: 45, shield: 0, strength: 0 },
      ],
    });

    // Turn 2: two Guards (Shield 10) and a Strike on the brute. The dummy blocks 4; the brute
    // hits 6 (Shield 10 -> 4), then 6 again (Shield 4 -> 0, 2 HP).
    state = playId(state, 'guard');
    state = playId(state, 'guard');
    state = playId(state, 'strike', 1);
    state = endTurn(state);
    expect(look()).toEqual({
      hp: 46,
      shield: 0,
      enemies: [
        { hp: 25, shield: 4, strength: 0 },
        { hp: 39, shield: 0, strength: 0 },
      ],
    });

    // Turn 3: Sweep (the dummy's Shield 4 takes 4 of its 5) and a Guard (Shield 5). The dummy
    // gains 2 strength; the brute hits 6 (Shield 5 -> 0, 1 HP) and 6 (6 HP).
    state = playId(state, 'sweep');
    state = playId(state, 'guard');
    state = endTurn(state);
    expect(look()).toEqual({
      hp: 39,
      shield: 0,
      enemies: [
        { hp: 24, shield: 0, strength: 2 },
        { hp: 34, shield: 0, strength: 0 },
      ],
    });
    expect(combatOf(state).turn).toBe(4);
    expect(state.stats.turns).toBe(4);
  });

  it('adds strength to later attacks', () => {
    let state = fight({ combat: { hand: [] } });
    combatOf(state).enemies[0]!.strength = 3;
    state = endTurn(state); // the dummy attacks 5 + 3
    expect(state.hp).toBe(60 - 8);
  });
});

describe('endTurn: order of play', () => {
  it('discards the hand and starts the next turn', () => {
    const start = fight({
      combat: { hand: ['strike', 'guard'], drawPile: ['a', 'b', 'c', 'd', 'e', 'f'], energy: 1 },
    });
    const combat = combatOf(endTurn(start));
    expect(combat.discardPile).toEqual(['strike', 'guard']);
    expect(combat.hand).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(combat.hand).toHaveLength(HAND_SIZE);
    expect(combat.energy).toBe(ENERGY_PER_TURN);
    expect(combat.turn).toBe(2);
    expect(combat.tagsPlayedThisTurn).toEqual({ Fire: 0, Frost: 0, Poison: 0 });
  });

  it('advances every enemy to its next intent, wrapping around the cycle', () => {
    let state = fight({ encounter: ['dummy', 'brute'], combat: { hand: [] } });
    const indexes = () => combatOf(state).enemies.map((enemy) => enemy.intentIndex);
    expect(indexes()).toEqual([0, 0]);
    state = endTurn(state);
    expect(indexes()).toEqual([1, 0]);
    state = endTurn(state);
    expect(indexes()).toEqual([2, 0]);
    state = endTurn(state);
    expect(indexes()).toEqual([0, 0]);
  });

  it('an enemy loses its old Shield when it acts again', () => {
    let state = fight({ combat: { hand: [] } });
    combatOf(state).enemies[0]!.intentIndex = 1; // block 4
    state = endTurn(state);
    expect(combatOf(state).enemies[0]!.shield).toBe(4);
    state = endTurn(state); // buff: the Shield expires first
    expect(combatOf(state).enemies[0]!.shield).toBe(0);
  });

  it("the player's Shield lasts through the enemy phase and expires at the next turn", () => {
    let state = fight({ encounter: ['pacifist'], combat: { hand: ['guard'] } });
    state = playId(state, 'guard');
    expect(combatOf(state).player.shield).toBe(5);
    state = endTurn(state);
    expect(combatOf(state).player.shield).toBe(0);
  });

  it('defeated enemies do not act', () => {
    const start = fight({ encounter: ['brute', 'dummy'], combat: { hand: [] } });
    combatOf(start).enemies[0]!.hp = 0;
    expect(endTurn(start).hp).toBe(60 - 5);
  });

  it('a debuff intent gives the player that status, capped at STATUS_CAP', () => {
    // The hexer's Chill 2 lands in the enemy phase; Chill then falls by 1 at end of turn.
    const start = fight({ encounter: ['hexer'], combat: { hand: [] } });
    expect(combatOf(endTurn(start)).player.statuses.Chill).toBe(2 - 1);

    const nearCap = fight({ encounter: ['hexer'], combat: { hand: [] } });
    combatOf(nearCap).player.statuses.Chill = STATUS_CAP - 1;
    expect(combatOf(endTurn(nearCap)).player.statuses.Chill).toBe(STATUS_CAP - 1);
  });
});

describe('endTurn: losing', () => {
  it('ends the run as lost the moment the player reaches 0 HP', () => {
    const start = fight({ encounter: ['brute', 'dummy'], combat: { hand: [] }, run: { hp: 5 } });
    const next = endTurn(start);
    expect(next.hp).toBe(0);
    expect(next.phase).toBe('ended');
    expect(next.outcome).toBe('lost');
    // The run stopped on the first hit: the turn never ended and no new turn began.
    expect(combatOf(next).turn).toBe(1);
    expect(combatOf(next).enemies[1]!.intentIndex).toBe(0);
  });

  it('refuses further actions after a loss', () => {
    const lost = endTurn(fight({ encounter: ['brute'], combat: { hand: [] }, run: { hp: 1 } }));
    const result = applyActionWith(lost, { type: 'endTurn' }, TEST_DEFS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('RUN_ENDED');
  });

  it(`loses the fight at the end of turn FIGHT_TURN_CAP (${FIGHT_TURN_CAP})`, () => {
    let state = fight({ encounter: ['pacifist'], combat: { hand: [], drawPile: [] } });
    for (let turn = 1; turn < FIGHT_TURN_CAP; turn++) state = endTurn(state);
    expect(state.phase).toBe('combat');
    expect(combatOf(state).turn).toBe(FIGHT_TURN_CAP);

    state = endTurn(state);
    expect(state.phase).toBe('ended');
    expect(state.outcome).toBe('lost');
    expect(state.hp).toBe(60);
    expect(state.stats.turns).toBe(FIGHT_TURN_CAP);
  });
});

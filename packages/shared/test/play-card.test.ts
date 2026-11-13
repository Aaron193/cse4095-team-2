// Playing a card (task P1-A3): effects damage, shield, draw, and energy; the illegal plays.
import type { Action, ApplyResult, RunState } from '@daily-delve/shared';
import { describe, expect, it } from 'vitest';
import { ENERGY_CAP, SHIELD_CAP } from '../src/engine/content/balance.ts';
import { applyActionWith } from '../src/engine/run.ts';
import { combatOf, deepFreeze, fight, TEST_DEFS } from './support.ts';

function play(state: RunState, handIndex: number, target?: number): ApplyResult {
  const action: Action =
    target === undefined
      ? { type: 'playCard', handIndex }
      : { type: 'playCard', handIndex, target };
  return applyActionWith(state, action, TEST_DEFS);
}

function played(state: RunState, handIndex: number, target?: number): RunState {
  const result = play(state, handIndex, target);
  if (!result.ok) throw new Error(`expected a legal play: ${result.error.message}`);
  return result.state;
}

describe('playCard: effects', () => {
  it('damage hits the target, pays the cost, and discards the card', () => {
    const start = fight({ combat: { hand: ['strike', 'guard'], energy: 3 } });
    const next = played(start, 0, 0);
    const combat = combatOf(next);
    expect(combat.enemies[0]!.hp).toBe(30 - 6);
    expect(combat.energy).toBe(2);
    expect(combat.hand).toEqual(['guard']);
    expect(combat.discardPile).toEqual(['strike']);
  });

  it('every hit of a multi-hit attack lands', () => {
    const next = played(fight({ combat: { hand: ['twinStrike'] } }), 0, 0);
    expect(combatOf(next).enemies[0]!.hp).toBe(30 - 4 - 4);
  });

  it('damage to all enemies hits each living enemy and takes no target', () => {
    const start = fight({ encounter: ['dummy', 'brute', 'dummy'], combat: { hand: ['sweep'] } });
    combatOf(start).enemies[1]!.hp = 0;
    const next = played(start, 0);
    expect(combatOf(next).enemies.map((enemy) => enemy.hp)).toEqual([25, 0, 25]);
  });

  it("an enemy's Shield absorbs damage before HP", () => {
    const start = fight({ combat: { hand: ['twinStrike'] } });
    combatOf(start).enemies[0]!.shield = 5;
    const enemy = combatOf(played(start, 0, 0)).enemies[0]!;
    expect(enemy.shield).toBe(0);
    expect(enemy.hp).toBe(30 - 3);
  });

  it('shield adds to the player, capped at SHIELD_CAP', () => {
    const once = played(fight({ combat: { hand: ['guard', 'bulwark', 'bulwark'] } }), 0);
    expect(combatOf(once).player.shield).toBe(5);
    const capped = played(played(once, 0), 0);
    expect(combatOf(capped).player.shield).toBe(SHIELD_CAP);
  });

  it('draw takes cards from the draw pile', () => {
    const start = fight({ combat: { hand: ['insight'], drawPile: ['strike', 'guard', 'sweep'] } });
    const combat = combatOf(played(start, 0));
    expect(combat.hand).toEqual(['strike', 'guard']);
    expect(combat.drawPile).toEqual(['sweep']);
    expect(combat.discardPile).toEqual(['insight']);
  });

  it('a card is not in the discard pile while its own draw reshuffles', () => {
    const start = fight({ combat: { hand: ['insight'], drawPile: [], discardPile: ['strike'] } });
    const combat = combatOf(played(start, 0));
    expect(combat.hand).toEqual(['strike']);
    expect(combat.discardPile).toEqual(['insight']);
  });

  it('energy adds to the current energy, capped at ENERGY_CAP', () => {
    const start = fight({ combat: { hand: ['surge', 'overload'], energy: 3 } });
    const surged = played(start, 0);
    expect(combatOf(surged).energy).toBe(5);
    expect(combatOf(played(surged, 0)).energy).toBe(ENERGY_CAP);
  });

  it('resolves effects in the listed order', () => {
    // braceAndHit: Shield 3, then 3 damage.
    const next = played(fight({ combat: { hand: ['braceAndHit'] } }), 0, 0);
    expect(combatOf(next).player.shield).toBe(3);
    expect(combatOf(next).enemies[0]!.hp).toBe(27);
  });

  it('a zero-cost card can be played with no energy left', () => {
    const next = played(fight({ combat: { hand: ['surge'], energy: 0 } }), 0);
    expect(combatOf(next).energy).toBe(2);
  });
});

describe('playCard: winning the fight', () => {
  it('is won the moment the last enemy reaches 0 HP, and later effects do not resolve', () => {
    // hitAndDraw: 5 damage, then draw 1. The weakling has 4 HP.
    const start = fight({
      nodeId: 'n1',
      encounter: ['weakling'],
      combat: { hand: ['hitAndDraw'], drawPile: ['strike'] },
    });
    const next = played(start, 0, 0);
    expect(next.phase).toBe('ended');
    expect(next.outcome).toBe('won');
    expect(combatOf(next).hand).toEqual([]);
    expect(combatOf(next).drawPile).toEqual(['strike']);
  });

  it('a won boss fight wins the run with every site counted', () => {
    const start = fight({ nodeId: 'n1', encounter: ['weakling'], combat: { hand: ['strike'] } });
    const next = played(start, 0, 0);
    expect(next.outcome).toBe('won');
    expect(next.cleared).toEqual(['n1']);
    expect(next.nodesCleared).toBe(next.dungeon.nodes.length);
  });

  it('a won fight elsewhere clears its site and returns to the map', () => {
    const start = fight({ nodeId: 'n0', encounter: ['weakling'], combat: { hand: ['strike'] } });
    const next = played(start, 0, 0);
    expect(next.phase).toBe('map');
    expect(next.outcome).toBeNull();
    expect(next.combat).toBeNull();
    expect(next.cleared).toEqual(['n0']);
    expect(next.nodesCleared).toBe(1);
  });

  it('is not won while any enemy is standing', () => {
    const start = fight({ encounter: ['weakling', 'dummy'], combat: { hand: ['strike'] } });
    const next = played(start, 0, 0);
    expect(next.phase).toBe('combat');
    expect(combatOf(next).enemies[0]!.hp).toBe(0);
  });

  it('is won when an all-enemies attack drops the last two together', () => {
    const start = fight({ encounter: ['weakling', 'weakling'], combat: { hand: ['sweep'] } });
    expect(played(start, 0).outcome).toBeNull(); // n0 is a fight, so back to the map
    expect(played(start, 0).phase).toBe('map');
  });
});

describe('playCard: illegal plays', () => {
  function base(): RunState {
    const state = fight({
      encounter: ['dummy', 'dummy'],
      combat: { hand: ['strike', 'heavy', 'guard'], energy: 2 },
    });
    combatOf(state).enemies[1]!.hp = 0;
    return deepFreeze(state);
  }

  const cases: [name: string, action: Action][] = [
    ['a hand index past the end', { type: 'playCard', handIndex: 3, target: 0 }],
    ['a negative hand index', { type: 'playCard', handIndex: -1, target: 0 }],
    ['a fractional hand index', { type: 'playCard', handIndex: 0.5, target: 0 }],
    ['a hand index that is not a number', { type: 'playCard', handIndex: '0' as never, target: 0 }],
    ['a card that costs more than the energy left', { type: 'playCard', handIndex: 1, target: 0 }],
    ['a missing target', { type: 'playCard', handIndex: 0 }],
    ['a defeated target', { type: 'playCard', handIndex: 0, target: 1 }],
    ['a target past the last enemy', { type: 'playCard', handIndex: 0, target: 2 }],
    ['a negative target', { type: 'playCard', handIndex: 0, target: -1 }],
    ['a target for a card that takes none', { type: 'playCard', handIndex: 2, target: 0 }],
  ];

  it.each(cases)('refuses %s with ILLEGAL_ACTION and changes nothing', (_name, action) => {
    const state = base();
    const before = JSON.stringify(state);
    const result = applyActionWith(state, action, TEST_DEFS);
    expect(result).toEqual({
      ok: false,
      error: { code: 'ILLEGAL_ACTION', message: expect.any(String) },
    });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('refuses a play outside combat', () => {
    const state = deepFreeze({ ...base(), phase: 'map' as const, combat: null });
    const result = applyActionWith(state, { type: 'playCard', handIndex: 0 }, TEST_DEFS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ILLEGAL_ACTION');
  });

  it('refuses an unknown action type', () => {
    const result = applyActionWith(base(), { type: 'cheat' } as never, TEST_DEFS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ILLEGAL_ACTION');
  });

  it('refuses every action once the run has ended, with RUN_ENDED', () => {
    const won = played(
      fight({ nodeId: 'n1', encounter: ['weakling'], combat: { hand: ['strike', 'strike'] } }),
      0,
      0,
    );
    const result = applyActionWith(
      deepFreeze(won),
      { type: 'playCard', handIndex: 0, target: 0 },
      TEST_DEFS,
    );
    expect(result).toEqual({
      ok: false,
      error: { code: 'RUN_ENDED', message: expect.any(String) },
    });
  });

  it('never changes the state it is given on a legal play either', () => {
    const state = base();
    const before = JSON.stringify(state);
    expect(play(state, 0, 0).ok).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });
});

// Burn, Chill, Poison, and Shatter (task P1-A5; TODO.md, Reference R3 "Statuses").
import type { RunState } from '@daily-delve/shared';
import { describe, expect, it } from 'vitest';
import { STATUS_CAP } from '../src/engine/content/balance.ts';
import { combatOf, endTurn, fight, playId } from './support.ts';

const enemy = (state: RunState, index = 0) => combatOf(state).enemies[index]!;
const player = (state: RunState) => combatOf(state).player;

/** Ends `turns` turns in a row and records `read` after each. */
function eachTurn<T>(state: RunState, turns: number, read: (state: RunState) => T): T[] {
  const seen: T[] = [];
  for (let turn = 0; turn < turns; turn++) {
    state = endTurn(state);
    seen.push(read(state));
  }
  return seen;
}

describe('applyStatus', () => {
  it('puts the status on the chosen enemy only', () => {
    const start = fight({ encounter: ['dummy', 'dummy'], combat: { hand: ['venom'] } });
    const next = playId(start, 'venom', 1);
    expect(combatOf(next).enemies.map((e) => e.statuses.Poison)).toEqual([0, 5]);
    expect(combatOf(next).energy).toBe(2);
  });

  it('on all enemies, puts it on every living enemy', () => {
    const start = fight({
      encounter: ['dummy', 'dummy', 'dummy'],
      combat: { hand: ['frostNova'] },
    });
    enemy(start, 1).hp = 0;
    const next = playId(start, 'frostNova');
    expect(combatOf(next).enemies.map((e) => e.statuses.Chill)).toEqual([3, 0, 3]);
  });

  it('on self, puts it on the player', () => {
    const next = playId(fight({ combat: { hand: ['selfBurn'] } }), 'selfBurn');
    expect(player(next).statuses).toEqual({ Burn: 6, Chill: 0, Poison: 0 });
    expect(enemy(next).statuses).toEqual({ Burn: 0, Chill: 0, Poison: 0 });
  });

  it(`adds to the stacks already there, capped at STATUS_CAP (${STATUS_CAP})`, () => {
    let state = fight({ combat: { hand: ['venom', 'hugeVenom', 'hugeVenom'] } });
    state = playId(state, 'venom', 0);
    expect(enemy(state).statuses.Poison).toBe(5);
    state = playId(state, 'hugeVenom', 0);
    state = playId(state, 'hugeVenom', 0);
    expect(enemy(state).statuses.Poison).toBe(STATUS_CAP);

    const hot = fight({ combat: { hand: ['selfBurn'] } });
    player(hot).statuses.Burn = STATUS_CAP - 2;
    expect(player(playId(hot, 'selfBurn')).statuses.Burn).toBe(STATUS_CAP);
  });
});

describe('Burn', () => {
  it('deals its stacks as damage at end of turn, then halves, rounded down', () => {
    const start = fight({ encounter: ['pacifist'], combat: { hand: [] } });
    enemy(start).statuses.Burn = 7;
    const seen = eachTurn(start, 4, (s) => [enemy(s).hp, enemy(s).statuses.Burn]);
    expect(seen).toEqual([
      [500 - 7, 3],
      [493 - 3, 1],
      [490 - 1, 0],
      [489, 0],
    ]);
  });

  it("is absorbed by the enemy's Shield", () => {
    const start = fight({ combat: { hand: [] } });
    enemy(start).intentIndex = 1; // the dummy blocks 4 in this enemy phase
    enemy(start).statuses.Burn = 7;
    const next = endTurn(start);
    expect(enemy(next)).toMatchObject({ hp: 30 - 3, shield: 0 });
    expect(enemy(next).statuses.Burn).toBe(3);
  });

  it("burns the player too, through the player's Shield first", () => {
    let state = fight({ encounter: ['pacifist'], combat: { hand: ['guard'] } });
    player(state).statuses.Burn = 8;
    state = playId(state, 'guard'); // Shield 5
    state = endTurn(state);
    expect(state.hp).toBe(60 - 3);
    expect(player(state).statuses.Burn).toBe(4);
  });
});

describe('Poison', () => {
  it('takes its stacks from HP at end of turn, then falls by 1', () => {
    const start = fight({ encounter: ['pacifist'], combat: { hand: [] } });
    enemy(start).statuses.Poison = 3;
    const seen = eachTurn(start, 4, (s) => [enemy(s).hp, enemy(s).statuses.Poison]);
    expect(seen).toEqual([
      [500 - 3, 2],
      [497 - 2, 1],
      [495 - 1, 0],
      [494, 0],
    ]);
  });

  it("ignores the enemy's Shield", () => {
    const start = fight({ combat: { hand: [] } });
    enemy(start).intentIndex = 1; // the dummy blocks 4
    enemy(start).statuses.Poison = 5;
    const next = endTurn(start);
    expect(enemy(next)).toMatchObject({ hp: 30 - 5, shield: 4 });
    expect(enemy(next).statuses.Poison).toBe(4);
  });

  it("ignores the player's Shield", () => {
    let state = fight({ encounter: ['pacifist'], combat: { hand: ['guard'] } });
    player(state).statuses.Poison = 6;
    state = playId(state, 'guard');
    state = endTurn(state);
    expect(state.hp).toBe(60 - 6);
    expect(player(state).statuses.Poison).toBe(5);
  });
});

describe('Chill', () => {
  it("lowers each of the player's attack hits by its stacks", () => {
    let state = fight({ encounter: ['pacifist', 'pacifist'], combat: { hand: [] } });
    combatOf(state).hand = ['strike', 'twinStrike', 'sweep'];
    player(state).statuses.Chill = 2;
    state = playId(state, 'strike', 0); // 6 - 2
    expect(enemy(state).hp).toBe(500 - 4);
    state = playId(state, 'twinStrike', 0); // (4 - 2) twice
    expect(enemy(state).hp).toBe(496 - 4);
    combatOf(state).energy = 2;
    state = playId(state, 'sweep'); // 5 - 2 on each enemy
    expect(combatOf(state).enemies.map((e) => e.hp)).toEqual([492 - 3, 500 - 3]);
  });

  it("lowers each of an enemy's attack hits, after its strength", () => {
    const start = fight({ encounter: ['brute'], combat: { hand: [] } });
    enemy(start).statuses.Chill = 2;
    enemy(start).strength = 1;
    expect(endTurn(start).hp).toBe(60 - 2 * (6 + 1 - 2));
  });

  it('never takes a hit below 0', () => {
    const start = fight({ encounter: ['brute'], combat: { hand: ['strike'] } });
    player(start).statuses.Chill = 9;
    enemy(start).statuses.Chill = 9;
    const struck = playId(start, 'strike', 0);
    expect(enemy(struck).hp).toBe(50);
    expect(endTurn(struck).hp).toBe(60);
  });

  it('wears off only after the enemy phase it weakened', () => {
    const start = fight({ combat: { hand: [] } }); // the dummy attacks 5 on turn 1
    enemy(start).statuses.Chill = 1;
    const next = endTurn(start);
    expect(next.hp).toBe(60 - 4);
    expect(enemy(next).statuses.Chill).toBe(0);
  });

  it('falls by 1 at end of turn, on enemies and on the player', () => {
    const start = fight({ encounter: ['pacifist'], combat: { hand: [] } });
    enemy(start).statuses.Chill = 2;
    player(start).statuses.Chill = 1;
    const seen = eachTurn(start, 3, (s) => [enemy(s).statuses.Chill, player(s).statuses.Chill]);
    expect(seen).toEqual([
      [1, 0],
      [0, 0],
      [0, 0],
    ]);
  });

  it('does not lower Burn or Poison damage', () => {
    const start = fight({ encounter: ['pacifist'], combat: { hand: [] } });
    player(start).statuses.Chill = 10;
    Object.assign(enemy(start).statuses, { Burn: 4, Chill: 10, Poison: 3 });
    expect(enemy(endTurn(start)).hp).toBe(500 - 4 - 3);
  });
});

describe('Shatter', () => {
  it("removes all of the target's Chill and deals perStack damage for each stack", () => {
    const start = fight({ combat: { hand: ['shatter'] } });
    enemy(start).statuses.Chill = 3;
    const next = playId(start, 'shatter', 0);
    expect(enemy(next).hp).toBe(30 - 3 * 4);
    expect(enemy(next).statuses.Chill).toBe(0);
    expect(combatOf(next).energy).toBe(2);
    expect(combatOf(next).discardPile).toEqual(['shatter']);
  });

  it('follows a Chill card in the same turn', () => {
    let state = fight({
      encounter: ['dummy', 'dummy'],
      combat: { hand: ['frostNova', 'shatter'] },
    });
    state = playId(state, 'frostNova');
    state = playId(state, 'shatter', 1);
    expect(combatOf(state).enemies.map((e) => [e.hp, e.statuses.Chill])).toEqual([
      [30, 3],
      [30 - 12, 0],
    ]);
  });

  it("goes through the target's Shield first", () => {
    const start = fight({ combat: { hand: ['shatter'] } });
    enemy(start).shield = 5;
    enemy(start).statuses.Chill = 3;
    expect(enemy(playId(start, 'shatter', 0))).toMatchObject({ hp: 30 - 7, shield: 0 });
  });

  it("is not lowered by the player's own Chill", () => {
    const start = fight({ combat: { hand: ['shatter'] } });
    player(start).statuses.Chill = 2;
    enemy(start).statuses.Chill = 3;
    expect(enemy(playId(start, 'shatter', 0)).hp).toBe(30 - 12);
  });

  it('does nothing to a target with no Chill, but is still played', () => {
    const next = playId(fight({ combat: { hand: ['shatter'] } }), 'shatter', 0);
    expect(enemy(next).hp).toBe(30);
    expect(combatOf(next).energy).toBe(2);
    expect(combatOf(next).discardPile).toEqual(['shatter']);
  });

  it('a capped stack deals perStack times STATUS_CAP and can win the fight', () => {
    const start = fight({ nodeId: 'n1', encounter: ['pacifist'], combat: { hand: ['shatter'] } });
    enemy(start).statuses.Chill = STATUS_CAP;
    enemy(start).hp = 4 * STATUS_CAP;
    const next = playId(start, 'shatter', 0);
    expect(enemy(next).hp).toBe(0);
    expect(next).toMatchObject({ phase: 'ended', outcome: 'won' });
  });
});

describe('status ticks: order and outcomes', () => {
  it('tick on the player first: a player death loses even if the last enemy would die', () => {
    const start = fight({
      nodeId: 'n1',
      encounter: ['pacifist'],
      combat: { hand: [] },
      run: { hp: 4 },
    });
    player(start).statuses.Poison = 4;
    enemy(start).hp = 3;
    enemy(start).statuses.Poison = 10;
    const next = endTurn(start);
    expect(next).toMatchObject({ hp: 0, phase: 'ended', outcome: 'lost' });
    expect(enemy(next).hp).toBe(3);
  });

  it('a player burned to 0 HP loses the run', () => {
    const start = fight({ encounter: ['pacifist'], combat: { hand: [] }, run: { hp: 5 } });
    player(start).statuses.Burn = 5;
    expect(endTurn(start)).toMatchObject({ hp: 0, phase: 'ended', outcome: 'lost' });
  });

  it('a tick that drops the last enemy wins the fight', () => {
    const boss = fight({ nodeId: 'n1', encounter: ['pacifist'], combat: { hand: [] } });
    enemy(boss).hp = 3;
    enemy(boss).statuses.Burn = 5;
    const won = endTurn(boss);
    expect(won).toMatchObject({ phase: 'ended', outcome: 'won' });
    expect(enemy(won).hp).toBe(0);

    const site = fight({ nodeId: 'n0', encounter: ['pacifist'], combat: { hand: [] } });
    enemy(site).hp = 2;
    enemy(site).statuses.Poison = 2;
    expect(endTurn(site)).toMatchObject({ phase: 'map', combat: null, cleared: ['n0'] });
  });

  it('a defeated enemy does not tick, and the others still do', () => {
    const start = fight({ encounter: ['pacifist', 'pacifist'], combat: { hand: [] } });
    enemy(start, 0).hp = 0;
    enemy(start, 0).statuses.Burn = 5;
    enemy(start, 1).statuses.Burn = 5;
    const next = endTurn(start);
    expect([enemy(next, 0).hp, enemy(next, 0).statuses.Burn]).toEqual([0, 5]);
    expect([enemy(next, 1).hp, enemy(next, 1).statuses.Burn]).toEqual([495, 2]);
  });
});

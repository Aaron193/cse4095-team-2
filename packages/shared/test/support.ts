// Shared builders for engine rule tests. The rules read cards and enemies through a `Defs`
// table, so these tests use small hand-made content whose numbers never change with balance.
import { ENGINE_VERSION } from '@daily-delve/shared';
import type { CardDef, Dungeon, EnemyDef, RunState } from '@daily-delve/shared';
import type { Defs } from '../src/engine/defs.ts';

function card(def: Omit<CardDef, 'rarity' | 'text'> & Partial<CardDef>): CardDef {
  return { rarity: 'common', text: def.name, ...def };
}

export const TEST_CARDS: Record<string, CardDef> = {
  strike: card({
    id: 'strike',
    name: 'Strike',
    type: 'Attack',
    tags: ['Fire'],
    cost: 1,
    effects: [{ kind: 'damage', amount: 6, target: 'enemy' }],
  }),
  twinStrike: card({
    id: 'twinStrike',
    name: 'Twin Strike',
    type: 'Attack',
    tags: ['Poison'],
    cost: 1,
    effects: [{ kind: 'damage', amount: 4, target: 'enemy', hits: 2 }],
  }),
  sweep: card({
    id: 'sweep',
    name: 'Sweep',
    type: 'Attack',
    tags: ['Frost'],
    cost: 2,
    effects: [{ kind: 'damage', amount: 5, target: 'allEnemies' }],
  }),
  heavy: card({
    id: 'heavy',
    name: 'Heavy Blow',
    type: 'Attack',
    tags: ['Fire'],
    cost: 3,
    effects: [{ kind: 'damage', amount: 20, target: 'enemy' }],
  }),
  guard: card({
    id: 'guard',
    name: 'Guard',
    type: 'Skill',
    tags: ['Frost'],
    cost: 1,
    effects: [{ kind: 'shield', amount: 5 }],
  }),
  bulwark: card({
    id: 'bulwark',
    name: 'Bulwark',
    type: 'Skill',
    tags: ['Frost'],
    cost: 0,
    effects: [{ kind: 'shield', amount: 60 }],
  }),
  insight: card({
    id: 'insight',
    name: 'Insight',
    type: 'Skill',
    tags: ['Poison'],
    cost: 0,
    effects: [{ kind: 'draw', count: 2 }],
  }),
  surge: card({
    id: 'surge',
    name: 'Surge',
    type: 'Skill',
    tags: ['Fire'],
    cost: 0,
    effects: [{ kind: 'energy', amount: 2 }],
  }),
  overload: card({
    id: 'overload',
    name: 'Overload',
    type: 'Skill',
    tags: ['Fire'],
    cost: 0,
    effects: [{ kind: 'energy', amount: 20 }],
  }),
  // Shield then damage: shows effects resolve in the listed order.
  braceAndHit: card({
    id: 'braceAndHit',
    name: 'Brace and Hit',
    type: 'Attack',
    tags: ['Frost'],
    cost: 1,
    effects: [
      { kind: 'shield', amount: 3 },
      { kind: 'damage', amount: 3, target: 'enemy' },
    ],
  }),
  // Damage then draw: the draw never happens if the damage wins the fight.
  hitAndDraw: card({
    id: 'hitAndDraw',
    name: 'Hit and Draw',
    type: 'Attack',
    tags: ['Poison'],
    cost: 1,
    effects: [
      { kind: 'damage', amount: 5, target: 'enemy' },
      { kind: 'draw', count: 1 },
    ],
  }),
  ignite: card({
    id: 'ignite',
    name: 'Ignite',
    type: 'Skill',
    tags: ['Fire'],
    cost: 1,
    effects: [{ kind: 'applyStatus', status: 'Burn', amount: 4, target: 'enemy' }],
  }),
  frostNova: card({
    id: 'frostNova',
    name: 'Frost Nova',
    type: 'Skill',
    tags: ['Frost'],
    cost: 1,
    effects: [{ kind: 'applyStatus', status: 'Chill', amount: 3, target: 'allEnemies' }],
  }),
  venom: card({
    id: 'venom',
    name: 'Venom',
    type: 'Skill',
    tags: ['Poison'],
    cost: 1,
    effects: [{ kind: 'applyStatus', status: 'Poison', amount: 5, target: 'enemy' }],
  }),
  hugeVenom: card({
    id: 'hugeVenom',
    name: 'Huge Venom',
    type: 'Skill',
    tags: ['Poison'],
    cost: 0,
    effects: [{ kind: 'applyStatus', status: 'Poison', amount: 25, target: 'enemy' }],
  }),
  selfBurn: card({
    id: 'selfBurn',
    name: 'Self Burn',
    type: 'Skill',
    tags: ['Fire'],
    cost: 0,
    effects: [{ kind: 'applyStatus', status: 'Burn', amount: 6, target: 'self' }],
  }),
  shatter: card({
    id: 'shatter',
    name: 'Shatter',
    type: 'Attack',
    tags: ['Frost'],
    cost: 1,
    effects: [{ kind: 'shatter', perStack: 4 }],
  }),
  // "+3 per Fire card played" (P1-A6).
  kindle: card({
    id: 'kindle',
    name: 'Kindle',
    type: 'Attack',
    tags: ['Fire'],
    cost: 0,
    effects: [
      { kind: 'damage', amount: 5, target: 'enemy', perTagPlayed: { tag: 'Fire', bonus: 3 } },
    ],
  }),
  spark: card({
    id: 'spark',
    name: 'Spark',
    type: 'Skill',
    tags: ['Fire'],
    cost: 0,
    effects: [{ kind: 'energy', amount: 1 }],
    exhaust: true,
  }),
};

export const TEST_ENEMIES: Record<string, EnemyDef> = {
  // Attack 5, then block 4, then buff 2 strength: a three-step cycle.
  dummy: {
    id: 'dummy',
    name: 'Training Dummy',
    tier: 'normal',
    maxHp: 30,
    intents: [
      { kind: 'attack', damage: 5, hits: 1 },
      { kind: 'block', amount: 4 },
      { kind: 'buff', strength: 2 },
    ],
  },
  // Hits twice every turn.
  brute: {
    id: 'brute',
    name: 'Brute',
    tier: 'normal',
    maxHp: 50,
    intents: [{ kind: 'attack', damage: 6, hits: 2 }],
  },
  // Chills the player, then attacks.
  hexer: {
    id: 'hexer',
    name: 'Hexer',
    tier: 'normal',
    maxHp: 20,
    intents: [
      { kind: 'debuff', status: 'Chill', amount: 2 },
      { kind: 'attack', damage: 8, hits: 1 },
    ],
  },
  // Never hurts anyone: for status and turn-cap tests.
  pacifist: {
    id: 'pacifist',
    name: 'Pacifist',
    tier: 'normal',
    maxHp: 500,
    intents: [{ kind: 'block', amount: 0 }],
  },
  weakling: {
    id: 'weakling',
    name: 'Weakling',
    tier: 'normal',
    maxHp: 4,
    intents: [{ kind: 'attack', damage: 1, hits: 1 }],
  },
};

export const TEST_DEFS: Defs = { cards: TEST_CARDS, enemies: TEST_ENEMIES };

/** A 7 by 3 dungeon: start (1, 1), fight n0 at (3, 1), boss n1 at (5, 1). */
export function testDungeon(encounters: Record<string, string[]> = {}): Dungeon {
  return {
    seed: 'test-seed',
    width: 7,
    height: 3,
    tiles: ['#######', '#.....#', '#######'],
    start: { x: 1, y: 1 },
    nodes: [
      { id: 'n0', x: 3, y: 1, type: 'fight' },
      { id: 'n1', x: 5, y: 1, type: 'boss' },
    ],
    encounters: { n0: ['dummy'], n1: ['brute'], ...encounters },
    rewards: { n0: ['strike', 'guard', 'insight'] },
  };
}

/** A run standing on the start tile in phase 'map', with a ten-card deck. */
export function makeRun(overrides: Partial<RunState> = {}): RunState {
  return {
    engineVersion: ENGINE_VERSION,
    seed: 'test-seed',
    phase: 'map',
    outcome: null,
    dungeon: testDungeon(),
    pos: { x: 1, y: 1 },
    cleared: [],
    openedGates: [],
    nodesCleared: 0,
    hp: 60,
    maxHp: 60,
    deck: [
      'strike',
      'strike',
      'strike',
      'guard',
      'guard',
      'guard',
      'insight',
      'surge',
      'twinStrike',
      'sweep',
    ],
    combat: null,
    rewardOffers: null,
    stats: { turns: 0, comboTriggers: 0, steps: 0 },
    ...overrides,
  };
}

/** Freezes a value and everything inside it, so any write to it throws. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

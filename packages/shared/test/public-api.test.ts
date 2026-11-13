// Imports every name in TODO.md Reference R4 from the package (tasks P0-A3 and P0-A5).
// The type imports are checked by `npm run typecheck`; the sample values below fail to
// compile if a type drifts from R4, and so do the `expectTypeOf` checks.
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  CARDS,
  ENEMIES,
  ENGINE_VERSION,
  applyAction,
  createRun,
  createTestFight,
  generateDungeon,
  hashState,
  legalActions,
  simulate,
  summarize,
} from '@daily-delve/shared';
import type {
  Action,
  ApplyResult,
  CardDef,
  CombatState,
  Dungeon,
  Effect,
  EnemyDef,
  EnemyState,
  EngineError,
  Intent,
  MapNode,
  PowerDef,
  RngState,
  RunResult,
  RunState,
  SimResult,
  StatusId,
  Statuses,
  Tag,
  Trait,
} from '@daily-delve/shared';

const tag: Tag = 'Fire';
const statusId: StatusId = 'Chill';
const statuses: Statuses = { Burn: 0, Chill: 0, Poison: 0 };
const power: PowerDef = { kind: 'damageBonus', tag, amount: 2 };
const effects: Effect[] = [
  { kind: 'damage', amount: 6, target: 'enemy', hits: 2, perTagPlayed: { tag, bonus: 3 } },
  { kind: 'damage', amount: 4, target: 'allEnemies' },
  { kind: 'shield', amount: 5 },
  { kind: 'draw', count: 1 },
  { kind: 'energy', amount: 1 },
  { kind: 'applyStatus', status: statusId, amount: 2, target: 'self' },
  { kind: 'shatter', perStack: 4 },
  { kind: 'power', power },
  { kind: 'power', power: { kind: 'turnStart', effect: { kind: 'shield', amount: 3 } } },
];
const card: CardDef = {
  id: 'sample',
  name: 'Sample',
  type: 'Attack',
  tags: [tag],
  rarity: 'common',
  cost: 1,
  effects,
  exhaust: true,
  text: 'Sample text.',
};
const intents: Intent[] = [
  { kind: 'attack', damage: 6, hits: 1 },
  { kind: 'block', amount: 5 },
  { kind: 'buff', strength: 2 },
  { kind: 'debuff', status: 'Burn', amount: 2 },
];
const traits: Trait[] = [
  { kind: 'immune', status: 'Poison' },
  { kind: 'startShield', amount: 10 },
  { kind: 'enrage', everyTurns: 3, strength: 2 },
];
const enemyDef: EnemyDef = {
  id: 'sample',
  name: 'Sample',
  tier: 'boss',
  maxHp: 100,
  intents,
  traits,
  phase2: { atOrBelowHpPercent: 50, intents },
};
// A 7 by 3 dungeon. The player started at (1, 1), cleared shrine n0, opened the Fire gate at
// (3, 1), which is tile index 1 * 7 + 3 = 10, and is now fighting at n1.
const shrine: MapNode = { id: 'n0', x: 2, y: 1, type: 'shrine' };
const node: MapNode = { id: 'n1', x: 5, y: 1, type: 'fight' };
const dungeon: Dungeon = {
  seed: 'seed',
  width: 7,
  height: 3,
  tiles: ['#######', '#..B..#', '#######'],
  start: { x: 1, y: 1 },
  nodes: [shrine, node],
  encounters: { n1: ['sample'] },
  rewards: { n1: ['sample', 'sample', 'sample'] },
};
const rng: RngState = { a: 1, b: 2, c: 3, d: 4 };
const enemy: EnemyState = {
  defId: 'sample',
  hp: 10,
  maxHp: 10,
  shield: 0,
  statuses,
  strength: 0,
  intentIndex: 0,
  phase: 1,
};
const combat: CombatState = {
  nodeId: 'n1',
  turn: 1,
  energy: 3,
  hand: ['sample'],
  drawPile: [],
  discardPile: [],
  exhaustPile: [],
  enemies: [enemy],
  player: { shield: 0, statuses, powers: [power] },
  tagsPlayedThisTurn: { Fire: 0, Frost: 0, Poison: 0 },
  rng,
};
const state: RunState = {
  engineVersion: ENGINE_VERSION,
  seed: 'seed',
  phase: 'combat',
  outcome: null,
  dungeon,
  pos: { x: 5, y: 1 },
  cleared: ['n0'],
  openedGates: [10],
  nodesCleared: 1,
  hp: 60,
  maxHp: 60,
  deck: ['sample', 'sample', 'sample', 'sample'],
  combat,
  rewardOffers: null,
  stats: { turns: 0, comboTriggers: 0, steps: 4 },
};
const actions: Action[] = [
  { type: 'move', dir: 'E' },
  { type: 'playCard', handIndex: 0, target: 0 },
  { type: 'playCard', handIndex: 0 },
  { type: 'endTurn' },
  { type: 'pickReward', choice: 1 },
  { type: 'pickReward', choice: null },
  { type: 'shrine', choice: 'heal' },
  { type: 'shrine', choice: 'remove', deckIndex: 0 },
];
const result: RunResult = { outcome: 'lost', nodesCleared: 0, score: 0, turns: 0 };
const error: EngineError = { code: 'ILLEGAL_ACTION', message: 'no' };
const applyResults: ApplyResult[] = [
  { ok: true, state },
  { ok: false, error },
];
const simResults: SimResult[] = [
  { ok: true, state, result },
  { ok: true, state, result: null },
  { ok: false, error: { code: 'TOO_MANY_ACTIONS', message: 'no' }, atIndex: 3 },
];

describe('engine public API (R4)', () => {
  it('exports ENGINE_VERSION 0.3.0', () => {
    expect(ENGINE_VERSION).toBe('0.3.0');
  });

  it('exports the content tables', () => {
    expect(typeof CARDS).toBe('object');
    expect(typeof ENEMIES).toBe('object');
  });

  // Functions whose tasks are not done yet. Each task removes its line here.
  it.each([
    ['generateDungeon', () => generateDungeon('seed')],
    ['createRun', () => createRun('seed')],
    ['legalActions', () => legalActions(state)],
    ['simulate', () => simulate('seed', actions)],
    ['summarize', () => summarize(state)],
    ['hashState', () => hashState(state)],
  ])('exports %s as a stub that throws "not implemented"', (name, call) => {
    expect(call).toThrow(`not implemented: ${name}`);
  });

  it('exports createTestFight, a run in combat at turn 1 (P1-A7)', () => {
    const fight = createTestFight('seed');
    expect(fight.phase).toBe('combat');
    expect(fight.combat?.turn).toBe(1);
    expect(fight.engineVersion).toBe(ENGINE_VERSION);
  });

  it('exports applyAction, which refuses actions in an ended run (P1-A3)', () => {
    const ended: RunState = { ...state, phase: 'ended', outcome: 'lost' };
    expect(applyAction(ended, { type: 'endTurn' })).toEqual({
      ok: false,
      error: { code: 'RUN_ENDED', message: expect.any(String) },
    });
    expect(applyAction(state, { type: 'move', dir: 'N' })).toEqual({
      ok: false,
      error: { code: 'ILLEGAL_ACTION', message: expect.any(String) },
    });
  });

  it('accepts sample values for every R4 type as plain JSON', () => {
    const samples = { card, enemyDef, state, actions, applyResults, simResults };
    expect(JSON.parse(JSON.stringify(samples))).toEqual(samples);
  });

  it('has exactly the R4 grid-dungeon fields and actions (P0-A5)', () => {
    expectTypeOf<keyof MapNode>().toEqualTypeOf<'id' | 'x' | 'y' | 'type'>();
    expectTypeOf<keyof Dungeon>().toEqualTypeOf<
      'seed' | 'width' | 'height' | 'tiles' | 'start' | 'nodes' | 'encounters' | 'rewards'
    >();
    expectTypeOf<keyof RunState>().toEqualTypeOf<
      | 'engineVersion'
      | 'seed'
      | 'phase'
      | 'outcome'
      | 'dungeon'
      | 'pos'
      | 'cleared'
      | 'openedGates'
      | 'nodesCleared'
      | 'hp'
      | 'maxHp'
      | 'deck'
      | 'combat'
      | 'rewardOffers'
      | 'stats'
    >();
    expectTypeOf<keyof RunState['stats']>().toEqualTypeOf<'turns' | 'comboTriggers' | 'steps'>();
    expectTypeOf<Action['type']>().toEqualTypeOf<
      'move' | 'playCard' | 'endTurn' | 'pickReward' | 'shrine'
    >();
    expectTypeOf<Extract<Action, { type: 'move' }>>().toEqualTypeOf<{
      type: 'move';
      dir: 'N' | 'E' | 'S' | 'W';
    }>();
  });
});

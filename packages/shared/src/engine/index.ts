// Public surface of the engine (TODO.md, Reference R4).
export { ENGINE_VERSION } from './version.ts';

export { generateDungeon } from './dungeon.ts';
export {
  applyAction,
  createRun,
  createTestFight,
  legalActions,
  simulate,
  summarize,
} from './run.ts';
export { hashState } from './hash.ts';

export { CARDS } from './content/cards.ts';
export { ENEMIES } from './content/enemies.ts';

export { createRng, nextInt, nextU32, pick, shuffle } from './rng.ts';

export type {
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
} from './types.ts';

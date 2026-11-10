// Engine types (TODO.md, Reference R4). Everything here is plain JSON data (R2 rule 5).
import type { RngState } from './rng.ts';

export type { RngState };

export type Tag = 'Fire' | 'Frost' | 'Poison';
export type StatusId = 'Burn' | 'Chill' | 'Poison';
export type Statuses = { Burn: number; Chill: number; Poison: number };

export type Effect =
  | {
      kind: 'damage';
      amount: number;
      target: 'enemy' | 'allEnemies';
      hits?: number;
      perTagPlayed?: { tag: Tag; bonus: number };
    }
  | { kind: 'shield'; amount: number }
  | { kind: 'draw'; count: number }
  | { kind: 'energy'; amount: number }
  | {
      kind: 'applyStatus';
      status: StatusId;
      amount: number;
      target: 'enemy' | 'allEnemies' | 'self';
    }
  | { kind: 'shatter'; perStack: number }
  | { kind: 'power'; power: PowerDef };

export type PowerDef =
  { kind: 'turnStart'; effect: Effect } | { kind: 'damageBonus'; tag: Tag; amount: number };

export interface CardDef {
  id: string;
  name: string;
  type: 'Attack' | 'Skill' | 'Power';
  tags: Tag[];
  rarity: 'common' | 'rare';
  cost: number;
  effects: Effect[];
  exhaust?: boolean;
  text: string;
}

export type Intent =
  | { kind: 'attack'; damage: number; hits: number }
  | { kind: 'block'; amount: number }
  | { kind: 'buff'; strength: number }
  | { kind: 'debuff'; status: StatusId; amount: number };

export type Trait =
  | { kind: 'immune'; status: StatusId }
  | { kind: 'startShield'; amount: number }
  | { kind: 'enrage'; everyTurns: number; strength: number };

export interface EnemyDef {
  id: string;
  name: string;
  tier: 'normal' | 'elite' | 'boss';
  maxHp: number;
  intents: Intent[];
  traits?: Trait[];
  phase2?: { atOrBelowHpPercent: number; intents: Intent[] };
}

/** A site on the grid: one floor tile holding a fight, an elite, a shrine, or the boss. */
export interface MapNode {
  /** "n<index>", numbered in reading order (top row first, left to right), for example "n4". */
  id: string;
  /** Its tile. */
  x: number;
  y: number;
  type: 'fight' | 'elite' | 'shrine' | 'boss';
}

export interface Dungeon {
  seed: string;
  width: number;
  height: number;
  /**
   * One string per row: '#' wall, '.' floor, 'B' brambles (Fire), '~' water (Frost),
   * 'R' bars (Poison). Sites and the start are floor tiles.
   */
  tiles: string[];
  start: { x: number; y: number };
  nodes: MapNode[];
  /** nodeId -> enemy ids */
  encounters: Record<string, string[]>;
  /** nodeId -> three card ids */
  rewards: Record<string, string[]>;
}

export interface EnemyState {
  defId: string;
  hp: number;
  maxHp: number;
  shield: number;
  statuses: Statuses;
  strength: number;
  intentIndex: number;
  phase: 1 | 2;
}

export interface CombatState {
  nodeId: string;
  turn: number;
  energy: number;
  hand: string[];
  drawPile: string[];
  discardPile: string[];
  exhaustPile: string[];
  enemies: EnemyState[];
  player: { shield: number; statuses: Statuses; powers: PowerDef[] };
  tagsPlayedThisTurn: { Fire: number; Frost: number; Poison: number };
  rng: RngState;
}

export interface RunState {
  engineVersion: string;
  seed: string;
  phase: 'map' | 'combat' | 'reward' | 'shrine' | 'ended';
  outcome: 'won' | 'lost' | null;
  dungeon: Dungeon;
  /** The player's tile. */
  pos: { x: number; y: number };
  /** Node ids, in the order cleared. */
  cleared: string[];
  /** Tile indexes (y * width + x) of opened gates, in the order opened. */
  openedGates: number[];
  nodesCleared: number;
  hp: number;
  maxHp: number;
  deck: string[];
  combat: CombatState | null;
  rewardOffers: string[] | null;
  stats: { turns: number; comboTriggers: number; steps: number };
}

export type Action =
  /** One tile north, east, south, or west. */
  | { type: 'move'; dir: 'N' | 'E' | 'S' | 'W' }
  /** `target` is an enemy index. */
  | { type: 'playCard'; handIndex: number; target?: number }
  | { type: 'endTurn' }
  /** `choice` is an offer index; `null` skips. */
  | { type: 'pickReward'; choice: number | null }
  | { type: 'shrine'; choice: 'heal' }
  | { type: 'shrine'; choice: 'remove'; deckIndex: number };

export interface RunResult {
  outcome: 'won' | 'lost';
  nodesCleared: number;
  score: number;
  turns: number;
}

export type EngineError = {
  code: 'ILLEGAL_ACTION' | 'RUN_ENDED' | 'TOO_MANY_ACTIONS';
  message: string;
};

export type ApplyResult = { ok: true; state: RunState } | { ok: false; error: EngineError };

export type SimResult =
  /** `result` is null if the run has not ended. */
  | { ok: true; state: RunState; result: RunResult | null }
  | { ok: false; error: EngineError; atIndex: number };

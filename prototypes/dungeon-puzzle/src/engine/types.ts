// Shared types for the Daily Delve engine. Everything here is plain data (JSON-safe).

export type Element = 'fire' | 'frost' | 'poison' | 'phys';
export type CardElement = 'fire' | 'frost' | 'poison';

/** What a card (or hazard) does to one tile and whatever stands on it. */
export interface Hit {
  el: Element;
  dmg?: number;
  burn?: number; // turns of Burn (1 dmg per turn)
  freeze?: number; // turns Frozen (cannot act, can be pushed)
  poison?: number; // Poison stacks (deals N, then N-1, ...; ignores armor)
  sleep?: number; // turns Asleep (wakes when damaged)
  weaken?: number; // turns of -2 attack
  corrode?: boolean; // dissolves iron bars, locks, crates
  blast?: boolean; // breaks cracked walls and crates
  push?: number; // knockback tiles
  strip?: boolean; // removes armor
  special?: 'shatter' | 'combust' | 'catalyst' | 'contagion';
}

export type Shape =
  | 'bolt' // flies until it hits the first thing it can affect
  | 'line' // pierces every tile in a line
  | 'burst' // every tile around the player
  | 'self' // buff
  | 'dash' // leap forward (crosses pits)
  | 'skate' // slide until blocked, freezing water underfoot
  | 'conjure' // create an ice block
  | 'bait' // throw a lure
  | 'wall' // line of burning tiles
  | 'passive'; // triggers on its own

export type BuffKey = 'inner' | 'frostbite' | 'venom' | 'veil' | 'stasis' | 'shield';

export interface CardDef {
  id: string;
  name: string;
  el: CardElement;
  charges: number;
  shape: Shape;
  range?: number;
  radius?: number;
  ttl?: number;
  cloud?: number; // leaves a gas cloud for N turns
  hit?: Omit<Hit, 'el'>;
  buff?: Partial<Record<BuffKey, number>>;
  text: string;
}

export type EnemyAI = 'chaser' | 'guard' | 'patrol' | 'turret' | 'beetle' | 'mimic';

export interface EnemyDef {
  name: string;
  hp: number;
  atk: number;
  ai: EnemyAI;
  speed: number; // acts every N turns
  aggro?: number; // chasers hunt when the walking distance to you is <= aggro
  range?: number; // turret range
  armor?: number; // subtracted from every direct hit
  res?: Partial<Record<Element, number>>; // 0 immune, 0.5 resist, 2 weak
  regen?: boolean;
  chillTouch?: boolean;
  deathCloud?: boolean;
  quench?: boolean; // only Frost can hurt it, and any Frost hit destroys it
  heavy?: boolean; // cannot be pushed
  desc: string;
}

export interface Block { x: number; y: number; kind: 'crate' | 'ice' }
export interface Item { x: number; y: number; kind: 'key' | 'gold' | 'potion' | 'chest' }
export interface Mech { kind: 'plate' | 'brazier'; sources: number[]; gates: number[] }
export interface Answer { cards: string[]; moves: number; actions: string }

export interface MapDef {
  id: number;
  name: string;
  seed: number;
  difficulty: number;
  w: number;
  h: number;
  tiles: string[]; // rows; see tiles.ts for the legend
  enemies: { type: string; x: number; y: number; dir?: number }[];
  blocks: Block[];
  items: Item[];
  mechs: Mech[];
  offer: string[]; // the 9 cards on offer (pick 4)
  par: number; // best bot solution, in moves
  winPct?: number; // % of the 126 possible loadouts the bot can win with
  answers?: Answer[]; // minimal winning card sets found by the bot
}

export interface Enemy {
  id: number;
  type: string;
  x: number;
  y: number;
  hp: number;
  armor: number;
  dir: number;
  frozen: number;
  sleep: number;
  burn: number;
  poison: number;
  weaken: number;
  charge: number; // turret: charged shot; beetle: lit fuse
  awake: boolean; // mimics start dormant
}

export interface GameEvent { t: string; x?: number; y?: number; msg?: string }

export interface State {
  map: MapDef;
  w: number;
  h: number;
  tiles: string;
  px: number;
  py: number;
  hp: number;
  maxHp: number;
  shield: number;
  keys: number;
  gold: number;
  turn: number; // every turn that has passed
  clock: number; // trap/enemy clock (pauses during Stasis)
  moves: number; // player actions taken (the score counts these)
  status: 'play' | 'won' | 'dead';
  cards: { id: string; charges: number }[];
  inner: number;
  frostbite: number;
  venom: number;
  veil: number;
  stasis: number;
  stun: boolean;
  enemies: Enemy[];
  blocks: Block[];
  items: Item[];
  fires: { i: number; ttl: number }[];
  gases: { i: number; ttl: number }[];
  bait: { i: number; ttl: number } | null;
  kills: number;
  style: number; // combos and environmental kills
  cardsUsed: number;
  dmgTaken: number;
  best: number; // closest distance to the exit reached
  events: GameEvent[]; // what happened during the last step (for the UI)
  fx: number; // internal: counts real effects of the current action
}

export type Action =
  | { t: 'move'; d: number }
  | { t: 'card'; c: number; d: number }
  | { t: 'wait' };

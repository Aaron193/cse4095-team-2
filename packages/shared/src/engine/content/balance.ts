// Balance constants: data only (TODO.md, Reference R3 table and R2 rule 9).
// Every game number that rule code needs is read from here. Integers and booleans only.

// Player and turn
export const PLAYER_MAX_HP = 60;
export const HAND_SIZE = 5;
export const MAX_HAND = 10;
export const ENERGY_PER_TURN = 3;
export const ENERGY_CAP = 9;

// Combat limits
export const STATUS_CAP = 30;
export const SHIELD_CAP = 99;
/** false: Shield expires just before its owner's side acts again (R3, decision 2). */
export const SHIELD_PERSISTS = false;
export const FIGHT_TURN_CAP = 40;

// Map, deck, shrine
export const MAP_FLOORS = 7;
export const MIN_DECK_SIZE = 5;
export const SHRINE_HEAL_PERCENT = 30;

// Run limits
export const MAX_ACTIONS = 2000;

// Score
export const SCORE_PER_NODE = 100;
export const SCORE_CLEAR_BONUS = 300;
export const SCORE_SPEED_BASE = 300;
export const SCORE_SPEED_PER_TURN = 3;
export const SCORE_PER_COMBO = 5;
export const SCORE_STYLE_CAP = 150;

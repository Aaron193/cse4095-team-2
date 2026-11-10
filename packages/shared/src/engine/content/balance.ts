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

// Dungeon, deck, shrine
/** Fewest fight sites on any gate-free route from the start to the boss (R3, Dungeon). */
export const MIN_ROUTE_FIGHTS = 4;
/** A gate opens when the deck holds at least this many cards with its tag (R3, decision 9). */
export const GATE_TAG_CARDS = 4;
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

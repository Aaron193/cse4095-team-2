// The content tables that rule code reads cards and enemies from (R2 rule 9: content is data,
// rules are code). The public API always uses DEFS. Rule tests pass small tables of their own,
// so they keep passing when a balance pass changes the real cards.
import { CARDS } from './content/cards.ts';
import { ENEMIES } from './content/enemies.ts';
import type { CardDef, EnemyDef } from './types.ts';

export interface Defs {
  cards: Readonly<Record<string, CardDef>>;
  enemies: Readonly<Record<string, EnemyDef>>;
}

export const DEFS: Defs = { cards: CARDS, enemies: ENEMIES };

/** The definition of a card id. A missing id is a content bug, never a player mistake. */
export function cardDef(defs: Defs, id: string): CardDef {
  const def = defs.cards[id];
  if (!def) throw new Error(`Unknown card id "${id}"`);
  return def;
}

/** The definition of an enemy id. A missing id is a content bug, never a player mistake. */
export function enemyDef(defs: Defs, id: string): EnemyDef {
  const def = defs.enemies[id];
  if (!def) throw new Error(`Unknown enemy id "${id}"`);
  return def;
}

export * from './types.ts';
export * from './engine.ts';
export * from './score.ts';
export { CARDS, CARD_LIST } from './cards.ts';
export { ENEMIES } from './enemies.ts';
export { TILE_INFO, ITEM_INFO, isSolid, isWalk } from './tiles.ts';
export { rng, hashStr } from './rng.ts';

import type { MapDef } from './types.ts';

/** Days since 1970-01-01 UTC. A new dungeon starts at midnight UTC. */
export const dayNumber = (date = new Date()) => Math.floor(date.getTime() / 86400000);
export const dailyMap = (maps: MapDef[], day = dayNumber()) => maps[((day % maps.length) + maps.length) % maps.length];

// Tile legend. One character per tile in MapDef.tiles.

export const SOLID = '#BIRDCGTt'; // blocks movement and shots
export const WALK = '.=ioOW_gx^VvE'; // can be stood on
export const isSolid = (c: string) => SOLID.includes(c);
export const isWalk = (c: string) => WALK.includes(c);

export interface TileInfo { name: string; desc: string; obstacle?: boolean }

export const TILE_INFO: Record<string, TileInfo> = {
  '#': { name: 'Wall', desc: 'Solid rock.' },
  '.': { name: 'Floor', desc: '' },
  '=': { name: 'Bridge', desc: 'A crate wedged into the gap. Safe to cross.' },
  E: { name: 'Exit', desc: 'The stairs down. Reach them to clear the dungeon.' },
  '~': { name: 'Water', desc: 'Too deep to cross. Frost freezes it into a bridge; a crate pushed in makes one too.', obstacle: true },
  i: { name: 'Ice', desc: 'Frozen water. Safe to walk on.' },
  L: { name: 'Lava', desc: 'Impassable. Frost cools it into walkable obsidian. Crates burn up in it.', obstacle: true },
  o: { name: 'Obsidian', desc: 'Cooled lava. Safe to walk on.' },
  P: { name: 'Pit', desc: 'A bottomless gap. Leap it with Cinder Step or fill it with a crate. Shoved enemies fall in.', obstacle: true },
  B: { name: 'Brambles', desc: 'A wall of thorns. Fire burns it, Poison withers it.', obstacle: true },
  I: { name: 'Ice Wall', desc: 'Solid ice. Any Fire melts it.', obstacle: true },
  R: { name: 'Iron Bars', desc: 'Rusted bars. Only acid eats through them.', obstacle: true },
  D: { name: 'Locked Door', desc: 'Needs a key. Acid also dissolves the lock.', obstacle: true },
  C: { name: 'Cracked Wall', desc: 'Weak masonry. A blast (Fireball, Icicle Lance, a Blast Beetle) brings it down.', obstacle: true },
  '^': { name: 'Spike Trap', desc: 'Up for 2 turns, down for 2. Standing on it when it is up costs 2 HP. Frost jams it for good.', obstacle: true },
  x: { name: 'Frozen Trap', desc: 'Jammed with ice. Harmless.' },
  V: { name: 'Gas Vent', desc: 'Puffs poison gas over the 3x3 around it for 3 turns out of 6 (1 HP per turn). Frost seals it.', obstacle: true },
  v: { name: 'Sealed Vent', desc: 'Iced shut. Harmless.' },
  O: { name: 'Oil', desc: 'Harmless until Fire touches it; then the whole slick burns for 3 turns.', obstacle: true },
  W: { name: 'Web', desc: 'Walking in tears it down but costs you a turn. Fire burns it.', obstacle: true },
  _: { name: 'Pressure Plate', desc: 'Opens its gate while something stands on it: you, a crate, an ice block or an enemy.', obstacle: true },
  G: { name: 'Gate', desc: 'Closed. Opened by its pressure plate or brazier.', obstacle: true },
  g: { name: 'Open Gate', desc: 'Open while its plate is held or its brazier burns.' },
  T: { name: 'Brazier', desc: 'Unlit. Light it with any Fire to open its gate.', obstacle: true },
  t: { name: 'Lit Brazier', desc: 'Burning. Its gate stays open. Frost puts it out.' },
};

export const ITEM_INFO: Record<string, TileInfo> = {
  key: { name: 'Key', desc: 'Opens one locked door.' },
  gold: { name: 'Gold', desc: 'Worth score at the end.' },
  chest: { name: 'Chest', desc: '3 gold. Unless it has teeth.' },
  potion: { name: 'Potion', desc: 'Heals 3 HP. Left alone if you are at full health.' },
  crate: { name: 'Crate', desc: 'Push it. Fills water and pits, holds plates, blocks shots. Burns.' },
  ice: { name: 'Ice Block', desc: 'Push it like a crate. Fire melts it.' },
  bait: { name: 'Bait', desc: 'Chasers nearby go for this instead of you.' },
  fire: { name: 'Fire', desc: '2 damage per turn to you, burns enemies. Chasers will not walk into it.' },
  gas: { name: 'Poison Gas', desc: '1 damage per turn to you. Enemies caught in a gas cloud gain Poison (vent gas does not bother them).' },
};

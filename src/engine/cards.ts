import type { CardDef } from './types.ts';

// The 30 launch cards: 10 Fire, 10 Frost, 10 Poison. Pure data; the rules live in engine.ts.
// A card that would have no effect is never spent (no charge, no move).

export const CARD_LIST: CardDef[] = [
  // ---------- FIRE: damage, burning things down, lighting braziers ----------
  { id: 'ember_bolt', name: 'Ember Bolt', el: 'fire', charges: 3, shape: 'bolt', range: 5, hit: { dmg: 2, burn: 2 },
    text: 'Bolt (5). 2 damage and Burn 2.' },
  { id: 'fireball', name: 'Fireball', el: 'fire', charges: 1, shape: 'bolt', range: 5, radius: 1, hit: { dmg: 3, burn: 1, blast: true },
    text: 'Bolt (5) that explodes: 3 damage to everything within 1 tile, you included. Breaks cracked walls.' },
  { id: 'flame_wave', name: 'Flame Wave', el: 'fire', charges: 2, shape: 'line', range: 3, hit: { dmg: 2, burn: 1 },
    text: 'Pierces 3 tiles: 2 damage to every enemy and burns everything flammable in the line.' },
  { id: 'torch', name: 'Torch', el: 'fire', charges: 4, shape: 'bolt', range: 1, hit: { dmg: 1, burn: 3 },
    text: 'Touch. 1 damage and Burn 3. Cheap way to burn brambles, melt ice and light braziers.' },
  { id: 'cinder_step', name: 'Cinder Step', el: 'fire', charges: 2, shape: 'dash', range: 3, ttl: 3,
    text: 'Leap up to 3 tiles, crossing pits and traps, and leave a trail of fire for 3 turns.' },
  { id: 'fire_ring', name: 'Ring of Fire', el: 'fire', charges: 1, shape: 'burst', radius: 1, hit: { dmg: 2, burn: 2 },
    text: 'All 8 tiles around you: 2 damage and Burn 2.' },
  { id: 'inner_fire', name: 'Inner Fire', el: 'fire', charges: 2, shape: 'self', buff: { inner: 5 },
    text: 'For 4 turns your dagger deals +2 damage and applies Burn 2, and you cannot be chilled.' },
  { id: 'phoenix_feather', name: 'Phoenix Feather', el: 'fire', charges: 1, shape: 'passive',
    text: 'Passive. When you would die, revive with 4 HP and scorch everything around you.' },
  { id: 'scorch', name: 'Scorch', el: 'fire', charges: 2, shape: 'wall', range: 4, ttl: 4, hit: { dmg: 1, burn: 2 },
    text: 'Set a line of 4 tiles ablaze for 4 turns. Chasers will not cross it.' },
  { id: 'combust', name: 'Combust', el: 'fire', charges: 2, shape: 'bolt', range: 5, hit: { dmg: 1, special: 'combust' },
    text: 'Bolt (5). Detonates Burn: 2 + 2 per Burn turn left, ignoring armor. 1 damage otherwise.' },

  // ---------- FROST: control, bridges, repositioning ----------
  { id: 'frost_bolt', name: 'Frost Bolt', el: 'frost', charges: 3, shape: 'bolt', range: 5, hit: { dmg: 1, freeze: 3 },
    text: 'Bolt (5). 1 damage and Freeze 3. Freezes the first water or lava tile it meets.' },
  { id: 'glacial_path', name: 'Glacial Path', el: 'frost', charges: 2, shape: 'line', range: 4, hit: { freeze: 1 },
    text: 'Freezes every water, lava and trap tile in a line of 4. Enemies in the line are Frozen 1.' },
  { id: 'shatter', name: 'Shatter', el: 'frost', charges: 2, shape: 'bolt', range: 5, hit: { dmg: 1, special: 'shatter' },
    text: 'Bolt (5). A Frozen target takes 5 damage, ignoring armor. 1 damage otherwise.' },
  { id: 'blizzard', name: 'Blizzard', el: 'frost', charges: 1, shape: 'burst', radius: 2, hit: { freeze: 4 },
    text: 'Everything within 2 tiles: Freeze 4. Water, lava and traps in range freeze over.' },
  { id: 'ice_block', name: 'Ice Block', el: 'frost', charges: 2, shape: 'conjure',
    text: 'Conjure a pushable ice block on the next tile. Blocks corridors and shots, weighs down plates.' },
  { id: 'rime_shield', name: 'Rime Shield', el: 'frost', charges: 2, shape: 'self', buff: { shield: 3 },
    text: 'Gain 3 Shield. Shield absorbs damage until it is used up.' },
  { id: 'skate', name: 'Skate', el: 'frost', charges: 2, shape: 'skate',
    text: 'Slide in a straight line until something stops you, freezing water under your feet.' },
  { id: 'stasis', name: 'Stasis', el: 'frost', charges: 1, shape: 'self', buff: { stasis: 4 },
    text: 'Time stops for 4 turns: enemies do not act and traps do not cycle.' },
  { id: 'icicle_lance', name: 'Icicle Lance', el: 'frost', charges: 2, shape: 'line', range: 4, hit: { dmg: 2, push: 2, blast: true },
    text: 'Pierces 4 tiles: 2 damage and knocks enemies back 2 tiles. Breaks cracked walls.' },
  { id: 'frostbite', name: 'Frostbite Aura', el: 'frost', charges: 2, shape: 'self', buff: { frostbite: 6 },
    text: 'For 6 turns, any enemy that hits you is Frozen 2.' },

  // ---------- POISON: damage over time, sabotage, trickery ----------
  { id: 'venom_dart', name: 'Venom Dart', el: 'poison', charges: 3, shape: 'bolt', range: 5, hit: { poison: 3 },
    text: 'Bolt (5). Poison 3 (3, then 2, then 1 damage). Poison ignores armor.' },
  { id: 'acid_flask', name: 'Acid Flask', el: 'poison', charges: 2, shape: 'bolt', range: 4, hit: { dmg: 2, corrode: true, strip: true },
    text: 'Bolt (4). 2 damage and destroys armor. Dissolves iron bars, locked doors and crates.' },
  { id: 'sleep_spores', name: 'Sleep Spores', el: 'poison', charges: 2, shape: 'burst', radius: 2, hit: { sleep: 5 },
    text: 'Everything within 2 tiles falls Asleep for 5 turns. Damage wakes them.' },
  { id: 'miasma', name: 'Miasma', el: 'poison', charges: 2, shape: 'bolt', range: 4, cloud: 4, hit: { poison: 1 },
    text: 'Bolt (4). Leaves a 3x3 gas cloud for 4 turns. Enemies inside gain Poison every turn.' },
  { id: 'contagion', name: 'Contagion', el: 'poison', charges: 1, shape: 'bolt', range: 5, hit: { special: 'contagion' },
    text: 'Bolt (5). Poison +2, then the target\'s Poison spreads to every enemy within 3 tiles.' },
  { id: 'venom_blood', name: 'Venom Blood', el: 'poison', charges: 2, shape: 'self', buff: { venom: 6 },
    text: 'For 6 turns you are immune to gas, and any enemy that hits you gains Poison 3.' },
  { id: 'catalyst', name: 'Catalyst', el: 'poison', charges: 2, shape: 'bolt', range: 5, hit: { special: 'catalyst' },
    text: 'Bolt (5). Doubles the target\'s Poison and triggers it immediately.' },
  { id: 'rotten_bait', name: 'Rotten Bait', el: 'poison', charges: 2, shape: 'bait', range: 4,
    text: 'Throw bait up to 4 tiles. Chasers nearby go for the bait instead of you for 6 turns.' },
  { id: 'wither', name: 'Wither', el: 'poison', charges: 3, shape: 'bolt', range: 1, hit: { poison: 1, weaken: 5 },
    text: 'Touch. Poison 1 and Weaken 5 (-2 attack). Kills brambles instantly.' },
  { id: 'fume_veil', name: 'Fume Veil', el: 'poison', charges: 2, shape: 'self', buff: { veil: 4 },
    text: 'Vanish for 4 turns. Enemies cannot see, chase or attack you.' },
];

export const CARDS: Record<string, CardDef> = Object.fromEntries(CARD_LIST.map((c) => [c.id, c]));

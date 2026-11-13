// Card definitions: data only (R2 rule 9). Task P1-A7: the first ten cards, one character
// each. For each tag there is a basic attack, a status applier, and a skill, and Fire has the
// tag-synergy attack. The id also picks the card's illustration in the client (CARD_ART).
import type { CardDef } from '../types.ts';

export const CARDS: Record<string, CardDef> = {
  // Fire: quick damage, Burn, and cards that feed each other.
  kip: {
    id: 'kip',
    name: 'Kip, the Matchstick Kid',
    type: 'Attack',
    tags: ['Fire'],
    rarity: 'common',
    cost: 0,
    effects: [
      { kind: 'damage', amount: 3, target: 'enemy' },
      { kind: 'applyStatus', status: 'Burn', amount: 1, target: 'enemy' },
    ],
    text: 'Deal 3 damage. Apply 1 Burn.',
  },
  pyra: {
    id: 'pyra',
    name: 'Pyra, the Ember Witch',
    type: 'Attack',
    tags: ['Fire'],
    rarity: 'common',
    cost: 1,
    effects: [
      { kind: 'damage', amount: 4, target: 'enemy' },
      { kind: 'applyStatus', status: 'Burn', amount: 4, target: 'enemy' },
    ],
    text: 'Deal 4 damage. Apply 4 Burn.',
  },
  sera: {
    id: 'sera',
    name: 'Sera, the Sparkwright',
    type: 'Skill',
    tags: ['Fire'],
    rarity: 'common',
    cost: 0,
    effects: [{ kind: 'energy', amount: 2 }],
    exhaust: true,
    text: 'Gain 2 energy. Exhaust.',
  },
  'brother-ash': {
    id: 'brother-ash',
    name: 'Brother Ash, the Kindler',
    type: 'Attack',
    tags: ['Fire'],
    rarity: 'rare',
    cost: 1,
    effects: [
      { kind: 'damage', amount: 6, target: 'enemy', perTagPlayed: { tag: 'Fire', bonus: 3 } },
    ],
    text: 'Deal 6 damage, +3 for each other Fire card played this turn.',
  },

  // Frost: Shield, Chill to blunt attacks, and Shatter to cash the Chill in.
  nix: {
    id: 'nix',
    name: 'Nix, the Icebreaker',
    type: 'Attack',
    tags: ['Frost'],
    rarity: 'common',
    cost: 1,
    effects: [
      { kind: 'damage', amount: 5, target: 'enemy' },
      { kind: 'shatter', perStack: 3 },
    ],
    text: 'Deal 5 damage. Shatter: 3 damage per Chill.',
  },
  bryn: {
    id: 'bryn',
    name: 'Bryn, the Stormcaller',
    type: 'Skill',
    tags: ['Frost'],
    rarity: 'common',
    cost: 1,
    effects: [{ kind: 'applyStatus', status: 'Chill', amount: 3, target: 'allEnemies' }],
    text: 'Apply 3 Chill to all enemies.',
  },
  halvard: {
    id: 'halvard',
    name: 'Halvard, the Icewarden',
    type: 'Skill',
    tags: ['Frost'],
    rarity: 'common',
    cost: 1,
    effects: [{ kind: 'shield', amount: 7 }],
    text: 'Gain 7 Shield.',
  },

  // Poison: many small hits and damage that goes around Shield.
  vex: {
    id: 'vex',
    name: 'Vex, the Twin Fang',
    type: 'Attack',
    tags: ['Poison'],
    rarity: 'common',
    cost: 1,
    effects: [{ kind: 'damage', amount: 4, target: 'enemy', hits: 2 }],
    text: 'Deal 4 damage twice.',
  },
  'bog-witch': {
    id: 'bog-witch',
    name: 'The Bog Witch',
    type: 'Skill',
    tags: ['Poison'],
    rarity: 'common',
    cost: 1,
    effects: [{ kind: 'applyStatus', status: 'Poison', amount: 4, target: 'allEnemies' }],
    text: 'Apply 4 Poison to all enemies.',
  },
  rook: {
    id: 'rook',
    name: 'Rook, the Plague Doctor',
    type: 'Skill',
    tags: ['Poison'],
    rarity: 'common',
    cost: 0,
    effects: [
      { kind: 'applyStatus', status: 'Poison', amount: 3, target: 'enemy' },
      { kind: 'draw', count: 1 },
    ],
    text: 'Apply 3 Poison. Draw 1 card.',
  },
};

/** The deck every run starts with (R3, Run): one of each card. */
export const STARTER_DECK: readonly string[] = [
  'kip',
  'pyra',
  'sera',
  'brother-ash',
  'nix',
  'bryn',
  'halvard',
  'vex',
  'bog-witch',
  'rook',
];

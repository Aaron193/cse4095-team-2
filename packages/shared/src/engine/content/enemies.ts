// Enemy definitions: data only (R2 rule 9). Task P1-A7: two normal enemies, each with a
// three-step intent cycle. The id also picks the enemy's portrait in the client.
import type { EnemyDef } from '../types.ts';

export const ENEMIES: Record<string, EnemyDef> = {
  // Slams, hardens, then smothers the player's attacks with clinging gel.
  'gel-slime': {
    id: 'gel-slime',
    name: 'Gel Slime',
    tier: 'normal',
    maxHp: 70,
    intents: [
      { kind: 'attack', damage: 12, hits: 1 },
      { kind: 'block', amount: 10 },
      { kind: 'debuff', status: 'Chill', amount: 3 },
    ],
  },
  // A volley, a careful aim that lasts the whole fight, then a heavy shot.
  'bone-archer': {
    id: 'bone-archer',
    name: 'Bone Archer',
    tier: 'normal',
    maxHp: 56,
    intents: [
      { kind: 'attack', damage: 4, hits: 2 },
      { kind: 'buff', strength: 3 },
      { kind: 'attack', damage: 11, hits: 1 },
    ],
  },
};

/** The enemies `createTestFight` chooses from, by seed. */
export const TEST_FIGHT_ENEMIES: readonly string[] = ['gel-slime', 'bone-archer'];

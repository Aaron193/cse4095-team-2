// What an enemy is about to do, read from its definition (Docs/screens.md, Combat). This only
// looks data up: the numbers are the intent's own, before strength and Chill (task P3-C6
// shows the adjusted total).
import { ENEMIES } from '@daily-delve/shared';
import type { EnemyState, Intent } from '@daily-delve/shared';

/** The intent `enemy` is showing: from its phase 2 cycle once it is in phase 2. */
export function shownIntent(enemy: EnemyState): Intent | null {
  const def = ENEMIES[enemy.defId];
  if (!def) return null;
  const cycle = enemy.phase === 2 && def.phase2 ? def.phase2.intents : def.intents;
  return cycle[enemy.intentIndex] ?? null;
}

/** "Attack 6", "Attack 3 x3", "Block 10", "Strength +2", "Chill 3". */
export function intentLabel(intent: Intent): string {
  switch (intent.kind) {
    case 'attack':
      return intent.hits > 1
        ? `Attack ${intent.damage} x${intent.hits}`
        : `Attack ${intent.damage}`;
    case 'block':
      return `Block ${intent.amount}`;
    case 'buff':
      return `Strength +${intent.strength}`;
    case 'debuff':
      return `${intent.status} ${intent.amount}`;
  }
}

/** The enemy's display name, falling back to its id for content the client does not know. */
export function enemyName(enemy: EnemyState): string {
  return ENEMIES[enemy.defId]?.name ?? enemy.defId;
}

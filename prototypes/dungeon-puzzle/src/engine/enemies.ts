import type { EnemyDef } from './types.ts';

// Every enemy has one mechanic of its own. All behaviour is deterministic:
// same position + same clock = same move, so a dungeon can be planned like a puzzle.

export const ENEMIES: Record<string, EnemyDef> = {
  slime: { name: 'Slime', hp: 3, atk: 1, ai: 'chaser', speed: 2, aggro: 5,
    desc: 'Slow chaser (moves every other turn). Easy to outrun or to fight hit-and-step-back.' },
  sentinel: { name: 'Bone Sentinel', hp: 4, atk: 2, ai: 'guard', speed: 1, res: { poison: 0, frost: 2 },
    desc: 'Never moves. Strikes anything next to it every turn. Immune to Poison and Sleep, brittle to Frost.' },
  bat: { name: 'Cave Bat', hp: 1, atk: 1, ai: 'patrol', speed: 1,
    desc: 'Flies back and forth in a straight line, even over water and pits. Time your crossing.' },
  imp: { name: 'Ember Imp', hp: 3, atk: 2, ai: 'turret', speed: 1, range: 5, res: { fire: 0, frost: 2 },
    desc: 'Stands still. Charges when you enter its row or column, fires the turn after. Blocks stop its shots. Immune to Fire, weak to Frost.' },
  wraith: { name: 'Frost Wraith', hp: 3, atk: 1, ai: 'chaser', speed: 1, aggro: 5, res: { frost: 0, fire: 2 }, chillTouch: true,
    desc: 'Fast chaser. Its touch chills you so enemies get an extra turn. Immune to Frost, weak to Fire.' },
  shambler: { name: 'Spore Shambler', hp: 5, atk: 2, ai: 'chaser', speed: 2, aggro: 4, res: { poison: 0, fire: 2 }, deathCloud: true,
    desc: 'Slow chaser. Bursts into a poison cloud when it dies unless killed by Fire. Immune to Poison.' },
  knight: { name: 'Iron Knight', hp: 4, atk: 3, ai: 'chaser', speed: 2, aggro: 4, armor: 2, res: { fire: 0.5 },
    desc: 'Armor 2 shrugs off your dagger and weak hits. Poison, Shatter and Combust ignore armor; acid removes it.' },
  troll: { name: 'Cave Troll', hp: 8, atk: 3, ai: 'chaser', speed: 2, aggro: 3, regen: true,
    desc: 'Regenerates 1 HP every turn unless it is Burning or Poisoned. Short sight: give it a wide berth.' },
  mimic: { name: 'Mimic', hp: 4, atk: 2, ai: 'mimic', speed: 1, aggro: 8,
    desc: 'Looks like a chest (check for teeth). Wakes when you stand next to it, then hunts fast.' },
  spider: { name: 'Web Spider', hp: 2, atk: 1, ai: 'chaser', speed: 1, aggro: 6, res: { fire: 2 },
    desc: 'Fast, frail chaser that nests among webs. Webs cost you a turn. Weak to Fire.' },
  beetle: { name: 'Blast Beetle', hp: 2, atk: 3, ai: 'beetle', speed: 1, aggro: 5,
    desc: 'Runs at you, lights its fuse, and explodes next turn (3 damage, 1 tile). The blast breaks cracked walls and crates. Freezing it snuffs the fuse.' },
  hulk: { name: 'Magma Hulk', hp: 1, atk: 3, ai: 'guard', speed: 1, quench: true, heavy: true,
    desc: 'Living lava plugging a passage. Nothing hurts it except Frost, and any Frost hit turns it to stone.' },
  warden: { name: 'Dungeon Warden', hp: 9, atk: 3, ai: 'chaser', speed: 2, aggro: 5, armor: 1, heavy: true,
    desc: 'Elite. Armored, heavy (cannot be pushed) and relentless, but slow. Kill it for glory or slip past.' },
};

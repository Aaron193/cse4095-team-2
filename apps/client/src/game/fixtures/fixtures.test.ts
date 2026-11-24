import { applyAction, CARDS, createTestFight, ENEMIES, legalActions } from '@daily-delve/shared';
import { describe, expect, it } from 'vitest';
import { fixtureCombat, fixtureDungeon, fixtureMapRun, fixtureRun } from './index.ts';

/** The key paths of a JSON value, with array items collapsed to [] so lists of any length match. */
function shape(value: unknown, path = ''): string[] {
  if (Array.isArray(value))
    return value.length === 0 ? [`${path}[]`] : shape(value[0], `${path}[]`);
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => shape(item, `${path}.${key}`));
  }
  return [`${path}:${typeof value}`];
}

describe('the combat fixture', () => {
  it('has exactly the fields of an engine CombatState (R4)', () => {
    const engineCombat = createTestFight('shape').combat!;
    const ignoreEmptyLists = (paths: string[]) =>
      paths.filter((path) => !path.endsWith('[]')).sort();
    expect(ignoreEmptyLists(shape(fixtureCombat()))).toEqual(
      ignoreEmptyLists(shape({ ...engineCombat, exhaustPile: ['x'], discardPile: ['x'] })),
    );
  });

  it('names only real cards and enemies', () => {
    const combat = fixtureCombat();
    const cards = [
      ...combat.hand,
      ...combat.drawPile,
      ...combat.discardPile,
      ...combat.exhaustPile,
    ];
    for (const id of cards) expect(CARDS).toHaveProperty([id]);
    for (const enemy of combat.enemies) expect(ENEMIES).toHaveProperty([enemy.defId]);
  });

  it('is a state the real engine plays on', () => {
    const state = fixtureRun();
    expect(legalActions(state)).toContainEqual({ type: 'endTurn' });
    expect(applyAction(state, { type: 'endTurn' }).ok).toBe(true);
  });

  it('gives a fresh copy every time', () => {
    const first = fixtureCombat();
    first.enemies[0]!.hp = 1;
    expect(fixtureCombat().enemies[0]!.hp).toBe(31);
  });
});

describe('the dungeon fixture', () => {
  const dungeon = fixtureDungeon();
  const at = (x: number, y: number) => dungeon.tiles[y]![x]!;

  it('is a 33 by 19 grid of the five R4 tile kinds, walled all round', () => {
    expect(dungeon.width).toBe(33);
    expect(dungeon.height).toBe(19);
    expect(dungeon.tiles).toHaveLength(dungeon.height);
    for (const row of dungeon.tiles) {
      expect(row).toHaveLength(dungeon.width);
      expect(row).toMatch(/^[#.B~R]+$/);
    }
    expect(dungeon.tiles[0]).toMatch(/^#+$/);
    expect(dungeon.tiles[dungeon.height - 1]).toMatch(/^#+$/);
    for (const row of dungeon.tiles) expect(row[0] + row[dungeon.width - 1]!).toBe('##');
  });

  it('holds every gate kind', () => {
    const all = dungeon.tiles.join('');
    for (const gate of ['B', '~', 'R']) expect(all).toContain(gate);
  });

  it('numbers its sites in reading order, each on a floor tile', () => {
    const order = [...dungeon.nodes].sort((a, b) => a.y - b.y || a.x - b.x);
    expect(dungeon.nodes).toEqual(order);
    dungeon.nodes.forEach((node, index) => {
      expect(node.id).toBe(`n${index}`);
      expect(at(node.x, node.y)).toBe('.');
    });
  });

  it('has the R3 site counts, and names only real cards and enemies', () => {
    const count = (type: string) => dungeon.nodes.filter((node) => node.type === type).length;
    expect(count('boss')).toBe(1);
    expect(count('fight')).toBeGreaterThanOrEqual(6);
    expect(count('fight')).toBeLessThanOrEqual(9);
    expect([1, 2]).toContain(count('elite'));
    expect([2, 3]).toContain(count('shrine'));
    for (const node of dungeon.nodes) {
      if (node.type === 'shrine') continue;
      for (const id of dungeon.encounters[node.id]!) expect(ENEMIES).toHaveProperty([id]);
      if (node.type === 'boss') continue;
      expect(dungeon.rewards[node.id]).toHaveLength(3);
      for (const id of dungeon.rewards[node.id]!) expect(CARDS).toHaveProperty([id]);
    }
  });

  it('reaches the boss from the start with every gate closed', () => {
    const boss = dungeon.nodes.find((node) => node.type === 'boss')!;
    const seen = new Set([`${dungeon.start.x},${dungeon.start.y}`]);
    const queue = [dungeon.start];
    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ] as const) {
        const next = { x: x + dx, y: y + dy };
        const key = `${next.x},${next.y}`;
        if (seen.has(key) || at(next.x, next.y) !== '.') continue;
        seen.add(key);
        queue.push(next);
      }
    }
    expect(seen.has(`${boss.x},${boss.y}`)).toBe(true);
  });

  it('gives a map-phase run standing on floor', () => {
    const state = fixtureMapRun();
    expect(state.phase).toBe('map');
    expect(at(state.pos.x, state.pos.y)).toBe('.');
    expect(state.cleared).toEqual(['n2']);
  });
});

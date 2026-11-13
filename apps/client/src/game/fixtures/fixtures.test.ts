import { applyAction, CARDS, createTestFight, ENEMIES, legalActions } from '@daily-delve/shared';
import { describe, expect, it } from 'vitest';
import { fixtureCombat, fixtureRun } from './index.ts';

/** The key paths of a JSON value, with array items collapsed to [] so lists of any length match. */
function shape(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return value.length === 0 ? [`${path}[]`] : shape(value[0], `${path}[]`);
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
    const cards = [...combat.hand, ...combat.drawPile, ...combat.discardPile, ...combat.exhaustPile];
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

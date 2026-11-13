// The card and enemy tables (task P1-A7; TODO.md, Reference R3 "Cards" and "Content targets").
import { CARDS, ENEMIES } from '@daily-delve/shared';
import type { CardDef, Effect, Intent, StatusId, Tag } from '@daily-delve/shared';
import { describe, expect, it } from 'vitest';
import { STARTER_DECK } from '../src/engine/content/cards.ts';
import { TEST_FIGHT_ENEMIES } from '../src/engine/content/enemies.ts';

const TAGS: readonly Tag[] = ['Fire', 'Frost', 'Poison'];
const STATUSES: readonly StatusId[] = ['Burn', 'Chill', 'Poison'];
const TAG_STATUS: Record<Tag, StatusId> = { Fire: 'Burn', Frost: 'Chill', Poison: 'Poison' };

const isInt = (value: unknown, min: number, max = Infinity): boolean =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

/** Why an effect is malformed, or null. Kinds the engine does not know are malformed. */
function effectProblem(effect: Effect): string | null {
  switch (effect.kind) {
    case 'damage':
      if (!isInt(effect.amount, 1)) return 'damage amount';
      if (!['enemy', 'allEnemies'].includes(effect.target)) return 'damage target';
      if (effect.hits !== undefined && !isInt(effect.hits, 2)) return 'damage hits';
      if (effect.perTagPlayed) {
        if (!TAGS.includes(effect.perTagPlayed.tag)) return 'perTagPlayed tag';
        if (!isInt(effect.perTagPlayed.bonus, 1)) return 'perTagPlayed bonus';
      }
      return null;
    case 'shield':
    case 'energy':
      return isInt(effect.amount, 1) ? null : `${effect.kind} amount`;
    case 'draw':
      return isInt(effect.count, 1) ? null : 'draw count';
    case 'applyStatus':
      if (!STATUSES.includes(effect.status)) return 'status';
      if (!['enemy', 'allEnemies', 'self'].includes(effect.target)) return 'status target';
      return isInt(effect.amount, 1) ? null : 'status amount';
    case 'shatter':
      return isInt(effect.perStack, 1) ? null : 'shatter perStack';
    case 'power':
      return null; // Powers are task P3-A1; none in the P1 content.
    default:
      return `unknown effect kind "${(effect as { kind: string }).kind}"`;
  }
}

/** The numbers an effect puts in play. The card text must show each one. */
function numbersOf(effect: Effect): number[] {
  switch (effect.kind) {
    case 'damage':
      return effect.perTagPlayed ? [effect.amount, effect.perTagPlayed.bonus] : [effect.amount];
    case 'shield':
    case 'energy':
    case 'applyStatus':
      return [effect.amount];
    case 'draw':
      return [effect.count];
    case 'shatter':
      return [effect.perStack];
    case 'power':
      return [];
  }
}

const cards = Object.entries(CARDS);
const has = (card: CardDef, kind: Effect['kind']) => card.effects.some((e) => e.kind === kind);

describe('CARDS', () => {
  it('has the ten cards of the P1 content target', () => {
    expect(cards).toHaveLength(10);
  });

  describe.each(cards)('%s', (key, card) => {
    it('is filed under its own id and has a name', () => {
      expect(card.id).toBe(key);
      expect(card.name.trim()).not.toBe('');
    });

    it('costs 0 to 3 and has a known type and rarity', () => {
      expect(isInt(card.cost, 0, 3)).toBe(true);
      expect(['Attack', 'Skill', 'Power']).toContain(card.type);
      expect(['common', 'rare']).toContain(card.rarity);
    });

    it('has at least one tag, each known and listed once', () => {
      expect(card.tags.length).toBeGreaterThan(0);
      for (const tag of card.tags) expect(TAGS).toContain(tag);
      expect(new Set(card.tags).size).toBe(card.tags.length);
    });

    it('has at least one effect, each of a known kind and well formed', () => {
      expect(card.effects.length).toBeGreaterThan(0);
      expect(card.effects.map(effectProblem)).toEqual(card.effects.map(() => null));
    });

    it('has short text that shows every number and keyword it uses', () => {
      expect(card.text.trim()).not.toBe('');
      expect(card.text.length).toBeLessThanOrEqual(70);
      for (const n of card.effects.flatMap(numbersOf))
        expect(card.text).toMatch(new RegExp(`\\b${n}\\b`));
      expect(card.text.includes('Exhaust')).toBe(card.exhaust === true);
      if (has(card, 'shatter')) expect(card.text).toContain('Shatter');
      for (const effect of card.effects) {
        if (effect.kind === 'applyStatus') expect(card.text).toContain(effect.status);
      }
    });

    it('is an Attack exactly when it deals damage', () => {
      expect(card.type === 'Attack').toBe(has(card, 'damage'));
    });
  });

  it.each(TAGS)('has a basic attack, a status applier, and a skill for %s', (tag) => {
    const tagged = cards.map(([, card]) => card).filter((card) => card.tags.includes(tag));
    expect(tagged.some((card) => card.type === 'Attack')).toBe(true);
    expect(
      tagged.some((card) =>
        card.effects.some((e) => e.kind === 'applyStatus' && e.status === TAG_STATUS[tag]),
      ),
    ).toBe(true);
    expect(tagged.some((card) => card.type === 'Skill')).toBe(true);
  });

  it('has a tag-synergy attack', () => {
    const synergy = cards.filter(([, card]) =>
      card.effects.some((e) => e.kind === 'damage' && e.perTagPlayed !== undefined),
    );
    expect(synergy.length).toBeGreaterThan(0);
  });

  it('is plain JSON data (R2 rule 5)', () => {
    expect(JSON.parse(JSON.stringify(CARDS))).toEqual(CARDS);
  });
});

describe('STARTER_DECK', () => {
  it('holds ten known cards: one of each card', () => {
    expect(STARTER_DECK).toHaveLength(10);
    for (const id of STARTER_DECK) expect(CARDS).toHaveProperty([id]);
    expect([...STARTER_DECK].sort()).toEqual(Object.keys(CARDS).sort());
  });
});

/** Why an intent is malformed, or null. */
function intentProblem(intent: Intent): string | null {
  switch (intent.kind) {
    case 'attack':
      return isInt(intent.damage, 1) && isInt(intent.hits, 1) ? null : 'attack';
    case 'block':
      return isInt(intent.amount, 1) ? null : 'block';
    case 'buff':
      return isInt(intent.strength, 1) ? null : 'buff';
    case 'debuff':
      return STATUSES.includes(intent.status) && isInt(intent.amount, 1) ? null : 'debuff';
    default:
      return `unknown intent kind "${(intent as { kind: string }).kind}"`;
  }
}

describe('ENEMIES', () => {
  const enemies = Object.entries(ENEMIES);

  it('has the two normal enemies of the P1 content target, and no elite or boss yet', () => {
    expect(enemies.map(([, enemy]) => enemy.tier)).toEqual(['normal', 'normal']);
  });

  describe.each(enemies)('%s', (key, enemy) => {
    it('is filed under its own id, with a name and a whole number of HP', () => {
      expect(enemy.id).toBe(key);
      expect(enemy.name.trim()).not.toBe('');
      expect(isInt(enemy.maxHp, 1)).toBe(true);
    });

    it('has a three-step intent cycle of well-formed intents, at least one an attack', () => {
      expect(enemy.intents).toHaveLength(3);
      expect(enemy.intents.map(intentProblem)).toEqual([null, null, null]);
      expect(enemy.intents.some((intent) => intent.kind === 'attack')).toBe(true);
    });
  });

  it('the test fight chooses only from the normal enemies', () => {
    expect(TEST_FIGHT_ENEMIES.length).toBeGreaterThan(0);
    for (const id of TEST_FIGHT_ENEMIES) expect(ENEMIES[id]?.tier).toBe('normal');
  });

  it('is plain JSON data (R2 rule 5)', () => {
    expect(JSON.parse(JSON.stringify(ENEMIES))).toEqual(ENEMIES);
  });
});

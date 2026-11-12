import { render, screen, within } from '@testing-library/react';
import type { CardDef } from '@daily-delve/shared';
import { describe, expect, it } from 'vitest';
import { Card, splitName } from './Card.tsx';

const SAMPLES: { tagClassName: string; card: CardDef }[] = [
  {
    tagClassName: 'card--fire',
    card: {
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
  },
  {
    tagClassName: 'card--frost',
    card: {
      id: 'halvard',
      name: 'Halvard, the Icewarden',
      type: 'Skill',
      tags: ['Frost'],
      rarity: 'common',
      cost: 1,
      effects: [{ kind: 'shield', amount: 7 }],
      text: 'Gain 7 Shield.',
    },
  },
  {
    tagClassName: 'card--poison',
    card: {
      id: 'bog-witch',
      name: 'The Bog Witch',
      type: 'Power',
      tags: ['Poison'],
      rarity: 'rare',
      cost: 2,
      effects: [
        {
          kind: 'power',
          power: {
            kind: 'turnStart',
            effect: { kind: 'applyStatus', status: 'Poison', amount: 2, target: 'allEnemies' },
          },
        },
      ],
      text: 'At the start of your turn, apply 2 Poison to all enemies.',
    },
  },
];

const KIP = SAMPLES[0]!.card;
const BOG_WITCH = SAMPLES[2]!.card;

/** The rules paragraph. Its text is split into spans, so it is matched as a whole. */
function rules(el: HTMLElement): HTMLElement {
  return el.querySelector<HTMLElement>('.card__text')!;
}

describe('Card', () => {
  it.each(SAMPLES)('draws $card.name with its $tagClassName color', ({ tagClassName, card }) => {
    render(<Card card={card} />);
    const el = screen.getByRole('article', { name: card.name });

    expect(within(el).getByRole('heading', { name: card.name })).toBeInTheDocument();
    expect(within(el).getByLabelText(`Cost ${card.cost}`)).toHaveTextContent(String(card.cost));
    expect(rules(el)).toHaveTextContent(card.text);

    const ribbon = el.querySelector('.card__ribbon-text')!;
    expect(ribbon).toHaveTextContent(card.type.toUpperCase());
    expect(ribbon).toHaveTextContent(card.tags[0]!.toUpperCase());
    expect(ribbon).toHaveTextContent(card.rarity.toUpperCase());

    expect(el).toHaveClass('card', tagClassName);
    for (const other of ['card--fire', 'card--frost', 'card--poison']) {
      if (other !== tagClassName) expect(el).not.toHaveClass(other);
    }
  });

  it('draws the name in capitals over its title', () => {
    render(<Card card={KIP} />);
    expect(screen.getByText('KIP')).toHaveClass('card__name');
    expect(screen.getByText('the Matchstick Kid')).toHaveClass('card__title');
  });

  it('draws a name with no title on its own', () => {
    const { container } = render(<Card card={BOG_WITCH} />);
    expect(screen.getByText('THE BOG WITCH')).toHaveClass('card__name');
    expect(container.querySelector('.card__title')).toBeNull();
  });

  it('colors numbers gold and keywords by element in the rules text', () => {
    render(<Card card={KIP} />);
    const text = rules(screen.getByRole('article', { name: KIP.name }));
    const numbers = [...text.querySelectorAll('.card__num')].map((n) => n.textContent);
    expect(numbers).toEqual(['3', '1']);
    expect(within(text).getByText('Burn')).toHaveClass('card__kw', 'card__kw--fire');
  });

  it('shrinks long rules text', () => {
    render(
      <>
        <Card card={KIP} />
        <Card card={BOG_WITCH} />
      </>,
    );
    expect(rules(screen.getByRole('article', { name: KIP.name })).className).toBe('card__text');
    expect(rules(screen.getByRole('article', { name: BOG_WITCH.name }))).toHaveClass(
      'card__text--medium',
    );
  });

  it('marks rare cards and leaves common cards unmarked', () => {
    render(
      <>
        <Card card={KIP} />
        <Card card={BOG_WITCH} />
      </>,
    );
    expect(screen.getByRole('article', { name: KIP.name })).not.toHaveClass('card--rare');
    expect(screen.getByRole('article', { name: BOG_WITCH.name })).toHaveClass('card--rare');
  });

  it('gives a two-tag card both color classes, both tag labels, and the first tag as accent', () => {
    const card: CardDef = { ...KIP, id: 'steam', name: 'Steam Burst', tags: ['Fire', 'Frost'] };
    render(<Card card={card} />);
    const el = screen.getByRole('article', { name: 'Steam Burst' });
    expect(el).toHaveClass('card--fire', 'card--frost', 'card--primary-fire');
    const tags = [...el.querySelectorAll('.card__tag')].map((t) => t.textContent);
    expect(tags.join('')).toContain('FIRE');
    expect(tags.join('')).toContain('FROST');
  });

  it('shows flavor text with a divider only when given', () => {
    const { container, rerender } = render(<Card card={KIP} />);
    expect(container.querySelector('.card__flavor')).toBeNull();
    rerender(<Card card={KIP} flavor="“Small spark. Big trouble.”" />);
    expect(screen.getByText('“Small spark. Big trouble.”')).toHaveClass('card__flavor');
    expect(container.querySelector('.card__divider-gem')).not.toBeNull();
  });

  it('draws the HP heart only when HP is given', () => {
    const { container, rerender } = render(<Card card={KIP} />);
    expect(container.querySelector('.card__heart')).toBeNull();
    rerender(<Card card={KIP} hp={5} />);
    expect(screen.getByLabelText('5 HP')).toHaveTextContent('5');
  });

  it("draws a character's illustration when the card has one", () => {
    const { container } = render(<Card card={KIP} />);
    const art = container.querySelector('.card__art')!;
    expect(art.querySelector('[id$="-art-character"]')).not.toBeNull();
    expect(art.querySelector('.card__art-glyph')).toBeNull();
  });

  it('draws the tag placeholder for a card with no illustration yet', () => {
    const card: CardDef = { ...KIP, id: 'no-art-yet', name: 'Bram, the Footsoldier' };
    const { container } = render(<Card card={card} />);
    const art = container.querySelector('.card__art')!;
    expect(art.querySelector('[id$="-art-character"]')).toBeNull();
    expect(art.querySelector('.card__art-glyph')).not.toBeNull();
  });

  it('gives every card on a page its own gradient ids', () => {
    const { container } = render(
      <>
        <Card card={KIP} />
        <Card card={KIP} />
        <Card card={BOG_WITCH} />
      </>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((node) => node.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('draws with inline SVG and no image files', () => {
    const { container } = render(<Card card={SAMPLES[1]!.card} />);
    expect(container.querySelector('svg.card__svg')).not.toBeNull();
    expect(container.querySelector('img, image')).toBeNull();
  });
});

describe('splitName', () => {
  it('splits at the first comma', () => {
    expect(splitName('Kip, the Matchstick Kid')).toEqual({
      name: 'Kip',
      title: 'the Matchstick Kid',
    });
  });

  it('keeps a name with no comma whole', () => {
    expect(splitName('Grandmother Glacier')).toEqual({ name: 'Grandmother Glacier', title: null });
  });
});

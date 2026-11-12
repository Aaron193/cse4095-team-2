import { render, screen, within } from '@testing-library/react';
import type { CardDef } from '@daily-delve/shared';
import { describe, expect, it } from 'vitest';
import { Card } from './Card.tsx';

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

describe('Card', () => {
  it.each(SAMPLES)('draws $card.name with its $tagClassName color', ({ tagClassName, card }) => {
    render(<Card card={card} />);
    const el = screen.getByRole('article', { name: card.name });

    expect(within(el).getByRole('heading', { name: card.name })).toBeInTheDocument();
    expect(within(el).getByLabelText(`Cost ${card.cost}`)).toHaveTextContent(String(card.cost));
    expect(within(el).getByText(card.text)).toBeInTheDocument();
    expect(within(el).getByText(card.type)).toBeInTheDocument();
    expect(within(el).getByText(card.tags[0]!)).toBeInTheDocument();

    expect(el).toHaveClass('card', tagClassName);
    for (const other of ['card--fire', 'card--frost', 'card--poison']) {
      if (other !== tagClassName) expect(el).not.toHaveClass(other);
    }
  });

  it('marks rare cards and leaves common cards unmarked', () => {
    render(
      <>
        <Card card={SAMPLES[0]!.card} />
        <Card card={SAMPLES[2]!.card} />
      </>,
    );
    expect(screen.getByRole('article', { name: 'Kip, the Matchstick Kid' })).not.toHaveClass(
      'card--rare',
    );
    expect(screen.getByRole('article', { name: 'The Bog Witch' })).toHaveClass('card--rare');
  });

  it('gives a two-tag card both color classes and both tag labels', () => {
    const card: CardDef = {
      ...SAMPLES[0]!.card,
      id: 'steam',
      name: 'Steam Burst',
      tags: ['Fire', 'Frost'],
    };
    render(<Card card={card} />);
    const el = screen.getByRole('article', { name: 'Steam Burst' });
    expect(el).toHaveClass('card--fire', 'card--frost');
    expect(within(el).getByText('Fire')).toHaveClass('card__tag--fire');
    expect(within(el).getByText('Frost')).toHaveClass('card__tag--frost');
  });

  it('draws with inline SVG and no image files', () => {
    const { container } = render(<Card card={SAMPLES[1]!.card} />);
    expect(container.querySelector('svg.card__art')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});

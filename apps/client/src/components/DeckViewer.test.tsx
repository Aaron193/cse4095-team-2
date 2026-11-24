// The deck viewer (task P2-C5), opened on a fixture deck.
import { CARDS } from '@daily-delve/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import { fixtureMapRun } from '../game/fixtures/index.ts';
import { TestFightScreen } from '../screens/TestFightScreen.tsx';
import { DeckButton, groupDeck } from './DeckViewer.tsx';

/** The fixture run's deck after two rewards: one more Kip and two more Nix. */
const DECK = [...fixtureMapRun().deck, 'nix', 'kip', 'nix'];

describe('groupDeck', () => {
  it('counts each card once, most copies first', () => {
    const groups = groupDeck(DECK);
    expect(groups.map((group) => [group.id, group.count]).slice(0, 2)).toEqual([
      ['nix', 3],
      ['kip', 2],
    ]);
    expect(groups.reduce((sum, group) => sum + group.count, 0)).toBe(DECK.length);
    expect(new Set(groups.map((group) => group.id)).size).toBe(groups.length);
  });
});

describe('DeckViewer', () => {
  it('opens from the Deck button and lists each card with its count', async () => {
    const user = userEvent.setup();
    render(<DeckButton deck={DECK} />);
    await user.click(screen.getByRole('button', { name: 'Deck (13)' }));

    const dialog = screen.getByRole('dialog', { name: 'Your deck (13 cards)' });
    const counts = new Map<string, number>();
    for (const id of DECK) counts.set(id, (counts.get(id) ?? 0) + 1);
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(counts.size);
    for (const [id, count] of counts) {
      const name = CARDS[id]!.name;
      const row = within(dialog).getByRole('listitem', {
        name: `${name}, ${count} ${count === 1 ? 'copy' : 'copies'}`,
      });
      expect(row).toHaveTextContent(name);
      expect(row).toHaveTextContent(`×${count}`);
    }
  });

  it('closes with the close button and with Escape', async () => {
    const user = userEvent.setup();
    render(<DeckButton deck={DECK} />);

    await user.click(screen.getByRole('button', { name: 'Deck (13)' }));
    await user.click(screen.getByRole('button', { name: 'Close the deck' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deck (13)' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says so when the deck is empty', async () => {
    const user = userEvent.setup();
    render(<DeckButton deck={[]} />);
    await user.click(screen.getByRole('button', { name: 'Deck (0)' }));
    expect(screen.getByText('The deck is empty.')).toBeInTheDocument();
  });

  it('opens from the combat screen', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TestFightScreen seed="p2-c5" />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Deck (10)' }));
    expect(screen.getByRole('dialog', { name: 'Your deck (10 cards)' })).toBeInTheDocument();
  });
});

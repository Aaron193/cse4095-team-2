// The dungeon screen on the hand-written fixture dungeon (task P2-C1).
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fixtureMapRun } from '../game/fixtures/index.ts';
import { MapScreen } from './MapScreen.tsx';

describe('MapScreen', () => {
  it('lists every fixture site with its type and tile', () => {
    const state = fixtureMapRun();
    render(<MapScreen state={state} />);
    const list = screen.getByRole('list', { name: 'Sites' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(state.dungeon.nodes.length);

    const types = { fight: 'Fight', elite: 'Elite', shrine: 'Shrine', boss: 'Boss' };
    for (const node of state.dungeon.nodes) {
      const cleared = state.cleared.includes(node.id);
      const item = within(list).getByRole('listitem', {
        name: `${node.id}: ${types[node.type]} at (${node.x}, ${node.y}), ${cleared ? 'cleared' : 'not cleared'}`,
      });
      expect(item).toHaveTextContent(types[node.type]);
    }
  });

  it("shows the player's position", () => {
    render(<MapScreen state={fixtureMapRun()} />);
    expect(screen.getByRole('status')).toHaveTextContent('You stand at (4, 8).');
  });

  it('names the site the player stands on', () => {
    render(<MapScreen state={fixtureMapRun((state) => (state.pos = { x: 4, y: 6 }))} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'You stand at (4, 6) on the fight site n2.',
    );
  });

  it('marks cleared sites', () => {
    render(<MapScreen state={fixtureMapRun()} />);
    expect(screen.getByRole('listitem', { name: /^n2: Fight/ })).toHaveTextContent('Cleared');
    expect(screen.getByRole('listitem', { name: /^n9: Boss/ })).not.toHaveTextContent('Cleared');
  });

  it('shows HP, sites cleared out of the total, and steps', () => {
    render(<MapScreen state={fixtureMapRun()} />);
    expect(screen.getByText('HP', { selector: 'dt' }).nextElementSibling).toHaveTextContent(
      '48 / 60',
    );
    expect(screen.getByText('Sites', { selector: 'dt' }).nextElementSibling).toHaveTextContent(
      '1 / 10',
    );
    expect(screen.getByText('Steps', { selector: 'dt' }).nextElementSibling).toHaveTextContent('9');
  });

  it('draws a canvas sized to the grid', () => {
    const { container } = render(<MapScreen state={fixtureMapRun()} />);
    const canvas = container.querySelector('canvas')!;
    expect(canvas.width).toBe(33 * 16);
    expect(canvas.height).toBe(19 * 16);
  });

  it('opens the deck viewer from the Deck button', async () => {
    const user = userEvent.setup();
    render(<MapScreen state={fixtureMapRun()} />);
    await user.click(screen.getByRole('button', { name: 'Deck (10)' }));
    expect(screen.getByRole('dialog', { name: 'Your deck (10 cards)' })).toBeInTheDocument();
  });
});

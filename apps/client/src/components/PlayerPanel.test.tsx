import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FIXTURE_HP, FIXTURE_MAX_HP, fixtureCombat } from '../game/fixtures/index.ts';
import { PlayerPanel } from './PlayerPanel.tsx';

/** The number shown under a label such as "Energy" or "Discard". */
function valueOf(name: string): string | null {
  const term = screen.getByText(name, { selector: 'dt' });
  return term.nextElementSibling?.textContent ?? null;
}

function renderPanel(props: Partial<Parameters<typeof PlayerPanel>[0]> = {}) {
  const dispatch = vi.fn();
  render(
    <PlayerPanel
      hp={FIXTURE_HP}
      maxHp={FIXTURE_MAX_HP}
      combat={fixtureCombat()}
      dispatch={dispatch}
      {...props}
    />,
  );
  return dispatch;
}

describe('PlayerPanel', () => {
  it('shows HP, Shield, and statuses from the fixture', () => {
    renderPanel();
    const you = screen.getByRole('region', { name: 'You' });
    expect(within(you).getByText('48 / 60')).toBeInTheDocument();
    expect(within(you).getByRole('meter', { name: 'Your HP' })).toHaveAttribute(
      'aria-valuenow',
      '48',
    );
    expect(within(you).getByLabelText('Shield 4')).toBeInTheDocument();
    expect(within(you).getByLabelText('Chill 2')).toBeInTheDocument();
    expect(within(you).getByLabelText('Poison 1')).toBeInTheDocument();
    expect(within(you).queryByLabelText(/^Burn/)).toBeNull();
  });

  it('shows energy and the draw, discard, and exhaust pile counts', () => {
    renderPanel();
    expect(valueOf('Energy')).toBe('2');
    expect(valueOf('Draw')).toBe('3');
    expect(valueOf('Discard')).toBe('1');
    expect(valueOf('Exhaust')).toBe('1');
  });

  it('dispatches endTurn when End Turn is clicked', async () => {
    const dispatch = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'endTurn' });
  });

  it('does not end the turn once the fight is over', async () => {
    const dispatch = renderPanel({ canEndTurn: false });
    const button = screen.getByRole('button', { name: 'End Turn' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

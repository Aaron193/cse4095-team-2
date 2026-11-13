// Victory and Defeat at the end of the test fight (task P1-C6). Each test drives the fixture
// fight to an outcome through the screen, on the real engine.
import { applyAction } from '@daily-delve/shared';
import type { RunState } from '@daily-delve/shared';
import { render as renderPlain, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { fixtureRun } from '../game/fixtures/index.ts';
import type { GameEngine } from '../game/useGame.ts';
import { TestFightScreen } from '../screens/TestFightScreen.tsx';
import { FightEndOverlay } from './FightEndOverlay.tsx';

/** Renders inside a router, as in the app: the fight's end links back to Today. */
const render = (ui: ReactElement) => renderPlain(<MemoryRouter>{ui}</MemoryRouter>);

/** The fixture fight with the Gel Slime already down and the Bone Archer at 1 HP. */
function nearlyWon(state: RunState): void {
  const [archer, slime] = state.combat!.enemies;
  archer!.hp = 1;
  archer!.shield = 0;
  slime!.hp = 0;
}

/** The fixture fight with the Delver at 1 HP. */
function nearlyLost(state: RunState): void {
  state.hp = 1;
}

/** An engine that starts every fight from the fixture, changed by `change`. */
function fixtureEngine(change: (state: RunState) => void): GameEngine {
  return { start: vi.fn(() => fixtureRun(change)), applyAction };
}

const kip = () =>
  screen.getByRole('button', { name: (label) => label.startsWith('Kip, the Matchstick Kid:') });

describe('FightEndOverlay', () => {
  it('shows Victory when the last enemy falls', async () => {
    const user = userEvent.setup();
    render(<TestFightScreen seed="fixture" engine={fixtureEngine(nearlyWon)} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(kip());
    await user.click(screen.getByRole('button', { name: 'Target Bone Archer' }));

    const dialog = screen.getByRole('dialog', { name: 'Victory' });
    expect(within(dialog).getByText('The Bone Archer and the Gel Slime fall.')).toBeInTheDocument();
    expect(within(dialog).getByText('48 / 60')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Fight again' })).toHaveFocus();
    expect(within(dialog).getByRole('link', { name: 'Back to Today' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.queryByRole('dialog', { name: 'Defeat' })).not.toBeInTheDocument();
  });

  it('shows Defeat when the Delver falls', async () => {
    const user = userEvent.setup();
    render(<TestFightScreen seed="fixture" engine={fixtureEngine(nearlyLost)} />);

    await user.click(screen.getByRole('button', { name: 'End Turn' }));

    const dialog = screen.getByRole('dialog', { name: 'Defeat' });
    expect(within(dialog).getByText('0 / 60')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Victory' })).not.toBeInTheDocument();
  });

  it('restarts the fight on a new seed', async () => {
    const user = userEvent.setup();
    const engine = fixtureEngine(nearlyLost);
    render(<TestFightScreen seed="first" engine={engine} newSeed={() => 'second'} />);
    await user.click(screen.getByRole('button', { name: 'End Turn' }));

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(engine.start).toHaveBeenLastCalledWith('second');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Test fight · seed second')).toBeInTheDocument();
  });

  it('shows the fight numbers from the run stats', () => {
    const state = fixtureRun((run) => {
      nearlyWon(run);
      run.phase = 'ended';
      run.outcome = 'won';
      run.stats = { turns: 7, comboTriggers: 4, steps: 0 };
    });
    render(<FightEndOverlay state={state} onRestart={() => {}} />);
    const stat = (term: string) => screen.getByText(term).nextElementSibling?.textContent;
    expect(stat('Turns')).toBe('7');
    expect(stat('HP left')).toBe('48 / 60');
    expect(stat('Combos')).toBe('4');
  });
});

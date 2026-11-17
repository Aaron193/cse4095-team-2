// The test fight at /play/test-fight on the real engine (task P1-C5).
import { CARDS, createTestFight, ENEMIES, legalActions } from '@daily-delve/shared';
import type { RunState } from '@daily-delve/shared';
import { render as renderPlain, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { TestFightScreen } from './TestFightScreen.tsx';

/** Renders inside a router, as in the app: the fight's end links back to Today. */
const render = (ui: ReactElement) => renderPlain(<MemoryRouter>{ui}</MemoryRouter>);

const SEED = 'p1-c5-test';

/** The first card in the opening hand that deals damage to a chosen enemy, and that enemy. */
function firstAttack(state: RunState): { card: string; enemy: string } {
  const combat = state.combat!;
  for (const action of legalActions(state)) {
    if (action.type !== 'playCard' || action.target === undefined) continue;
    const card = CARDS[combat.hand[action.handIndex]!]!;
    if (!card.effects.some((effect) => effect.kind === 'damage')) continue;
    return { card: card.name, enemy: ENEMIES[combat.enemies[action.target]!.defId]!.name };
  }
  throw new Error(`no attack in the opening hand for seed ${SEED}`);
}

const cardButton = (name: string) =>
  screen.getByRole('button', { name: (label) => label.startsWith(`${name}:`) });
const hpOf = (enemy: string) =>
  Number(screen.getByRole('meter', { name: `${enemy} HP` }).getAttribute('aria-valuenow'));

describe('TestFightScreen', () => {
  it('starts the fight createTestFight makes for its seed', () => {
    const state = createTestFight(SEED);
    render(<TestFightScreen seed={SEED} />);
    const enemy = state.combat!.enemies[0]!;
    expect(screen.getByRole('region', { name: ENEMIES[enemy.defId]!.name })).toBeInTheDocument();
    expect(hpOf(ENEMIES[enemy.defId]!.name)).toBe(enemy.hp);
    expect(screen.getByLabelText('Turn 1')).toBeInTheDocument();
    expect(screen.getByText(`Test fight · seed ${SEED}`)).toBeInTheDocument();
  });

  it('plays one card and the enemy loses HP', async () => {
    const user = userEvent.setup();
    const { card, enemy } = firstAttack(createTestFight(SEED));
    render(<TestFightScreen seed={SEED} />);
    const before = hpOf(enemy);

    await user.click(cardButton(card));
    expect(screen.getByText('Choose a target for', { exact: false })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: `Target ${enemy}` }));

    expect(hpOf(enemy)).toBeLessThan(before);
    expect(screen.queryByText('Choose a target for', { exact: false })).not.toBeInTheDocument();
  });

  it('Escape puts a selected card back without playing it', async () => {
    const user = userEvent.setup();
    const { card, enemy } = firstAttack(createTestFight(SEED));
    render(<TestFightScreen seed={SEED} />);
    const before = hpOf(enemy);

    await user.click(cardButton(card));
    expect(screen.getByRole('button', { name: `Target ${enemy}` })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('button', { name: `Target ${enemy}` })).not.toBeInTheDocument();
    expect(hpOf(enemy)).toBe(before);
  });

  it('End Turn plays out the enemy turn and starts turn 2', async () => {
    const user = userEvent.setup();
    render(<TestFightScreen seed={SEED} />);
    expect(screen.getByLabelText('Turn 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'End Turn' }));
    expect(screen.getByLabelText('Turn 2')).toBeInTheDocument();
  });
});

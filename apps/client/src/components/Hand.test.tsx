import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { legalActions } from '@daily-delve/shared';
import type { Action, RunState } from '@daily-delve/shared';
import { useMemo } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fixtureRun } from '../game/fixtures/index.ts';
import { useCardPlay } from '../game/useCardPlay.ts';
import { Enemy } from './Enemy.tsx';
import { Hand } from './Hand.tsx';

/** The hand and the enemies, wired together the way the combat screen wires them. */
function Board({ state, dispatch }: { state: RunState; dispatch: (action: Action) => void }) {
  const actions = useMemo(() => legalActions(state), [state]);
  const play = useCardPlay(actions, dispatch);
  const combat = state.combat!;
  return (
    <>
      {combat.enemies.map((enemy, index) => (
        <Enemy
          key={index}
          enemy={enemy}
          index={index}
          targetable={play.targets.includes(index)}
          onTarget={play.clickEnemy}
        />
      ))}
      <Hand
        hand={combat.hand}
        plays={play.plays}
        selected={play.selected}
        onCardClick={play.clickCard}
      />
    </>
  );
}

function setup(change?: (state: RunState) => void) {
  const dispatch = vi.fn();
  render(<Board state={fixtureRun(change)} dispatch={dispatch} />);
  const card = (name: RegExp) => screen.getByRole('button', { name });
  return { dispatch, card };
}

// The fixture hand: Kip (0), Nix (1), Pyra (1), Halvard (1), Brother Ash (1), with 2 energy.
describe('Hand', () => {
  it('draws every card in the hand', () => {
    setup();
    expect(screen.getAllByRole('article')).toHaveLength(5);
  });

  it('plays a card that needs a target on the enemy clicked next', async () => {
    const { dispatch, card } = setup();
    await userEvent.click(card(/^Pyra, the Ember Witch/));
    expect(dispatch).not.toHaveBeenCalled();
    expect(card(/^Pyra, the Ember Witch/)).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Target Gel Slime' }));
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'playCard', handIndex: 2, target: 1 });
  });

  it('offers only living enemies as targets', async () => {
    const { card } = setup((state) => {
      state.combat!.enemies[0]!.hp = 0;
    });
    await userEvent.click(card(/^Kip, the Matchstick Kid/));
    expect(screen.queryByRole('button', { name: 'Target Bone Archer' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Target Gel Slime' })).toBeInTheDocument();
  });

  it('puts a selected card back when it is clicked again', async () => {
    const { dispatch, card } = setup();
    await userEvent.click(card(/^Kip, the Matchstick Kid/));
    await userEvent.click(card(/^Kip, the Matchstick Kid/));
    expect(card(/^Kip, the Matchstick Kid/)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /^Target/ })).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('plays a card that needs no target at once', async () => {
    const { dispatch, card } = setup();
    await userEvent.click(card(/^Halvard, the Icewarden/));
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'playCard', handIndex: 3 });
  });

  it('disables a card that costs more than the energy left, and it dispatches nothing', async () => {
    const { dispatch, card } = setup((state) => {
      state.combat!.energy = 0;
    });
    const nix = card(/^Nix, the Icebreaker/);
    expect(nix).toBeDisabled();
    await userEvent.click(nix);
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^Target/ })).toBeNull();
    // Kip costs 0, so it can still be played.
    expect(card(/^Kip, the Matchstick Kid/)).toBeEnabled();
  });
});

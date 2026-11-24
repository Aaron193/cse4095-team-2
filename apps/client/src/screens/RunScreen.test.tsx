// /play renders by state.phase (task P2-C3). A fake engine starts the run in each phase.
import { applyAction } from '@daily-delve/shared';
import type { RunState } from '@daily-delve/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { fixtureMapRun, fixtureRun } from '../game/fixtures/index.ts';
import type { GameEngine } from '../game/useGame.ts';
import { PlayScreen, seedFromLocation } from './PlayScreen.tsx';

/** An engine whose run starts in `state`. */
const startingIn = (state: RunState): GameEngine => ({ start: () => state, applyAction });

function renderPlay(state: RunState) {
  render(
    <MemoryRouter>
      <PlayScreen seed="p2-c3" engine={startingIn(state)} />
    </MemoryRouter>,
  );
}

describe('/play by phase', () => {
  it('map: the dungeon screen', () => {
    renderPlay(fixtureMapRun());
    expect(screen.getByRole('list', { name: 'Sites' })).toBeInTheDocument();
  });

  it('combat: the combat screen', () => {
    renderPlay(fixtureRun());
    expect(screen.getByLabelText('Turn 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /end turn/i })).toBeInTheDocument();
  });

  it('reward: the reward screen with the offers', () => {
    renderPlay(
      fixtureMapRun((state) => {
        state.phase = 'reward';
        state.rewardOffers = ['pyra', 'nix', 'vex'];
      }),
    );
    expect(screen.getByRole('heading', { name: 'Choose a card' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Offered cards' })).toHaveTextContent(
      'Pyra, the Ember Witch',
    );
  });

  it('shrine: the shrine screen', () => {
    renderPlay(fixtureMapRun((state) => (state.phase = 'shrine')));
    expect(screen.getByRole('heading', { name: 'A quiet shrine' })).toBeInTheDocument();
  });

  it('ended: the run summary, won or lost', () => {
    renderPlay(
      fixtureMapRun((state) => {
        state.phase = 'ended';
        state.outcome = 'won';
        state.nodesCleared = 10;
      }),
    );
    expect(screen.getByRole('heading', { name: 'Dungeon cleared!' })).toBeInTheDocument();
    expect(screen.getByText('Sites cleared 10 / 10')).toBeInTheDocument();
  });

  it('ended and lost', () => {
    renderPlay(
      fixtureMapRun((state) => {
        state.phase = 'ended';
        state.outcome = 'lost';
      }),
    );
    expect(screen.getByRole('heading', { name: 'You fell' })).toBeInTheDocument();
  });

  it('follows the phase when an action changes it', async () => {
    // The fixture fight on a fake engine whose endTurn wins it and returns to the map.
    const engine: GameEngine = {
      start: () => fixtureRun(),
      applyAction: () => ({ ok: true, state: fixtureMapRun() }),
    };
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PlayScreen seed="p2-c3" engine={engine} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /end turn/i }));
    expect(screen.getByRole('list', { name: 'Sites' })).toBeInTheDocument();
  });
});

describe('/play without a run', () => {
  it('sends the player to Today when no seed was passed', () => {
    render(
      <MemoryRouter>
        <PlayScreen engine={startingIn(fixtureMapRun())} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'No run in progress' })).toBeInTheDocument();
  });

  it('reads the seed from the location state', () => {
    expect(seedFromLocation({ seed: 'abc', date: '2026-11-23', mode: 'practice' })).toBe('abc');
    expect(seedFromLocation(null)).toBeNull();
    expect(seedFromLocation({ seed: '' })).toBeNull();
    expect(seedFromLocation('abc')).toBeNull();
  });

  it('shows a message when the engine cannot start the run', () => {
    const broken: GameEngine = {
      start: () => {
        throw new Error('not implemented: createRun (task P2-A3)');
      },
      applyAction,
    };
    // React logs the caught error; keep the test output quiet.
    const original = console.error;
    console.error = () => {};
    try {
      render(
        <MemoryRouter>
          <PlayScreen seed="p2-c3" engine={broken} />
        </MemoryRouter>,
      );
    } finally {
      console.error = original;
    }
    expect(screen.getByRole('alert')).toHaveTextContent('This run could not be started.');
  });
});

// /play (task P2-C3): today's run, on the seed the Today screen started it with. The screen
// inside is chosen by RunScreen from `state.phase`.
import { Component, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { ButtonLink } from '../components/ui/ButtonLink.tsx';
import { RUN_ENGINE, useGame } from '../game/useGame.ts';
import type { GameEngine } from '../game/useGame.ts';
import { ROUTES } from '../routes.ts';
import { RunScreen } from './RunScreen.tsx';

/** What the Today screen passes in the router's location state when it starts a run. */
export interface PlayLocationState {
  seed: string;
  date: string;
  mode: 'official' | 'practice';
}

/** The run's seed from the router's location state, if it has one. */
export function seedFromLocation(state: unknown): string | null {
  if (state === null || typeof state !== 'object') return null;
  const seed = (state as Partial<PlayLocationState>).seed;
  return typeof seed === 'string' && seed !== '' ? seed : null;
}

function Run({ seed, engine }: { seed: string; engine: GameEngine }) {
  const game = useGame(seed, engine);
  return <RunScreen game={game} />;
}

/**
 * Shows a message instead of a blank page when the engine throws, as it does for `createRun`
 * until task P2-A3 lands. Task P3-C4 owns the full error states.
 */
class RunErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="placeholder">
        <h1>The dungeon is not ready</h1>
        <p role="alert">This run could not be started.</p>
        <ButtonLink to={ROUTES.testFight} variant="secondary">
          Play the test fight
        </ButtonLink>
      </section>
    );
  }
}

export interface PlayScreenProps {
  /** The run's seed. Read from the router's location state when left out. */
  seed?: string;
  /** The engine to play on: the real one unless a test passes another. */
  engine?: GameEngine;
}

export function PlayScreen({ seed, engine = RUN_ENGINE }: PlayScreenProps) {
  const location = useLocation();
  const [runSeed] = useState(() => seed ?? seedFromLocation(location.state));

  if (runSeed === null) {
    return (
      <section className="placeholder">
        <h1>No run in progress</h1>
        <p>Start today's dungeon from the Today screen.</p>
        <p>
          <ButtonLink to={ROUTES.home} variant="primary">
            Go to Today
          </ButtonLink>
        </p>
        <ButtonLink to={ROUTES.testFight} variant="ghost" size="sm">
          Play the test fight
        </ButtonLink>
      </section>
    );
  }
  return (
    <RunErrorBoundary>
      <Run seed={runSeed} engine={engine} />
    </RunErrorBoundary>
  );
}

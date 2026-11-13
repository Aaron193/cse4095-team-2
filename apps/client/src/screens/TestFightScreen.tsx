// The Phase 1 test fight at /play/test-fight (tasks P1-C5 and P1-C6): the combat screen on
// the real engine, started with createTestFight, and Victory or Defeat when it ends.
import { useState } from 'react';
import { FightEndOverlay } from '../components/FightEndOverlay.tsx';
import { ButtonLink } from '../components/ui/ButtonLink.tsx';
import { TEST_FIGHT_ENGINE, useGame } from '../game/useGame.ts';
import type { GameEngine } from '../game/useGame.ts';
import { ROUTES } from '../routes.ts';
import { CombatScreen } from './CombatScreen.tsx';

/** Eight random hex digits. The engine never sees where a seed came from. */
export function randomSeed(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export interface TestFightScreenProps {
  /** The first fight's seed. A random one when left out. */
  seed?: string;
  /** The engine to play on: the real one unless a test passes another. */
  engine?: GameEngine;
  /** Makes the seed for each new fight. */
  newSeed?: () => string;
}

export function TestFightScreen({
  seed,
  engine = TEST_FIGHT_ENGINE,
  newSeed = randomSeed,
}: TestFightScreenProps) {
  const [firstSeed] = useState(() => seed ?? newSeed());
  const game = useGame(firstSeed, engine);
  return (
    <>
      <CombatScreen game={game} subtitle={`Test fight · seed ${game.seed}`} />
      {game.state.phase === 'ended' ? (
        <FightEndOverlay state={game.state} onRestart={() => game.restart(newSeed())}>
          <ButtonLink to={ROUTES.home} variant="ghost" size="sm">
            Back to Today
          </ButtonLink>
        </FightEndOverlay>
      ) : null}
    </>
  );
}

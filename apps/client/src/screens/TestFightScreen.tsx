// The Phase 1 test fight at /play/test-fight (task P1-C5): the combat screen on the real
// engine, started with createTestFight.
import { useState } from 'react';
import { TEST_FIGHT_ENGINE, useGame } from '../game/useGame.ts';
import type { GameEngine } from '../game/useGame.ts';
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
  return <CombatScreen game={game} subtitle={`Test fight · seed ${game.seed}`} />;
}

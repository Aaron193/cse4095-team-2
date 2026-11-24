// The run flow (task P2-C3; Docs/screens.md): /play shows one game screen, chosen by
// `state.phase` alone. There is no navigation between them: an action changes the phase and
// the screen follows.
import type { Game } from '../game/useGame.ts';
import { CombatScreen } from './CombatScreen.tsx';
import { MapScreen } from './MapScreen.tsx';
import { RewardScreen } from './RewardScreen.tsx';
import { RunSummaryScreen } from './RunSummaryScreen.tsx';
import { ShrineScreen } from './ShrineScreen.tsx';

export function RunScreen({ game }: { game: Game }) {
  const { state } = game;
  switch (state.phase) {
    case 'map':
      return <MapScreen state={state} />;
    case 'combat':
      return <CombatScreen game={game} />;
    case 'reward':
      return <RewardScreen state={state} />;
    case 'shrine':
      return <ShrineScreen state={state} />;
    case 'ended':
      return <RunSummaryScreen state={state} />;
  }
}

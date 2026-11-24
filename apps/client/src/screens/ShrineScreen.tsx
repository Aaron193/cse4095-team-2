// The shrine screen, shown when `state.phase === 'shrine'` (Docs/screens.md, Shrine). Task
// P2-C6 builds its Heal and Remove choices.
import type { RunState } from '@daily-delve/shared';
import { DeckButton } from '../components/DeckViewer.tsx';
import { Placeholder } from './Placeholder.tsx';

export function ShrineScreen({ state }: { state: RunState }) {
  return (
    <Placeholder title="A quiet shrine" task="P2-C6">
      <p>
        HP {state.hp} / {state.maxHp}
      </p>
      <DeckButton deck={state.deck} />
    </Placeholder>
  );
}

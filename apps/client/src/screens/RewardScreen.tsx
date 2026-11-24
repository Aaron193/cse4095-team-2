// The reward screen, shown when `state.phase === 'reward'` (Docs/screens.md, Reward and deck).
// Until task P2-C4 builds it, it names the offered cards and opens the deck viewer.
import { CARDS } from '@daily-delve/shared';
import type { RunState } from '@daily-delve/shared';
import { DeckButton } from '../components/DeckViewer.tsx';
import { Placeholder } from './Placeholder.tsx';

export function RewardScreen({ state }: { state: RunState }) {
  return (
    <Placeholder title="Choose a card" task="P2-C4">
      <p>
        HP {state.hp} / {state.maxHp}
      </p>
      <ul aria-label="Offered cards">
        {(state.rewardOffers ?? []).map((id, index) => (
          <li key={index}>{CARDS[id]?.name ?? id}</li>
        ))}
      </ul>
      <DeckButton deck={state.deck} />
    </Placeholder>
  );
}

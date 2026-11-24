// The run summary, shown when `state.phase === 'ended'` (Docs/screens.md, Run summary). Task
// P2-C9 adds the score from `summarize` and the submit.
import type { RunState } from '@daily-delve/shared';
import { ButtonLink } from '../components/ui/ButtonLink.tsx';
import { ROUTES } from '../routes.ts';
import { Placeholder } from './Placeholder.tsx';

export function RunSummaryScreen({ state }: { state: RunState }) {
  return (
    <Placeholder title={state.outcome === 'won' ? 'Dungeon cleared!' : 'You fell'} task="P2-C9">
      <p>
        Sites cleared {state.nodesCleared} / {state.dungeon.nodes.length}
      </p>
      <ButtonLink to={ROUTES.home} variant="secondary">
        Back to Today
      </ButtonLink>
    </Placeholder>
  );
}

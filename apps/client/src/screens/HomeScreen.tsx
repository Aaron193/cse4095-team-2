// Today's dungeon at / (task P2-C8; Docs/screens.md, Today's dungeon). It loads
// GET /api/dungeons/today and offers an Official run and a Practice run on the returned seed.
// Once today's official run is verified, its result takes the Official button's place.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { generateDungeon } from '@daily-delve/shared';
import type { Dungeon, RunSummary, TodayResponse } from '@daily-delve/shared';
import { getToday } from '../api/client.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { DeterminismCheck } from '../components/DeterminismCheck.tsx';
import { Button } from '../components/ui/Button.tsx';
import { ButtonLink } from '../components/ui/ButtonLink.tsx';
import { LoadingState } from '../components/ui/LoadingState.tsx';
import { startView } from '../game/map/render.ts';
import { ROUTES } from '../routes.ts';
import { DungeonCanvas } from './MapScreen.tsx';
import type { PlayLocationState } from './PlayScreen.tsx';
import './HomeScreen.css';

type Load =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; today: TodayResponse };

function OfficialResult({ run }: { run: RunSummary }) {
  const reached =
    run.outcome === 'won' ? 'Cleared the dungeon' : `Cleared ${run.nodesCleared} sites`;
  return (
    <section className="today__official" aria-label="Your official run">
      <h2 className="today__official-title">Your official run</h2>
      <p className="today__official-reached">{reached}</p>
      <dl className="today__official-stats">
        <div>
          <dt>Score</dt>
          <dd>{run.score}</dd>
        </div>
        <div>
          <dt>Turns</dt>
          <dd>{run.turns}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{run.verified ? 'Verified' : 'Not verified'}</dd>
        </div>
      </dl>
    </section>
  );
}

/** The day's map, or a note when the dungeon cannot be generated in this build. */
function MapPreview({ seed, preview }: { seed: string; preview: (seed: string) => Dungeon }) {
  const dungeon = useMemo(() => {
    try {
      return preview(seed);
    } catch {
      return null;
    }
  }, [seed, preview]);
  if (!dungeon) {
    return <p className="today__preview-missing">The map preview is not available yet.</p>;
  }
  return (
    <figure className="today__preview" aria-label="Map preview">
      <DungeonCanvas state={startView(dungeon)} />
      <figcaption>
        {dungeon.nodes.length} sites · {dungeon.nodes.filter((n) => n.type === 'shrine').length}{' '}
        shrines · 1 boss
      </figcaption>
    </figure>
  );
}

export interface HomeScreenProps {
  /** Makes the map preview from the seed. The real generator unless a test passes another. */
  preview?: (seed: string) => Dungeon;
}

export function HomeScreen({ preview = generateDungeon }: HomeScreenProps) {
  const { user, status: authStatus } = useAuth();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const userId = user?.id ?? null;

  // Reloaded when the player logs in or out: officialRun is the caller's own.
  useEffect(() => {
    if (authStatus === 'loading') return undefined;
    const controller = new AbortController();
    setLoad({ status: 'loading' });
    getToday({ signal: controller.signal }).then(
      (today) => setLoad({ status: 'ready', today }),
      () => {
        if (!controller.signal.aborted) setLoad({ status: 'failed' });
      },
    );
    return () => controller.abort();
  }, [authStatus, userId, attempt]);

  const start = (today: TodayResponse, mode: PlayLocationState['mode']) => {
    const state: PlayLocationState = { seed: today.seed, date: today.date, mode };
    void navigate(ROUTES.play, { state });
  };

  let body;
  if (load.status === 'loading') {
    body = <LoadingState label="Opening today's dungeon…" />;
  } else if (load.status === 'failed') {
    body = (
      <div className="today__failed" role="alert">
        <p>Today's dungeon could not be loaded.</p>
        <Button onClick={retry}>Retry</Button>
      </div>
    );
  } else {
    const { today } = load;
    const official = today.officialRun;
    body = (
      <>
        <p className="today__date">
          <time dateTime={today.date}>{today.date}</time>
        </p>
        <MapPreview seed={today.seed} preview={preview} />
        {official ? <OfficialResult run={official} /> : null}
        <div className="today__actions">
          {user ? (
            <>
              {official ? null : (
                <Button variant="primary" size="lg" onClick={() => start(today, 'official')}>
                  Official run
                </Button>
              )}
              <Button size="lg" onClick={() => start(today, 'practice')}>
                Practice run
              </Button>
            </>
          ) : (
            <>
              <ButtonLink to={ROUTES.login} variant="primary" size="lg">
                Official run
              </ButtonLink>
              <ButtonLink to={ROUTES.login} size="lg">
                Practice run
              </ButtonLink>
            </>
          )}
        </div>
        <p className="today__note">
          {official
            ? 'Your official run for today is in. Practice runs do not count.'
            : 'One official run a day counts for the leaderboard.'}
        </p>
      </>
    );
  }

  return (
    <section className="today">
      <h1 className="today__title">Today's Dungeon</h1>
      {body}
      <footer className="today__dev">
        <ButtonLink to={ROUTES.testFight} variant="ghost" size="sm">
          Play the test fight
        </ButtonLink>
        <DeterminismCheck />
      </footer>
    </section>
  );
}

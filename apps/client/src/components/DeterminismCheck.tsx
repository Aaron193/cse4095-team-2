// The first determinism check (task P0-D4): the browser and the server each draw five numbers
// from the shared random generator, and this panel shows both lists side by side.
import { useEffect, useState } from 'react';
import { ENGINE_VERSION } from '@daily-delve/shared';
import type { Health } from '@daily-delve/shared';
import { ApiClientError, getHealth } from '../api/client.ts';
import { browserRngCheck, sameNumbers } from '../game/selfcheck.ts';
import './DeterminismCheck.css';

type ServerState =
  | { status: 'loading' }
  | { status: 'ready'; health: Health }
  | { status: 'error'; message: string };

/** A short reason for the error message: "no answer", or the status and code. */
function describeFailure(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.code === 'NETWORK_ERROR' ? 'no answer' : `${error.status} ${error.code}`;
  }
  return error instanceof Error ? error.message : 'unknown error';
}

export function DeterminismCheck() {
  const [browser] = useState(browserRngCheck);
  const [server, setServer] = useState<ServerState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    getHealth({ signal: controller.signal }).then(
      (health) => setServer({ status: 'ready', health }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setServer({ status: 'error', message: describeFailure(error) });
      },
    );
    return () => controller.abort();
  }, []);

  const serverNumbers = server.status === 'ready' ? server.health.rngCheck : null;
  const numbersMatch = serverNumbers !== null && sameNumbers(browser, serverNumbers);
  const versionsMatch = server.status === 'ready' && server.health.engineVersion === ENGINE_VERSION;

  return (
    <section className="check" aria-labelledby="check-title">
      <h2 id="check-title" className="check__title">
        Determinism check
      </h2>
      <p className="check__intro">
        The browser and the server each draw five numbers from the shared random generator. They
        must be the same.
      </p>

      <dl className="check__rows">
        <div className="check__row">
          <dt>Browser</dt>
          <dd aria-label="Browser numbers">{browser.join(', ')}</dd>
          <dd className="check__version">engine {ENGINE_VERSION}</dd>
        </div>
        <div className="check__row">
          <dt>Server</dt>
          <dd aria-label="Server numbers">
            {server.status === 'loading' && 'Loading…'}
            {server.status === 'error' && 'Unavailable'}
            {serverNumbers !== null && serverNumbers.join(', ')}
          </dd>
          <dd className="check__version">
            {server.status === 'ready' ? `engine ${server.health.engineVersion}` : ''}
          </dd>
        </div>
      </dl>

      {server.status === 'loading' && (
        <p className="check__result" role="status">
          Asking the server…
        </p>
      )}
      {server.status === 'error' && (
        <p className="check__result check__result--bad" role="alert">
          Could not reach the server ({server.message}). Start it with <code>npm run dev</code>.
        </p>
      )}
      {server.status === 'ready' && numbersMatch && versionsMatch && (
        <p className="check__result check__result--good" role="status">
          Match. The browser and the server agree.
        </p>
      )}
      {server.status === 'ready' && !numbersMatch && (
        <p className="check__result check__result--bad" role="alert">
          Mismatch. The browser and the server drew different numbers.
        </p>
      )}
      {server.status === 'ready' && numbersMatch && !versionsMatch && (
        <p className="check__result check__result--bad" role="alert">
          The numbers match, but the engine versions differ. Reload the page.
        </p>
      )}
    </section>
  );
}

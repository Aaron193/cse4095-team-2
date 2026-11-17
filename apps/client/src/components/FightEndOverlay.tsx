// The end of the test fight (task P1-C6): Victory or Defeat over the final board, a few
// numbers from the fight, and a button that starts a new fight on a new seed.
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import type { RunState } from '@daily-delve/shared';
import { enemyName } from '../game/intents.ts';
import './FightEndOverlay.css';

export interface FightEndOverlayProps {
  /** A state with phase 'ended'. */
  state: RunState;
  onRestart: () => void;
  /** Shown under the restart button, such as a link away from the fight. */
  children?: ReactNode;
}

/** "the Bone Archer" or "the Bone Archer and the Gel Slime". */
function foesOf(state: RunState): { names: string; many: boolean } {
  const names = (state.combat?.enemies ?? []).map((enemy) => `the ${enemyName(enemy)}`);
  if (names.length === 0) return { names: 'the enemy', many: false };
  return { names: names.join(' and '), many: names.length > 1 };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function FightEndOverlay({ state, onRestart, children }: FightEndOverlayProps) {
  const won = state.outcome === 'won';
  const titleId = useId();
  const restart = useRef<HTMLButtonElement>(null);
  useEffect(() => restart.current?.focus(), []);

  const { names, many } = foesOf(state);
  let line: string;
  if (won) line = `${capitalize(names)} ${many ? 'fall' : 'falls'}.`;
  else if (state.hp > 0) line = 'The fight dragged on too long, and the dark closed in.';
  else line = `${capitalize(names)} ${many ? 'have' : 'has'} bested you.`;

  return (
    <div
      className={`fight-end fight-end--${won ? 'won' : 'lost'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="fight-end__rays" aria-hidden="true" />
      <div className="fight-end__panel">
        <p className="fight-end__kicker">{won ? 'The fight is won' : 'The fight is lost'}</p>
        <h2 id={titleId} className="fight-end__title">
          {won ? 'Victory' : 'Defeat'}
        </h2>
        <p className="fight-end__line">{line}</p>
        <dl className="fight-end__stats">
          <div className="fight-end__stat">
            <dt>Turns</dt>
            <dd>{state.stats.turns}</dd>
          </div>
          <div className="fight-end__stat">
            <dt>HP left</dt>
            <dd>
              {state.hp} / {state.maxHp}
            </dd>
          </div>
          <div className="fight-end__stat">
            <dt>Combos</dt>
            <dd>{state.stats.comboTriggers}</dd>
          </div>
        </dl>
        <button ref={restart} type="button" className="fight-end__restart" onClick={onRestart}>
          {won ? 'Fight again' : 'Try again'}
        </button>
        <p className="fight-end__note">Starts a new fight on a new seed.</p>
        {children ? <div className="fight-end__more">{children}</div> : null}
      </div>
    </div>
  );
}

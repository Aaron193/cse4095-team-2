// The combat screen (task P1-C5; Docs/screens.md, Combat). It draws a game whose state is in
// combat and turns clicks into actions for the game store. What can be played, and on whom,
// comes from legalActions; the screen never works out a result itself.
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { CARDS, legalActions } from '@daily-delve/shared';
import { splitName } from '../components/Card.tsx';
import { Enemy } from '../components/Enemy.tsx';
import { Hand } from '../components/Hand.tsx';
import { PlayerPanel } from '../components/PlayerPanel.tsx';
import type { Game } from '../game/useGame.ts';
import { useCardPlay } from '../game/useCardPlay.ts';
import './CombatScreen.css';

/** Fixed ember positions (left %, delay s, duration s, size rem), so every visit looks alike. */
const EMBERS: [number, number, number, number][] = [
  [6, 0, 9, 0.3],
  [14, 3.2, 11, 0.2],
  [22, 6.1, 8, 0.25],
  [31, 1.4, 12, 0.18],
  [39, 7.4, 10, 0.3],
  [47, 4.6, 9, 0.22],
  [55, 2.2, 13, 0.2],
  [63, 8.3, 9, 0.28],
  [71, 5.1, 11, 0.2],
  [79, 0.8, 10, 0.26],
  [86, 6.9, 12, 0.18],
  [94, 3.9, 9, 0.24],
];

function Embers() {
  return (
    <div className="combat__embers" aria-hidden="true">
      {EMBERS.map(([left, delay, duration, size]) => (
        <span
          key={left}
          className="combat__ember"
          style={
            {
              '--left': `${left}%`,
              '--delay': `${delay}s`,
              '--duration': `${duration}s`,
              '--size': `${size}rem`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export interface CombatScreenProps {
  game: Game;
  /** The place shown at the top of the screen. */
  place?: string;
  /** The line under it. */
  subtitle?: string;
}

export function CombatScreen({ game, place = 'The Sunken Halls', subtitle }: CombatScreenProps) {
  const { state, dispatch } = game;
  const actions = useMemo(() => legalActions(state), [state]);
  const play = useCardPlay(actions, dispatch);
  const { selected, cancel } = play;

  // Escape puts a selected card back.
  useEffect(() => {
    if (selected === null) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, cancel]);

  const combat = state.combat;
  if (!combat) return null;

  const inFight = state.phase === 'combat';
  const selectedCard = selected === null ? undefined : CARDS[combat.hand[selected] ?? ''];
  const classes = ['combat'];
  if (selectedCard) classes.push('combat--aiming');

  return (
    <div
      className={classes.join(' ')}
      onClick={(event) => {
        // A click on the empty stage puts a selected card back.
        if (event.target === event.currentTarget) cancel();
      }}
    >
      <div className="combat__backdrop" aria-hidden="true" />
      <Embers />

      <header className="combat__hud">
        <p className="combat__turn" aria-label={`Turn ${combat.turn}`}>
          <span className="combat__turn-word">Turn</span>
          <span className="combat__turn-number">{combat.turn}</span>
        </p>
        <div className="combat__place">
          <h1 className="combat__place-name">{place}</h1>
          {/* One line under the name: the seed, or while aiming, how to aim. Its height is
              fixed, so nothing on the board moves when a card is picked up. */}
          <div className="combat__note-line">
            <p className="combat__place-note" hidden={Boolean(selectedCard || game.error)}>
              {subtitle ?? `Seed ${state.seed}`}
            </p>
            <div className="combat__hint" role="status">
              {selectedCard ? (
                <p className="combat__hint-text">
                  Choose a target for <strong>{splitName(selectedCard.name).name}</strong>
                  <span className="combat__hint-keys">
                    <kbd>Esc</kbd> to cancel
                  </span>
                </p>
              ) : null}
            </div>
            {game.error && !selectedCard ? (
              <p className="combat__error" role="alert">
                {game.error.message}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <PlayerPanel
        hp={state.hp}
        maxHp={state.maxHp}
        combat={combat}
        dispatch={dispatch}
        canEndTurn={inFight}
        suggestEndTurn={inFight && play.plays.size === 0}
      />

      <div className="combat__enemies">
        {combat.enemies.map((enemy, index) => (
          <Enemy
            key={index}
            enemy={enemy}
            index={index}
            targetable={play.targets.includes(index)}
            onTarget={play.clickEnemy}
          />
        ))}
      </div>

      <div className="combat__hand">
        <Hand
          hand={combat.hand}
          plays={play.plays}
          selected={selected}
          onCardClick={play.clickCard}
        />
      </div>
    </div>
  );
}

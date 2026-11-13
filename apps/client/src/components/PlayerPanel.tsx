// The player's side of a fight (task P1-C3): the Delver with HP, Shield, and statuses, the
// energy orb, the draw, discard, and exhaust piles, and the End Turn button.
//
// The panel's root uses `display: contents`, so its four parts are placed directly in the
// combat screen's grid (the figure on the stage, the orb and the piles in the corners).
import type { ReactNode } from 'react';
import type { Action, CombatState } from '@daily-delve/shared';
import { DELVER_PORTRAIT } from './art/portraits.ts';
import { HealthBar } from './HealthBar.tsx';
import { CardsIcon, DiscardIcon, ExhaustIcon } from './icons.tsx';
import { Pops, usePops } from './Pops.tsx';
import { StatusBadges } from './StatusBadges.tsx';
import './PlayerPanel.css';

export interface PlayerPanelProps {
  hp: number;
  maxHp: number;
  combat: CombatState;
  dispatch: (action: Action) => void;
  /** False once the fight is over: End Turn is then disabled. */
  canEndTurn?: boolean;
  /** True when no card can be played, so End Turn is the move to make. */
  suggestEndTurn?: boolean;
}

function Pile({ name, count, icon }: { name: string; count: number; icon: ReactNode }) {
  return (
    <div className={`pile pile--${name.toLowerCase()}`} title={`${name} pile: ${count}`}>
      <span className="pile__icon">{icon}</span>
      <dt className="pile__name">{name}</dt>
      <dd className="pile__count">{count}</dd>
    </div>
  );
}

export function PlayerPanel({
  hp,
  maxHp,
  combat,
  dispatch,
  canEndTurn = true,
  suggestEndTurn = false,
}: PlayerPanelProps) {
  const { player } = combat;
  const { pops, hits } = usePops(hp, player.shield);
  const endTurnClass = suggestEndTurn && canEndTurn ? 'end-turn end-turn--suggested' : 'end-turn';

  return (
    <div className="player-panel">
      <section className="player" aria-label="You">
        <div className="player__figure">
          <div className="player__ground" aria-hidden="true" />
          <div className="player__glow" aria-hidden="true" />
          <div key={hits} className={hits > 0 ? 'player__body player__body--hit' : 'player__body'}>
            <img className="player__art" src={DELVER_PORTRAIT} alt="" draggable={false} />
          </div>
          <Pops pops={pops} />
        </div>
        <div className="player__plate">
          <h3 className="player__name">The Delver</h3>
          <HealthBar hp={hp} maxHp={maxHp} shield={player.shield} label="Your HP" />
          <StatusBadges statuses={player.statuses} />
        </div>
      </section>

      <dl className="player-panel__energy">
        <div className={combat.energy > 0 ? 'energy' : 'energy energy--empty'}>
          <dt className="energy__name">Energy</dt>
          <dd className="energy__value">{combat.energy}</dd>
        </div>
        <Pile name="Draw" count={combat.drawPile.length} icon={<CardsIcon />} />
      </dl>

      <div className="player-panel__end">
        <dl className="piles">
          <Pile name="Discard" count={combat.discardPile.length} icon={<DiscardIcon />} />
          <Pile name="Exhaust" count={combat.exhaustPile.length} icon={<ExhaustIcon />} />
        </dl>
        <button
          type="button"
          className={endTurnClass}
          disabled={!canEndTurn}
          onClick={() => dispatch({ type: 'endTurn' })}
        >
          End Turn
        </button>
      </div>
    </div>
  );
}

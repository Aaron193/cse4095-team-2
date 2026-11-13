// One enemy in a fight (task P1-C2): its figure, the intent it is showing, its name, HP bar,
// Shield, and status badges. While a card that needs a target is selected, an enemy that can
// take it is clickable.
import type { EnemyState, Intent } from '@daily-delve/shared';
import { enemyName, intentLabel, shownIntent } from '../game/intents.ts';
import { ENEMY_PORTRAITS } from './art/portraits.ts';
import { HealthBar } from './HealthBar.tsx';
import { ShieldIcon, STATUS_ICONS, StrengthIcon, SwordIcon } from './icons.tsx';
import { Pops, usePops } from './Pops.tsx';
import { StatusBadges } from './StatusBadges.tsx';
import './Enemy.css';

export interface EnemyProps {
  enemy: EnemyState;
  /** The enemy's index in `combat.enemies`: the `target` of a play aimed at it. */
  index: number;
  /** True while the selected card can be aimed at this enemy. */
  targetable?: boolean;
  onTarget?: (index: number) => void;
}

function IntentIcon({ intent }: { intent: Intent }) {
  switch (intent.kind) {
    case 'attack':
      return <SwordIcon className="intent__icon" />;
    case 'block':
      return <ShieldIcon className="intent__icon" />;
    case 'buff':
      return <StrengthIcon className="intent__icon" />;
    case 'debuff': {
      const Icon = STATUS_ICONS[intent.status];
      return <Icon className="intent__icon" />;
    }
  }
}

function IntentBadge({ intent }: { intent: Intent }) {
  const variant = intent.kind === 'debuff' ? intent.status.toLowerCase() : intent.kind;
  return (
    <div className={`intent intent--${variant}`} title="What this enemy does next">
      <IntentIcon intent={intent} />
      <span className="intent__label">{intentLabel(intent)}</span>
    </div>
  );
}

export function Enemy({ enemy, index, targetable = false, onTarget }: EnemyProps) {
  const name = enemyName(enemy);
  const defeated = enemy.hp <= 0;
  const intent = defeated ? null : shownIntent(enemy);
  const portrait = ENEMY_PORTRAITS[enemy.defId];
  const { pops, hits } = usePops(enemy.hp, enemy.shield);

  const classes = ['enemy', `enemy--${enemy.defId}`];
  if (defeated) classes.push('enemy--defeated');
  if (targetable) classes.push('enemy--targetable');

  return (
    <section className={classes.join(' ')} aria-label={name}>
      <div className="enemy__intent-slot">{intent ? <IntentBadge intent={intent} /> : null}</div>
      <div className="enemy__figure">
        <div className="enemy__ground" aria-hidden="true" />
        <div key={hits} className={hits > 0 ? 'enemy__body enemy__body--hit' : 'enemy__body'}>
          {portrait ? (
            <img className="enemy__art" src={portrait} alt="" draggable={false} />
          ) : (
            <div className="enemy__art enemy__art--missing" />
          )}
        </div>
        <Pops pops={pops} />
      </div>
      <div className="enemy__plate">
        <h3 className="enemy__name">{name}</h3>
        <HealthBar hp={enemy.hp} maxHp={enemy.maxHp} shield={enemy.shield} label={`${name} HP`} />
        <StatusBadges statuses={enemy.statuses} strength={enemy.strength} />
        {defeated ? <p className="enemy__defeated">Defeated</p> : null}
      </div>
      {targetable && onTarget ? (
        <button
          type="button"
          className="enemy__target"
          aria-label={`Target ${name}`}
          onClick={() => onTarget(index)}
        />
      ) : null}
    </section>
  );
}

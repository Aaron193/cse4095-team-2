// An HP bar with the unit's Shield beside it, shared by enemies and the player.
import { ShieldIcon } from './icons.tsx';
import './HealthBar.css';

export interface HealthBarProps {
  hp: number;
  maxHp: number;
  shield: number;
  /** The meter's accessible name, for example "Bone Archer HP". */
  label: string;
}

export function HealthBar({ hp, maxHp, shield, label }: HealthBarProps) {
  const percent = maxHp > 0 ? Math.min(100, Math.max(0, (hp / maxHp) * 100)) : 0;
  const width = `${percent}%`;
  return (
    <div className={shield > 0 ? 'health health--shielded' : 'health'}>
      {shield > 0 ? (
        <span className="health__shield" aria-label={`Shield ${shield}`} title={`Shield ${shield}`}>
          <ShieldIcon className="health__shield-icon" />
          <span className="health__shield-value">{shield}</span>
        </span>
      ) : null}
      <div
        className="health__bar"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={maxHp}
        aria-valuenow={hp}
        aria-valuetext={`${hp} of ${maxHp}`}
      >
        <div className="health__lag" style={{ width }} />
        <div className="health__fill" style={{ width }} />
        <span className="health__text">
          {hp} / {maxHp}
        </span>
      </div>
    </div>
  );
}

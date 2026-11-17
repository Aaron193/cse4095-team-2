// Status badges: Burn, Chill, and Poison stacks, and an enemy's strength. A status at 0 is
// not drawn.
import type { Statuses, StatusId } from '@daily-delve/shared';
import { STATUS_ICONS, StrengthIcon } from './icons.tsx';
import './StatusBadges.css';

const STATUS_ORDER: readonly StatusId[] = ['Burn', 'Chill', 'Poison'];

export interface StatusBadgesProps {
  statuses: Statuses;
  /** An enemy's strength, drawn as a badge when above 0. */
  strength?: number;
}

export function StatusBadges({ statuses, strength = 0 }: StatusBadgesProps) {
  const shown = STATUS_ORDER.filter((status) => statuses[status] > 0);
  if (shown.length === 0 && strength <= 0) return null;
  return (
    <ul className="badges" aria-label="Statuses">
      {strength > 0 ? (
        <li
          className="badge badge--strength"
          aria-label={`Strength ${strength}`}
          title={`Strength ${strength}`}
        >
          <StrengthIcon className="badge__icon" />
          <span className="badge__value">{strength}</span>
        </li>
      ) : null}
      {shown.map((status) => {
        const Icon = STATUS_ICONS[status];
        const label = `${status} ${statuses[status]}`;
        return (
          <li
            key={status}
            className={`badge badge--${status.toLowerCase()}`}
            aria-label={label}
            title={label}
          >
            <Icon className="badge__icon" />
            <span className="badge__value">{statuses[status]}</span>
          </li>
        );
      })}
    </ul>
  );
}

// A pill for a short fact (task P1-D4), like the concept art's "PARTY HP 71/93": an optional
// gold disc, an optional small label, and the value. The header shows the player's name in one.
import type { ComponentPropsWithRef, ReactNode } from 'react';
import './Chip.css';

export interface ChipProps extends ComponentPropsWithRef<'span'> {
  /** A short label before the value, in small spaced capitals, such as "Gold". */
  label?: ReactNode;
  /** One or two characters in a gold disc at the start, such as an initial. Decorative. */
  badge?: ReactNode;
}

export function Chip({ label, badge, className, children, ...rest }: ChipProps) {
  const classes = ['chip', badge !== undefined && 'chip--badge', className].filter(Boolean);
  return (
    <span {...rest} className={classes.join(' ')}>
      {badge !== undefined ? (
        <span className="chip__badge" aria-hidden="true">
          {badge}
        </span>
      ) : null}
      {label !== undefined ? <span className="chip__label">{label}</span> : null}
      <span className="chip__value">{children}</span>
    </span>
  );
}

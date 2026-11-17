// Small inline icons for the combat screen, on a 24 by 24 grid, drawn in currentColor so CSS
// colors them. Decorative: every icon sits next to text or inside a labeled element.
import type { ReactNode, SVGProps } from 'react';
import type { StatusId } from '@daily-delve/shared';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SwordIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 3v3.6L10.6 17 7 13.4 17.4 3Z" fill="currentColor" />
      <path
        d="M4.8 12.4l6.8 6.8M7.6 16.4 4.2 19.8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="3.6" cy="20.4" r="1.7" fill="currentColor" />
    </Icon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M12 2.2 20.2 5.3v5.9c0 5.1-3.5 9.1-8.2 10.6-4.7-1.5-8.2-5.5-8.2-10.6V5.3Z"
        fill="currentColor"
      />
      <path d="M12 4.6v14.8c3.3-1.4 5.8-4.5 5.8-8.4V6.9Z" fill="#fff" opacity="0.22" />
    </Icon>
  );
}

export function StrengthIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.8 19.4 10.6h-4.5V17H9.1v-6.4H4.6Z" fill="currentColor" />
      <rect x="5.6" y="18.6" width="12.8" height="2.8" rx="1.4" fill="currentColor" />
    </Icon>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M12 1.8c1.5 3.4 5.1 5.4 5.8 9.3.8 4.8-2.3 10-5.8 10s-6.6-3-6-7.8c.4-2.7 2.1-4.2 3.1-5.6.3 1.8 1 2.9 2.2 3.3-.4-3.1.1-6.4.7-9.2Z"
        fill="currentColor"
      />
      <path
        d="M12.2 12.2c.9 1.6 2.4 2.5 2.4 4.4 0 1.8-1.2 3.2-2.6 3.2s-2.6-1.3-2.4-3.1c.1-1.3.9-2.1 1.5-2.8.2.8.6 1.3 1.1 1.4-.2-1.1-.2-2.1 0-3.1Z"
        fill="#fff"
        opacity="0.55"
      />
    </Icon>
  );
}

export function SnowflakeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M12 2.4v19.2M3.7 7.2l16.6 9.6M3.7 16.8l16.6-9.6" />
        <path d="M9.3 4.3 12 6.8l2.7-2.5M9.3 19.7 12 17.2l2.7 2.5" />
        <path d="M4.4 10.6l3.5-1.1-.8-3.6M19.6 13.4l-3.5 1.1.8 3.6" />
        <path d="M19.6 10.6l-3.5-1.1.8-3.6M4.4 13.4l3.5 1.1-.8 3.6" />
      </g>
    </Icon>
  );
}

export function DropletIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M12 2.2c3.1 4.7 6.7 8.5 6.7 12.6a6.7 6.7 0 0 1-13.4 0C5.3 10.7 8.9 6.9 12 2.2Z"
        fill="currentColor"
      />
      <path
        d="M9.2 13.6c-.6 2.2.3 4.2 2.2 5"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.5"
        fill="none"
      />
    </Icon>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M12 21C6.1 17 2.8 13.6 2.8 9.6c0-2.9 2.2-5.1 4.9-5.1 1.8 0 3.4 1 4.3 2.5.9-1.5 2.5-2.5 4.3-2.5 2.7 0 4.9 2.2 4.9 5.1 0 4-3.3 7.4-9.2 11.4Z"
        fill="currentColor"
      />
    </Icon>
  );
}

export function CardsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect
        x="3"
        y="5.5"
        width="11"
        height="15"
        rx="2"
        transform="rotate(-12 8.5 13)"
        fill="currentColor"
        opacity="0.5"
      />
      <rect x="9" y="3.5" width="11" height="15" rx="2" fill="currentColor" />
      <path d="M14.5 7.5l2 3-2 3-2-3Z" fill="#000" opacity="0.35" />
    </Icon>
  );
}

export function DiscardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect
        x="6.5"
        y="3.5"
        width="11"
        height="15"
        rx="2"
        transform="rotate(14 12 11)"
        fill="currentColor"
      />
      <path
        d="M4 20.5h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </Icon>
  );
}

export function ExhaustIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect
        x="5"
        y="4"
        width="11"
        height="15"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeDasharray="2.6 2"
      />
      <path
        d="M16.5 9.5c.8 1.8 2.7 2.9 3.1 5 .4 2.6-1.2 5.3-3.1 5.3s-3.5-1.6-3.2-4.2c.2-1.4 1.1-2.2 1.6-3 .2 1 .6 1.5 1.2 1.7-.2-1.6 0-3.3.4-4.8Z"
        fill="currentColor"
      />
    </Icon>
  );
}

/** The icon drawn for each status. */
export const STATUS_ICONS: Record<StatusId, (props: IconProps) => ReactNode> = {
  Burn: FlameIcon,
  Chill: SnowflakeIcon,
  Poison: DropletIcon,
};

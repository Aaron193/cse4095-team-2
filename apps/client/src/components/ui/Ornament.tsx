// A decorative gold rule for the top of a panel (task P1-D3): two fading lines and a candle
// flame inside a diamond, like the card's divider gem. Hidden from screen readers.
import { useId } from 'react';
import './Ornament.css';

export function Ornament({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const line = `ornament-${uid}-line`;
  const flame = `ornament-${uid}-flame`;
  return (
    <svg
      className={['ornament', className].filter(Boolean).join(' ')}
      viewBox="0 0 160 24"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={line} x1="0" y1="0" x2="160" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0.04" className="ornament__stop-fade" />
          <stop offset="0.38" className="ornament__stop-gold" />
          <stop offset="0.62" className="ornament__stop-gold" />
          <stop offset="0.96" className="ornament__stop-fade" />
        </linearGradient>
        <linearGradient id={flame} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="ornament__stop-fire" />
          <stop offset="1" className="ornament__stop-core" />
        </linearGradient>
      </defs>
      <path className="ornament__line" stroke={`url(#${line})`} d="M6 12H58M102 12H154" />
      <path
        className="ornament__gem"
        d="M64 9.2 66.8 12 64 14.8 61.2 12Z M96 9.2 98.8 12 96 14.8 93.2 12Z"
      />
      <path className="ornament__frame" d="M80 2.2 89.8 12 80 21.8 70.2 12Z" />
      <g className="ornament__flame">
        <path
          fill={`url(#${flame})`}
          d="M80 5.8c1.7 2.4 4 4.1 4 7.2 0 2.6-1.8 4.6-4 4.6s-4-2-4-4.6c0-1.7.8-2.9 1.8-3.8.2 1.4.8 2.1 1.5 2.2-.3-2-.1-3.9.7-5.6Z"
        />
        <path
          className="ornament__core"
          d="M80 11.6c.9 1.2 1.7 2 1.7 3.3 0 1.1-.8 1.9-1.7 1.9s-1.7-.8-1.7-1.9c0-1.3.8-2.1 1.7-3.3Z"
        />
      </g>
    </svg>
  );
}

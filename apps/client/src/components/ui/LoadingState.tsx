// A quiet loading state (task P1-D4): the gold ornament and one line in the middle of the
// screen. It fades in only once a wait is long enough to notice, so quick answers show nothing.
import { Ornament } from './Ornament.tsx';
import './LoadingState.css';

export interface LoadingStateProps {
  /** What is being waited for, also read out by screen readers. Default "Loading…". */
  label?: string;
  className?: string;
}

export function LoadingState({ label = 'Loading…', className }: LoadingStateProps) {
  return (
    <div className={['loading-state', className].filter(Boolean).join(' ')} role="status">
      <Ornament className="loading-state__ornament" />
      <p className="loading-state__label">{label}</p>
    </div>
  );
}

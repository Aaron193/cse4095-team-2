// The LoadingState primitive (task P1-D4).
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingState } from './LoadingState.tsx';

describe('LoadingState', () => {
  it('is a status message', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('says what it waits for', () => {
    render(<LoadingState label="Checking your session…" className="extra" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Checking your session…');
    expect(status).toHaveClass('loading-state', 'extra');
  });
});

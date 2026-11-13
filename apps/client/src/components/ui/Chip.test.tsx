// The Chip primitive (task P1-D4).
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Chip } from './Chip.tsx';

describe('Chip', () => {
  it('shows a value', () => {
    render(<Chip>Delver</Chip>);
    const value = screen.getByText('Delver');
    expect(value).toHaveClass('chip__value');
    expect(value.parentElement).toHaveClass('chip');
    expect(value.parentElement).not.toHaveClass('chip--badge');
  });

  it("can lead with a label, like the concept art's pills", () => {
    render(<Chip label="Gold">64</Chip>);
    expect(screen.getByText('Gold')).toHaveClass('chip__label');
    expect(screen.getByText('Gold').parentElement).toHaveTextContent('Gold64');
  });

  it('can lead with a decorative gold disc', () => {
    render(
      <Chip badge="D" title="Delver" className="extra">
        Delver
      </Chip>,
    );
    const badge = screen.getByText('D');
    expect(badge).toHaveClass('chip__badge');
    expect(badge).toHaveAttribute('aria-hidden', 'true');
    const chip = screen.getByTitle('Delver');
    expect(chip).toHaveClass('chip', 'chip--badge', 'extra');
  });
});

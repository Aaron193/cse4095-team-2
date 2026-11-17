// The shared button (task P1-D3).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button, buttonClassName } from './Button.tsx';

describe('Button', () => {
  it('is a secondary, medium, non-submitting button by default', () => {
    render(
      <form>
        <Button>Back</Button>
      </form>,
    );
    const button = screen.getByRole('button', { name: 'Back' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('btn', 'btn--secondary', 'btn--md');
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-busy');
  });

  it('takes a variant, size, width, and extra class', () => {
    render(
      <Button type="submit" variant="primary" size="lg" block className="end-turn">
        End turn
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'End turn' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveClass('btn', 'btn--primary', 'btn--lg', 'btn--block', 'end-turn');
  });

  it('while loading, is disabled and busy and keeps its label', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Saving…
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Saving…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveClass('btn--loading');

    await userEvent.setup().click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('can be disabled without loading', () => {
    render(<Button disabled>Ghost</Button>);
    const button = screen.getByRole('button', { name: 'Ghost' });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('aria-busy');
  });

  it('passes the ref and other props to the button', async () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    render(
      <Button ref={ref} variant="ghost" aria-label="Close" onClick={onClick}>
        ×
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Close' });
    expect(ref.current).toBe(button);
    await userEvent.setup().click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('buttonClassName', () => {
  it('gives another element, such as a link, the look of a button', () => {
    expect(buttonClassName()).toBe('btn btn--secondary btn--md');
    expect(buttonClassName({ variant: 'ghost', size: 'sm' }, false, 'nav__link')).toBe(
      'btn btn--ghost btn--sm nav__link',
    );
    expect(buttonClassName({ variant: 'primary', block: true })).toBe(
      'btn btn--primary btn--md btn--block',
    );
  });
});

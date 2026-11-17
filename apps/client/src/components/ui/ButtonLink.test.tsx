// The ButtonLink primitive (task P1-D4).
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ButtonLink } from './ButtonLink.tsx';

describe('ButtonLink', () => {
  it('is a link with the look of a button', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ButtonLink variant="secondary" size="sm" to="/register">
          Register
        </ButtonLink>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Register' });
    expect(link).toHaveAttribute('href', '/register');
    expect(link).toHaveClass('btn', 'btn--secondary', 'btn--sm');
    expect(link).not.toHaveAttribute('aria-current');
  });

  it('says when it points at the current page', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <ButtonLink to="/login">Log in</ButtonLink>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Log in' });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(link).toHaveClass('btn', 'btn--secondary', 'btn--md');
  });
});

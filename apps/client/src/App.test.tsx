import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { App } from './App.tsx';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App routes', () => {
  it.each([
    ['/', "Today's Dungeon"],
    ['/login', 'Log in'],
    ['/register', 'Register'],
    ['/play', 'Play'],
    ['/leaderboard', 'Leaderboard'],
    ['/profile', 'Profile'],
  ])('%s renders the %s screen', (path, heading) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('renders a not-found screen for an unknown path', () => {
    renderAt('/no-such-page');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });

  it('navigates between screens from the navigation bar', async () => {
    renderAt('/');
    await userEvent.click(screen.getByRole('link', { name: 'Leaderboard' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Leaderboard' })).toBeInTheDocument();
  });
});

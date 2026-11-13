// The app shell and its routes (tasks P0-C1 and P1-D4), against the mock API (src/mocks).
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { App } from './App.tsx';
import { DEMO_USERNAME, MOCK_PASSWORD, logInAs, sessionUser } from './mocks/data.ts';
import { server } from './mocks/server.ts';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const header = () => screen.getByRole('banner');
const nav = () => screen.getByRole('navigation', { name: 'Main' });
const navLinks = () =>
  within(nav())
    .getAllByRole('link')
    .map((link) => link.textContent);
const findHeading = (name: string) => screen.findByRole('heading', { level: 1, name });

/** Holds every GET /api/me until `answer` is called, then lets the mock API answer it. */
function holdSessionCheck() {
  let answer!: () => void;
  const held = new Promise<void>((resolve) => {
    answer = resolve;
  });
  server.use(
    http.get('/api/me', async () => {
      await held;
    }),
  );
  return answer;
}

async function logInWithForm(username: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Username'), username);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('App routes', () => {
  it.each([
    ['/', "Today's Dungeon"],
    ['/login', 'Log in'],
    ['/register', 'Register'],
    ['/leaderboard', 'Leaderboard'],
  ])('%s renders the %s screen for anyone', async (path, name) => {
    renderAt(path);
    expect(await findHeading(name)).toBeInTheDocument();
  });

  it.each([
    ['/play', 'Play'],
    ['/profile', 'Profile'],
  ])('%s renders the %s screen for a logged-in player', async (path, name) => {
    logInAs(DEMO_USERNAME);
    renderAt(path);
    expect(await findHeading(name)).toBeInTheDocument();
  });

  it('renders a not-found screen for an unknown path', async () => {
    renderAt('/no-such-page');
    expect(await findHeading('Page not found')).toBeInTheDocument();
  });

  it('renders a not-found screen for an unknown page under /play', async () => {
    logInAs(DEMO_USERNAME);
    renderAt('/play/no-such-page');
    expect(await findHeading('Page not found')).toBeInTheDocument();
  });
});

describe('Protected routes', () => {
  it.each(['/play', '/play/test-fight', '/profile'])(
    'send a logged-out visitor of %s to /login',
    async (path) => {
      renderAt(path);
      expect(await findHeading('Log in')).toBeInTheDocument();
    },
  );

  it('come back to the page that sent the visitor, after logging in', async () => {
    renderAt('/profile');
    await findHeading('Log in');
    await logInWithForm(DEMO_USERNAME, MOCK_PASSWORD);
    expect(await findHeading('Profile')).toBeInTheDocument();
  });

  it('wait quietly for the session check instead of redirecting early', async () => {
    logInAs(DEMO_USERNAME);
    const answer = holdSessionCheck();
    renderAt('/profile');

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session…');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    // The header does not offer Log in while it does not know yet.
    expect(within(header()).queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();

    answer();
    expect(await findHeading('Profile')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('Session restore after a reload', () => {
  it('shows the display name in the header and renders /profile', async () => {
    // The session cookie outlives the reload; GET /api/me answers with its user.
    logInAs(DEMO_USERNAME);
    renderAt('/profile');

    expect(await findHeading('Profile')).toBeInTheDocument();
    expect(within(header()).getByText('Delver')).toBeInTheDocument();
    expect(within(header()).getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(within(header()).queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
    expect(navLinks()).toEqual(['Today', 'Leaderboard', 'Profile']);
  });

  it('is logged out when GET /api/me answers 401', async () => {
    renderAt('/');
    expect(await within(header()).findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(navLinks()).toEqual(['Today', 'Leaderboard']);
  });

  it('sends a logged-in player away from /login', async () => {
    logInAs(DEMO_USERNAME);
    renderAt('/login');
    expect(await findHeading("Today's Dungeon")).toBeInTheDocument();
  });
});

describe('Header', () => {
  it('has the brand linking home, and Log in and Register when logged out', async () => {
    renderAt('/leaderboard');
    expect(within(header()).getByRole('link', { name: 'Daily Delve' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(await within(header()).findByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(within(header()).getByRole('link', { name: 'Register' })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(within(header()).queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
  });

  it('marks the link of the current page', async () => {
    renderAt('/leaderboard');
    await findHeading('Leaderboard');
    expect(within(nav()).getByRole('link', { name: 'Leaderboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav()).getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current');
  });

  it('navigates between screens', async () => {
    renderAt('/');
    await userEvent.setup().click(within(nav()).getByRole('link', { name: 'Leaderboard' }));
    expect(await findHeading('Leaderboard')).toBeInTheDocument();
  });

  it('tells screen readers who is logged in', async () => {
    logInAs('featherbane');
    renderAt('/');
    expect(await within(header()).findByText('Logged in as')).toHaveClass('visually-hidden');
    expect(within(header()).getByTitle('Sir Reginald Featherbane')).toHaveTextContent(
      'Logged in as Sir Reginald Featherbane',
    );
  });

  it('logs out: ends the session, forgets the player, and goes to /login', async () => {
    logInAs(DEMO_USERNAME);
    renderAt('/profile');
    await findHeading('Profile');

    await userEvent.setup().click(within(header()).getByRole('button', { name: 'Log out' }));

    expect(await findHeading('Log in')).toBeInTheDocument();
    expect(sessionUser()).toBeUndefined();
    expect(within(header()).queryByText('Delver')).not.toBeInTheDocument();
    expect(within(header()).getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(navLinks()).toEqual(['Today', 'Leaderboard']);
  });

  it('logs out from a page anyone can see, too', async () => {
    logInAs(DEMO_USERNAME);
    renderAt('/leaderboard');
    await userEvent.setup().click(await within(header()).findByRole('button', { name: 'Log out' }));
    expect(await findHeading('Log in')).toBeInTheDocument();
    expect(sessionUser()).toBeUndefined();
  });
});

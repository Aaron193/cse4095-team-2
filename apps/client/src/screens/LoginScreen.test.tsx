// The login screen (task P1-D3), against the mock API (src/mocks).
import type { ApiError } from '@daily-delve/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { DEMO_USERNAME, MOCK_PASSWORD, sessionUser } from '../mocks/data.ts';
import { server } from '../mocks/server.ts';
import { recordAuthRequests, renderAuthScreen } from '../test/renderAuthScreen.tsx';

const usernameInput = () => screen.getByLabelText('Username');
const passwordInput = () => screen.getByLabelText('Password');

/** Fills in the form (empty values are left empty) and presses Log in. */
async function logIn(username: string, password: string) {
  const user = userEvent.setup();
  if (username !== '') await user.type(usernameInput(), username);
  if (password !== '') await user.type(passwordInput(), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
  return user;
}

function answerLoginWith(status: number, error: ApiError['error']) {
  server.use(
    http.post('/api/auth/login', () => HttpResponse.json<ApiError>({ error }, { status })),
  );
}

describe('LoginScreen', () => {
  it('is a labeled form that password managers can fill in', () => {
    renderAuthScreen('/login');
    expect(screen.getByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(usernameInput()).toHaveAttribute('autocomplete', 'username');
    expect(passwordInput()).toHaveAttribute('autocomplete', 'current-password');
    expect(passwordInput()).toHaveAttribute('type', 'password');
  });

  it('logs in and goes to /', async () => {
    renderAuthScreen('/login');
    await logIn(DEMO_USERNAME, MOCK_PASSWORD);

    expect(await screen.findByText('At /')).toBeInTheDocument();
    expect(screen.getByText('Logged in as Delver')).toBeInTheDocument();
    expect(sessionUser()?.username).toBe(DEMO_USERNAME);
  });

  it('accepts the username in any letter case', async () => {
    renderAuthScreen('/login');
    await logIn('DeLvEr', MOCK_PASSWORD);
    expect(await screen.findByText('Logged in as Delver')).toBeInTheDocument();
  });

  it.each([
    ['a wrong password', DEMO_USERNAME, 'not-the-password'],
    ['an unknown username', 'nobody_here', MOCK_PASSWORD],
  ])('shows one form message for %s', async (_case, username, password) => {
    renderAuthScreen('/login');
    await logIn(username, password);

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong username or password.');
    expect(screen.getByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(usernameInput()).not.toHaveAttribute('aria-invalid');
    expect(passwordInput()).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    expect(sessionUser()).toBeUndefined();
  });

  it('checks the fields before sending, and focuses the first one to fix', async () => {
    const sent = recordAuthRequests();
    renderAuthScreen('/login');
    await logIn('', '');

    expect(usernameInput()).toHaveAttribute('aria-invalid', 'true');
    expect(usernameInput()).toHaveAccessibleDescription('Enter your username.');
    expect(passwordInput()).toHaveAttribute('aria-invalid', 'true');
    expect(passwordInput()).toHaveAccessibleDescription('Enter your password.');
    expect(usernameInput()).toHaveFocus();
    expect(sent).toEqual([]);
  });

  it('does not send a username or password outside the R5 limits', async () => {
    const sent = recordAuthRequests();
    renderAuthScreen('/login');
    await logIn('no', 'short');

    expect(usernameInput()).toHaveAccessibleDescription(
      'Usernames are 3 to 20 letters, numbers, or _.',
    );
    expect(passwordInput()).toHaveAccessibleDescription('Passwords are 8 to 72 characters.');
    expect(sent).toEqual([]);
  });

  it("clears a field's error once it is fixed", async () => {
    renderAuthScreen('/login');
    const user = await logIn('', '');
    await user.type(usernameInput(), DEMO_USERNAME);

    expect(usernameInput()).not.toHaveAttribute('aria-invalid');
    expect(usernameInput()).not.toHaveAccessibleDescription();
    expect(passwordInput()).toHaveAttribute('aria-invalid', 'true');
  });

  it('disables the button while logging in', async () => {
    let answer!: () => void;
    const held = new Promise<void>((resolve) => {
      answer = resolve;
    });
    // Holds the request, then lets the mock API answer it as usual.
    server.use(
      http.post('/api/auth/login', async () => {
        await held;
      }),
    );
    renderAuthScreen('/login');
    await logIn(DEMO_USERNAME, MOCK_PASSWORD);

    const button = screen.getByRole('button', { name: 'Logging in…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    answer();
    expect(await screen.findByText('At /')).toBeInTheDocument();
  });

  it('asks the player to wait when there were too many attempts', async () => {
    answerLoginWith(429, { code: 'RATE_LIMITED', message: 'Too many requests' });
    renderAuthScreen('/login');
    await logIn(DEMO_USERNAME, MOCK_PASSWORD);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Wait a minute and try again.',
    );
  });

  it("says so when it can't reach the server", async () => {
    server.use(http.post('/api/auth/login', () => HttpResponse.error()));
    renderAuthScreen('/login');
    await logIn(DEMO_USERNAME, MOCK_PASSWORD);
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server.");
    expect(screen.getByRole('button', { name: 'Log in' })).toHaveFocus();
  });

  it('shows an unexpected server error as a form message', async () => {
    answerLoginWith(500, { code: 'INTERNAL', message: 'Something broke' });
    renderAuthScreen('/login');
    await logIn(DEMO_USERNAME, MOCK_PASSWORD);
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.');
  });

  it('goes back to the protected page that sent the player here', async () => {
    renderAuthScreen('/login', {
      from: { pathname: '/play/test-fight', search: '?n=2', hash: '' },
    });
    await logIn(DEMO_USERNAME, MOCK_PASSWORD);
    expect(await screen.findByText('At /play/test-fight?n=2')).toBeInTheDocument();
  });

  it('links to the register screen', async () => {
    renderAuthScreen('/login');
    expect(screen.getByText(/No account\?/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('link', { name: 'Register' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Register' })).toBeInTheDocument();
  });
});

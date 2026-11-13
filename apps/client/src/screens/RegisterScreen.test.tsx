// The register screen (task P1-D3), against the mock API (src/mocks).
import type { ApiError } from '@daily-delve/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { findUser, sessionUser } from '../mocks/data.ts';
import { server } from '../mocks/server.ts';
import { recordAuthRequests, renderAuthScreen } from '../test/renderAuthScreen.tsx';

const usernameInput = () => screen.getByLabelText('Username');
const displayNameInput = () => screen.getByLabelText(/display name/i);
const passwordInput = () => screen.getByLabelText('Password');

interface Form {
  username?: string;
  displayName?: string;
  password?: string;
}

/** Fills in the form (fields not given are left empty) and presses Create account. */
async function registerWith({ username = '', displayName = '', password = '' }: Form) {
  const user = userEvent.setup();
  if (username !== '') await user.type(usernameInput(), username);
  if (displayName !== '') await user.type(displayNameInput(), displayName);
  if (password !== '') await user.type(passwordInput(), password);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  return user;
}

function answerRegisterWith(status: number, error: ApiError['error']) {
  server.use(
    http.post('/api/auth/register', () => HttpResponse.json<ApiError>({ error }, { status })),
  );
}

describe('RegisterScreen', () => {
  it('is a labeled form with hints and the right autocomplete', () => {
    renderAuthScreen('/register');
    expect(screen.getByRole('heading', { level: 1, name: 'Register' })).toBeInTheDocument();
    expect(usernameInput()).toHaveAttribute('autocomplete', 'username');
    expect(usernameInput()).toHaveAccessibleDescription(
      '3–20 letters, numbers, or _. You log in with it.',
    );
    expect(displayNameInput()).toHaveAccessibleName('Display name Optional');
    expect(displayNameInput()).toHaveAttribute('autocomplete', 'nickname');
    expect(passwordInput()).toHaveAttribute('autocomplete', 'new-password');
    expect(passwordInput()).toHaveAccessibleDescription('8–72 characters.');
  });

  it('creates the account, logs it in, and goes to /', async () => {
    renderAuthScreen('/register');
    await registerWith({
      username: 'New_Delver',
      displayName: 'Lamp Bearer',
      password: 'longenough',
    });

    expect(await screen.findByText('At /')).toBeInTheDocument();
    expect(screen.getByText('Logged in as Lamp Bearer')).toBeInTheDocument();
    expect(findUser('new_delver')).toMatchObject({ displayName: 'Lamp Bearer' });
    expect(sessionUser()?.username).toBe('new_delver');
  });

  it('leaves the display name to the server when it is empty', async () => {
    renderAuthScreen('/register');
    await registerWith({ username: 'quietone', displayName: '   ', password: 'longenough' });
    expect(await screen.findByText('Logged in as quietone')).toBeInTheDocument();
  });

  it('shows a taken username beside the username field', async () => {
    renderAuthScreen('/register');
    // "delver" is a seeded account; usernames are compared without regard to case.
    await registerWith({ username: 'DELVER', password: 'longenough' });

    expect(await screen.findByText('That username is taken.')).toBeInTheDocument();
    expect(usernameInput()).toHaveAttribute('aria-invalid', 'true');
    expect(usernameInput()).toHaveAccessibleDescription('That username is taken.');
    expect(usernameInput()).toHaveFocus();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Register' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('checks the R5 limits before sending', async () => {
    const sent = recordAuthRequests();
    renderAuthScreen('/register');
    await registerWith({
      username: 'no',
      displayName: 'A name far too long to fit',
      password: 'short',
    });

    expect(usernameInput()).toHaveAccessibleDescription('Use 3 to 20 characters.');
    expect(displayNameInput()).toHaveAccessibleDescription('Use at most 24 characters.');
    expect(passwordInput()).toHaveAccessibleDescription('Use at least 8 characters.');
    for (const input of [usernameInput(), displayNameInput(), passwordInput()]) {
      expect(input).toHaveAttribute('aria-invalid', 'true');
    }
    expect(usernameInput()).toHaveFocus();
    expect(sent).toEqual([]);
  });

  it('checks a field when the player leaves it', async () => {
    renderAuthScreen('/register');
    const user = userEvent.setup();
    await user.type(usernameInput(), 'no spaces');
    expect(usernameInput()).not.toHaveAttribute('aria-invalid');

    await user.tab();
    expect(usernameInput()).toHaveAttribute('aria-invalid', 'true');
    expect(usernameInput()).toHaveAccessibleDescription('Use only letters a–z, numbers, and _.');
  });

  it('shows each field the server names in a VALIDATION error beside that field', async () => {
    answerRegisterWith(400, {
      code: 'VALIDATION',
      message: 'Invalid request body: password',
      details: { fields: [{ path: 'password', message: 'Must be 8 to 72 characters' }] },
    });
    renderAuthScreen('/register');
    await registerWith({ username: 'new_delver', password: 'longenough' });

    expect(await screen.findByText('Must be 8 to 72 characters')).toBeInTheDocument();
    expect(passwordInput()).toHaveAttribute('aria-invalid', 'true');
    expect(passwordInput()).toHaveAccessibleDescription('Must be 8 to 72 characters');
    expect(passwordInput()).toHaveFocus();
    expect(usernameInput()).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a VALIDATION error about no field of the form as a form message', async () => {
    answerRegisterWith(400, {
      code: 'VALIDATION',
      message: 'Invalid request body: (body)',
      details: { fields: [{ path: '(body)', message: 'Unrecognized key: "extra"' }] },
    });
    renderAuthScreen('/register');
    await registerWith({ username: 'new_delver', password: 'longenough' });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server did not accept the form. Check it and try again.',
    );
  });

  it('asks the player to wait when there were too many attempts', async () => {
    answerRegisterWith(429, { code: 'RATE_LIMITED', message: 'Too many requests' });
    renderAuthScreen('/register');
    await registerWith({ username: 'new_delver', password: 'longenough' });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Wait a minute and try again.',
    );
  });

  it("says so when it can't reach the server", async () => {
    server.use(http.post('/api/auth/register', () => HttpResponse.error()));
    renderAuthScreen('/register');
    await registerWith({ username: 'new_delver', password: 'longenough' });
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server.");
  });

  it('links to the login screen, keeping where to go back to', async () => {
    renderAuthScreen('/register', { from: { pathname: '/profile', search: '', hash: '' } });
    expect(screen.getByText(/Have an account\?/)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: 'Log in' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();

    await user.type(usernameInput(), 'nightjar');
    await user.type(passwordInput(), 'password1');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('At /profile')).toBeInTheDocument();
  });
});

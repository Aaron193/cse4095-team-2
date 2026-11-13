// The R5 limits checked in the browser, and the words for each server error (task P1-D3).
import { describe, expect, it } from 'vitest';
import { ApiClientError } from '../api/client.ts';
import {
  describeAuthError,
  displayNameError,
  passwordError,
  registerRequest,
  usernameError,
} from './validation.ts';

describe('usernameError', () => {
  it.each(['abc', 'a'.repeat(20), 'Delver_99', '___', '  delver  '])('accepts %j', (value) => {
    expect(usernameError(value, 'register')).toBeNull();
    expect(usernameError(value, 'login')).toBeNull();
  });

  it('asks for a missing username', () => {
    expect(usernameError('', 'login')).toBe('Enter your username.');
    expect(usernameError('  ', 'register')).toBe('Choose a username.');
  });

  it.each([
    ['ab', 'Use 3 to 20 characters.'],
    ['a'.repeat(21), 'Use 3 to 20 characters.'],
    ['del ver', 'Use only letters a–z, numbers, and _.'],
    ['del-ver', 'Use only letters a–z, numbers, and _.'],
    ['délver', 'Use only letters a–z, numbers, and _.'],
  ])('on register, says what is wrong with %j', (value, message) => {
    expect(usernameError(value, 'register')).toBe(message);
  });

  it('on login, states the rule for a username that cannot exist', () => {
    for (const value of ['ab', 'a'.repeat(21), 'del ver']) {
      expect(usernameError(value, 'login')).toBe('Usernames are 3 to 20 letters, numbers, or _.');
    }
  });
});

describe('passwordError', () => {
  it.each(['a'.repeat(8), 'a'.repeat(72), '        '])('accepts %j', (value) => {
    expect(passwordError(value, 'register')).toBeNull();
    expect(passwordError(value, 'login')).toBeNull();
  });

  it('asks for a missing password', () => {
    expect(passwordError('', 'login')).toBe('Enter your password.');
    expect(passwordError('', 'register')).toBe('Choose a password.');
  });

  it('says which limit a new password breaks', () => {
    expect(passwordError('a'.repeat(7), 'register')).toBe('Use at least 8 characters.');
    expect(passwordError('a'.repeat(73), 'register')).toBe('Use at most 72 characters.');
  });

  it('on login, states the rule', () => {
    expect(passwordError('a'.repeat(7), 'login')).toBe('Passwords are 8 to 72 characters.');
    expect(passwordError('a'.repeat(73), 'login')).toBe('Passwords are 8 to 72 characters.');
  });
});

describe('displayNameError', () => {
  it('allows an empty display name, and up to 24 characters', () => {
    expect(displayNameError('')).toBeNull();
    expect(displayNameError('a'.repeat(24))).toBeNull();
    expect(displayNameError(`  ${'a'.repeat(24)}  `)).toBeNull();
  });

  it('rejects 25 characters', () => {
    expect(displayNameError('a'.repeat(25))).toBe('Use at most 24 characters.');
  });
});

describe('registerRequest', () => {
  it('trims the names and keeps the password as typed', () => {
    expect(
      registerRequest({
        username: ' delver ',
        displayName: ' Lamp Bearer ',
        password: ' secret12 ',
      }),
    ).toEqual({ username: 'delver', displayName: 'Lamp Bearer', password: ' secret12 ' });
  });

  it('leaves out an empty display name, so the server uses the username', () => {
    expect(
      registerRequest({ username: 'delver', displayName: '  ', password: 'secret12' }),
    ).toEqual({ username: 'delver', password: 'secret12' });
  });
});

describe('describeAuthError', () => {
  const error = (status: number, code: ApiClientError['code'], details?: unknown) =>
    new ApiClientError(status, code, 'From the server', details);

  it('puts each field of a VALIDATION error beside that field', () => {
    const details = {
      fields: [
        { path: 'username', message: 'Must be 3 to 20 characters' },
        { path: 'username', message: 'Use only letters, numbers, and _' },
        { path: 'password', message: 'Required' },
      ],
    };
    expect(describeAuthError(error(400, 'VALIDATION', details))).toEqual({
      fields: { username: 'Must be 3 to 20 characters', password: 'Required' },
      form: null,
    });
  });

  it('adds a form message for a VALIDATION error it cannot place', () => {
    const rejected = 'The server did not accept the form. Check it and try again.';
    const details = { fields: [{ path: '(body)', message: 'Unrecognized key: "x"' }] };
    expect(describeAuthError(error(400, 'VALIDATION', details))).toEqual({
      fields: {},
      form: rejected,
    });
    expect(describeAuthError(error(413, 'VALIDATION'))).toEqual({ fields: {}, form: rejected });
  });

  it.each([
    ['INVALID_CREDENTIALS', 401, 'Wrong username or password.'],
    ['RATE_LIMITED', 429, 'Too many attempts. Wait a minute and try again.'],
    ['NETWORK_ERROR', 0, "Can't reach the server."],
    ['INTERNAL', 500, 'Something went wrong. Try again.'],
  ] as const)('shows %s as one form message', (code, status, message) => {
    expect(describeAuthError(error(status, code))).toEqual({ fields: {}, form: message });
  });

  it('puts USERNAME_TAKEN beside the username', () => {
    expect(describeAuthError(error(409, 'USERNAME_TAKEN'))).toEqual({
      fields: { username: 'That username is taken.' },
      form: null,
    });
  });

  it('shows an error that did not come from the API client as unexpected', () => {
    expect(describeAuthError(new TypeError('x is undefined'))).toEqual({
      fields: {},
      form: 'Something went wrong. Try again.',
    });
  });
});

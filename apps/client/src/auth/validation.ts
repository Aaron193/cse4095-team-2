// The R5 limits, checked in the browser before the login and register forms are sent
// (task P1-D3), and the words shown for each error the server can answer.
import type { RegisterRequest } from '@daily-delve/shared';
import { ApiClientError } from '../api/client.ts';

export type AuthField = 'username' | 'password' | 'displayName';
export type FieldErrors = Partial<Record<AuthField, string>>;
export type AuthFormKind = 'login' | 'register';

// TODO.md, Reference R5, "Limits".
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
export const DISPLAY_NAME_MAX = 24;
const USERNAME_CHARACTERS = /^[a-z0-9_]+$/i;

export const AUTH_MESSAGES = {
  invalidCredentials: 'Wrong username or password.',
  usernameTaken: 'That username is taken.',
  rateLimited: 'Too many attempts. Wait a minute and try again.',
  network: "Can't reach the server.",
  rejected: 'The server did not accept the form. Check it and try again.',
  unexpected: 'Something went wrong. Try again.',
} as const;

/** On the login form the rules are stated; on the register form they are asked for. */
export function usernameError(value: string, kind: AuthFormKind): string | null {
  const name = value.trim();
  if (name === '') return kind === 'login' ? 'Enter your username.' : 'Choose a username.';
  const allowedCharacters = USERNAME_CHARACTERS.test(name);
  if (allowedCharacters && name.length >= USERNAME_MIN && name.length <= USERNAME_MAX) return null;
  if (kind === 'login') {
    return `Usernames are ${USERNAME_MIN} to ${USERNAME_MAX} letters, numbers, or _.`;
  }
  if (!allowedCharacters) return 'Use only letters a–z, numbers, and _.';
  return `Use ${USERNAME_MIN} to ${USERNAME_MAX} characters.`;
}

export function passwordError(value: string, kind: AuthFormKind): string | null {
  if (value === '') return kind === 'login' ? 'Enter your password.' : 'Choose a password.';
  if (value.length >= PASSWORD_MIN && value.length <= PASSWORD_MAX) return null;
  if (kind === 'login') return `Passwords are ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`;
  return value.length < PASSWORD_MIN
    ? `Use at least ${PASSWORD_MIN} characters.`
    : `Use at most ${PASSWORD_MAX} characters.`;
}

/** The display name is optional: empty is fine, and the server then uses the username. */
export function displayNameError(value: string): string | null {
  return value.trim().length > DISPLAY_NAME_MAX
    ? `Use at most ${DISPLAY_NAME_MAX} characters.`
    : null;
}

/** The register body: names trimmed, and no display name when it was left empty. */
export function registerRequest(values: Record<AuthField, string>): RegisterRequest {
  const request: RegisterRequest = { username: values.username.trim(), password: values.password };
  const displayName = values.displayName.trim();
  if (displayName !== '') request.displayName = displayName;
  return request;
}

function isAuthField(path: unknown): path is AuthField {
  return path === 'username' || path === 'password' || path === 'displayName';
}

export interface AuthErrorText {
  /** Messages to show beside fields. */
  fields: FieldErrors;
  /** A message for the whole form, or null. */
  form: string | null;
}

/** Each field named in a 400 VALIDATION error's `details.fields`, with its message. */
function validationText(details: unknown): AuthErrorText {
  const fields: FieldErrors = {};
  let unplaced = false;
  const list = (details as { fields?: unknown } | null | undefined)?.fields;
  for (const item of Array.isArray(list) ? list : []) {
    const { path, message } = (item ?? {}) as { path?: unknown; message?: unknown };
    if (isAuthField(path) && typeof message === 'string') fields[path] ??= message;
    else unplaced = true;
  }
  const placed = Object.keys(fields).length > 0;
  return { fields, form: placed && !unplaced ? null : AUTH_MESSAGES.rejected };
}

/** What the login and register forms show for an error from the API client. */
export function describeAuthError(error: unknown): AuthErrorText {
  if (!(error instanceof ApiClientError)) return { fields: {}, form: AUTH_MESSAGES.unexpected };
  switch (error.code) {
    case 'VALIDATION':
      return validationText(error.details);
    case 'INVALID_CREDENTIALS':
      return { fields: {}, form: AUTH_MESSAGES.invalidCredentials };
    case 'USERNAME_TAKEN':
      return { fields: { username: AUTH_MESSAGES.usernameTaken }, form: null };
    case 'RATE_LIMITED':
      return { fields: {}, form: AUTH_MESSAGES.rateLimited };
    case 'NETWORK_ERROR':
      return { fields: {}, form: AUTH_MESSAGES.network };
    default:
      return { fields: {}, form: AUTH_MESSAGES.unexpected };
  }
}

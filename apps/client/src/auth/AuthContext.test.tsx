// The auth context (task P1-D3), against the mock API (src/mocks).
import type { User } from '@daily-delve/shared';
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { ApiClientError } from '../api/client.ts';
import { DEMO_USERNAME, MOCK_PASSWORD, findUser, sessionUser } from '../mocks/data.ts';
import { server } from '../mocks/server.ts';
import { AuthProvider, useAuth } from './AuthContext.tsx';

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

describe('AuthProvider', () => {
  it('logs in and holds the user', async () => {
    const { result } = renderAuth();
    let returned: User | undefined;
    await act(async () => {
      returned = await result.current.login({ username: DEMO_USERNAME, password: MOCK_PASSWORD });
    });
    expect(result.current.user).toMatchObject({ username: DEMO_USERNAME, displayName: 'Delver' });
    expect(returned).toEqual(result.current.user);
    expect(result.current.status).toBe('ready');
  });

  it('passes on a failed login and keeps no user', async () => {
    const { result } = renderAuth();
    let failure: unknown;
    await act(async () => {
      await result.current
        .login({ username: DEMO_USERNAME, password: 'not-the-password' })
        .catch((error: unknown) => {
          failure = error;
        });
    });
    expect(failure).toBeInstanceOf(ApiClientError);
    expect(failure).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
    expect(result.current.user).toBeNull();
  });

  it('registers and holds the new user', async () => {
    const { result } = renderAuth();
    await act(async () => {
      await result.current.register({ username: 'lampbearer', password: 'longenough' });
    });
    expect(result.current.user).toMatchObject({
      username: 'lampbearer',
      displayName: 'lampbearer',
    });
    expect(findUser('lampbearer')).toBeDefined();
  });

  it('logs out on the server and forgets the user', async () => {
    const { result } = renderAuth();
    await act(async () => {
      await result.current.login({ username: DEMO_USERNAME, password: MOCK_PASSWORD });
    });
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.user).toBeNull();
    expect(sessionUser()).toBeUndefined();
  });

  it('forgets the user even when the server cannot be told', async () => {
    const { result } = renderAuth();
    await act(async () => {
      await result.current.login({ username: DEMO_USERNAME, password: MOCK_PASSWORD });
    });
    server.use(http.post('/api/auth/logout', () => HttpResponse.error()));
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.user).toBeNull();
  });
});

describe('useAuth', () => {
  it('needs an AuthProvider above it', () => {
    // React reports the error it throws; keep the test output quiet.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    onTestFinished(() => quiet.mockRestore());
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth() must be used inside <AuthProvider>.',
    );
  });
});

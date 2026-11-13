// Who is logged in (tasks P1-D3 and P1-D4). `AuthProvider` restores the session on load with
// GET /api/me, holds the user, and wraps the API's login, register, and logout calls; screens
// read it with `useAuth()`.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { LoginRequest, RegisterRequest, User } from '@daily-delve/shared';
import * as api from '../api/client.ts';

export type AuthStatus = 'loading' | 'ready';

export interface AuthContextValue {
  /** The logged-in user, or null. */
  user: User | null;
  /** `loading` until the app knows whether a session exists. */
  status: AuthStatus;
  /** Logs in and stores the user. Rejects with the API's `ApiClientError`. */
  login: (credentials: LoginRequest) => Promise<User>;
  /** Creates the account, which also logs it in. Rejects with the API's `ApiClientError`. */
  register: (details: RegisterRequest) => Promise<User>;
  /** Ends the session. Always forgets the user here, even when the server cannot be told. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  // The session check still on its way, so that a login, register, or logout can cancel it.
  const restoring = useRef<AbortController | null>(null);

  // On load, ask the server whom the session cookie belongs to.
  useEffect(() => {
    const controller = new AbortController();
    restoring.current = controller;
    api.getMe({ signal: controller.signal }).then(
      ({ user: restored }) => {
        if (controller.signal.aborted) return;
        setUser(restored);
        setStatus('ready');
      },
      () => {
        if (controller.signal.aborted) return;
        // 401: there is no session. Any other failure counts as logged out too; logging in
        // then says what is wrong.
        setStatus('ready');
      },
    );
    return () => controller.abort();
  }, []);

  /** Sets who is logged in. A session check that has not answered yet is out of date. */
  const settle = useCallback((next: User | null) => {
    restoring.current?.abort();
    setUser(next);
    setStatus('ready');
  }, []);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const { user: loggedIn } = await api.login(credentials);
      settle(loggedIn);
      return loggedIn;
    },
    [settle],
  );

  const register = useCallback(
    async (details: RegisterRequest) => {
      const { user: created } = await api.register(details);
      settle(created);
      return created;
    },
    [settle],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // 401 means the session had already ended. Any other failure still logs out here:
      // the player asked to leave, and the session cookie expires on its own.
    } finally {
      settle(null);
    }
  }, [settle]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth() must be used inside <AuthProvider>.');
  return value;
}

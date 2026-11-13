// Who is logged in (task P1-D3). `AuthProvider` holds the user and wraps the API's login,
// register, and logout calls; screens read it with `useAuth()`.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LoginRequest, RegisterRequest, User } from '@daily-delve/shared';
import * as api from '../api/client.ts';

export interface AuthContextValue {
  /** The logged-in user, or null. */
  user: User | null;
  /** `loading` until the app knows whether a session exists. */
  status: 'loading' | 'ready';
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
  const status = 'ready';

  const login = useCallback(async (credentials: LoginRequest) => {
    const { user: loggedIn } = await api.login(credentials);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback(async (details: RegisterRequest) => {
    const { user: created } = await api.register(details);
    setUser(created);
    return created;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // 401 means the session had already ended. Any other failure still logs out here:
      // the player asked to leave, and the session cookie expires on its own.
    } finally {
      setUser(null);
    }
  }, []);

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

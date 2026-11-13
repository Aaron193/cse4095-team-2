// Test helpers for the login and register screens (task P1-D3). The screens render inside what
// they need, the auth provider and a router held in memory, and every other path shows where a
// screen sent the player and who is logged in.
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { onTestFinished } from 'vitest';
import { AuthProvider, useAuth } from '../auth/AuthContext.tsx';
import { server } from '../mocks/server.ts';
import { ROUTES } from '../routes.ts';
import { LoginScreen } from '../screens/LoginScreen.tsx';
import { RegisterScreen } from '../screens/RegisterScreen.tsx';

function Elsewhere() {
  const { pathname, search, hash } = useLocation();
  const { user } = useAuth();
  return (
    <section>
      <h1>Elsewhere</h1>
      <p>{`At ${pathname}${search}${hash}`}</p>
      <p>{user ? `Logged in as ${user.displayName}` : 'Logged out'}</p>
    </section>
  );
}

/** Renders /login and /register at `path`, with `state` as the history state. */
export function renderAuthScreen(path: string, state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <AuthProvider>
        <Routes>
          <Route path={ROUTES.login} element={<LoginScreen />} />
          <Route path={ROUTES.register} element={<RegisterScreen />} />
          <Route path="*" element={<Elsewhere />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** The `/api/auth/*` requests the mock API receives from now until the test ends. */
export function recordAuthRequests(): string[] {
  const sent: string[] = [];
  const listener = ({ request }: { request: Request }) => {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/auth/')) sent.push(`${request.method} ${pathname}`);
  };
  server.events.on('request:start', listener);
  onTestFinished(() => {
    server.events.removeListener('request:start', listener);
  });
  return sent;
}

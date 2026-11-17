// Pages for logged-in players only (task P1-D4). A layout route: every route inside
// <Route element={<RequireAuth />}> renders only for a logged-in player. A logged-out visitor
// goes to /login, which comes back here after logging in.
import { Navigate, Outlet, useLocation } from 'react-router';
import { LoadingState } from '../components/ui/LoadingState.tsx';
import { ROUTES } from '../routes.ts';
import { useAuth } from './AuthContext.tsx';
import type { RedirectState } from './redirect.ts';

export function RequireAuth() {
  const { user, status } = useAuth();
  const location = useLocation();

  // The session check has not answered yet: wait, rather than send a logged-in player away.
  if (status === 'loading') return <LoadingState label="Checking your session…" />;
  if (!user) {
    const state: RedirectState = { from: location };
    return <Navigate to={ROUTES.login} replace state={state} />;
  }
  return <Outlet />;
}

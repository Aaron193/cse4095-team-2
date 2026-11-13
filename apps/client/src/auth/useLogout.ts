// Log out and go to /login (task P1-D4): the header's Log out button, and any other.
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '../routes.ts';
import { useAuth } from './AuthContext.tsx';

export function useLogout(): () => Promise<void> {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return useCallback(async () => {
    // Sends POST /api/auth/logout and forgets the user, even if the server cannot be told.
    await logout();
    // Replace, so Back does not return to a page that may need a login now.
    navigate(ROUTES.login, { replace: true });
  }, [logout, navigate]);
}

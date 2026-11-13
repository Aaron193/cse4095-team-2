// The bar on top of every screen (task P1-D4), after the concept art's: the brand, the main
// links, and on the right who is logged in with Log out, or Log in and Register.
import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import type { User } from '@daily-delve/shared';
import { useAuth } from '../auth/AuthContext.tsx';
import { useLogout } from '../auth/useLogout.ts';
import { ROUTES } from '../routes.ts';
import { Button } from './ui/Button.tsx';
import { ButtonLink } from './ui/ButtonLink.tsx';
import { Chip } from './ui/Chip.tsx';
import './AppHeader.css';

/** The first letter of a name, for the disc in the name chip. */
function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? '?';
}

function LoggedIn({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  // Stays true: once logged out, this part of the header is replaced.
  const [leaving, setLeaving] = useState(false);
  return (
    <>
      <Chip
        className="app-header__player"
        badge={initialOf(user.displayName)}
        title={user.displayName}
      >
        <span className="visually-hidden">Logged in as </span>
        {user.displayName}
      </Chip>
      <Button
        className="app-header__logout"
        variant="ghost"
        size="sm"
        loading={leaving}
        onClick={() => {
          setLeaving(true);
          void onLogout();
        }}
      >
        Log out
      </Button>
    </>
  );
}

export function AppHeader() {
  const { user, status } = useAuth();
  const logout = useLogout();

  return (
    <header className="app-header">
      <div className="app-header__bar">
        <Link className="app-header__brand" to={ROUTES.home}>
          Daily Delve
        </Link>
        <nav className="app-header__nav" aria-label="Main">
          <NavLink className="app-header__link" to={ROUTES.home} end>
            Today
          </NavLink>
          <NavLink className="app-header__link" to={ROUTES.leaderboard}>
            Leaderboard
          </NavLink>
          {user ? (
            <NavLink className="app-header__link" to={ROUTES.profile}>
              Profile
            </NavLink>
          ) : null}
        </nav>
        {/* Empty while the session is checked, so Log in does not flash for a logged-in player. */}
        <div
          className={
            user ? 'app-header__account app-header__account--player' : 'app-header__account'
          }
        >
          {user ? (
            <LoggedIn key={user.id} user={user} onLogout={logout} />
          ) : status === 'ready' ? (
            <>
              <ButtonLink variant="ghost" size="sm" to={ROUTES.login}>
                Log in
              </ButtonLink>
              <ButtonLink variant="secondary" size="sm" to={ROUTES.register}>
                Register
              </ButtonLink>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

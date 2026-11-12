import { NavLink, Route, Routes } from 'react-router';
import { ROUTES } from './routes.ts';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { LeaderboardScreen } from './screens/LeaderboardScreen.tsx';
import { LoginScreen } from './screens/LoginScreen.tsx';
import { NotFoundScreen } from './screens/NotFoundScreen.tsx';
import { PlayScreen } from './screens/PlayScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';
import { RegisterScreen } from './screens/RegisterScreen.tsx';

const NAV_LINKS = [
  { to: ROUTES.home, label: 'Today' },
  { to: ROUTES.play, label: 'Play' },
  { to: ROUTES.leaderboard, label: 'Leaderboard' },
  { to: ROUTES.profile, label: 'Profile' },
  { to: ROUTES.login, label: 'Log in' },
  { to: ROUTES.register, label: 'Register' },
];

/** The routes and a plain navigation bar. Task P1-D4 turns this into the real app shell. */
export function App() {
  return (
    <div className="app">
      <header className="app__header">
        <span className="app__brand">Daily Delve</span>
        <nav className="app__nav" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === ROUTES.home}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app__main">
        <Routes>
          <Route path={ROUTES.home} element={<HomeScreen />} />
          <Route path={ROUTES.login} element={<LoginScreen />} />
          <Route path={ROUTES.register} element={<RegisterScreen />} />
          <Route path={ROUTES.play} element={<PlayScreen />} />
          <Route path={ROUTES.leaderboard} element={<LeaderboardScreen />} />
          <Route path={ROUTES.profile} element={<ProfileScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </main>
    </div>
  );
}

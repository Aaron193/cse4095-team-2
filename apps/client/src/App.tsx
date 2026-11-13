import { Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthContext.tsx';
import { RequireAuth } from './auth/RequireAuth.tsx';
import { AppHeader } from './components/AppHeader.tsx';
import { ROUTES } from './routes.ts';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { LeaderboardScreen } from './screens/LeaderboardScreen.tsx';
import { LoginScreen } from './screens/LoginScreen.tsx';
import { NotFoundScreen } from './screens/NotFoundScreen.tsx';
import { PlayScreen } from './screens/PlayScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';
import { RegisterScreen } from './screens/RegisterScreen.tsx';

/** The app shell (task P1-D4): the header over every screen, and the routes. */
export function App() {
  return (
    <AuthProvider>
      <div className="app">
        <AppHeader />
        <main className="app__main">
          <Routes>
            <Route path={ROUTES.home} element={<HomeScreen />} />
            <Route path={ROUTES.login} element={<LoginScreen />} />
            <Route path={ROUTES.register} element={<RegisterScreen />} />
            <Route path={ROUTES.leaderboard} element={<LeaderboardScreen />} />

            {/* Logged-in players only. A logged-out visitor goes to /login and comes back. */}
            <Route element={<RequireAuth />}>
              <Route path={ROUTES.play}>
                <Route index element={<PlayScreen />} />
                {/* More pages under /play go here, for example
                    <Route path="test-fight" element={<TestFightScreen />} /> (task P1-C5). */}
                <Route path="*" element={<NotFoundScreen />} />
              </Route>
              <Route path={ROUTES.profile} element={<ProfileScreen />} />
            </Route>

            <Route path="*" element={<NotFoundScreen />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

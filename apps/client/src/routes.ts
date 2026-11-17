/** Every client route. Screens and links use these instead of repeating the strings. */
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  play: '/play',
  /** The Phase 1 test fight (task P1-C5). */
  testFight: '/play/test-fight',
  leaderboard: '/leaderboard',
  profile: '/profile',
} as const;

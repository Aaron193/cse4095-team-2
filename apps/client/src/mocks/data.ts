// The in-memory data behind the mock API (task P1-D2). Mock data only: passwords are kept in
// plain text, and one variable stands in for the `dd.sid` session cookie. Tests start every
// test from fresh data (`resetMockData` in src/test/setup.ts).
//
// Seeded accounts all use the password `MOCK_PASSWORD`:
// - `delver` ("Delver") has a run history but no official run today.
// - Twelve more players each have an official, verified run today, which make up today's
//   leaderboard. Log in as one of them (for example `nightjar`) to see your own row on it.
import type { RunSummary, User } from '@daily-delve/shared';

/** The password of every seeded account. */
export const MOCK_PASSWORD = 'password1';

/** The seeded account to try the app with. */
export const DEMO_USERNAME = 'delver';

export interface MockUser extends User {
  /** Plain text, because this is mock data. */
  password: string;
}

export interface MockRun extends RunSummary {
  userId: string;
}

export interface MockData {
  /** The UTC day the data was seeded for: "today" in the sample runs. */
  seededDay: string;
  users: MockUser[];
  runs: MockRun[];
  /** The logged-in user's id: what the session cookie stands for. */
  sessionUserId: string | null;
  /** Times of recent `/api/auth/*` requests, for the rate limit. */
  authRequests: number[];
  /** The number in the next new id. */
  nextId: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The UTC day of a time, "YYYY-MM-DD". */
export function utcDay(time: Date): string {
  return time.toISOString().slice(0, 10);
}

/** The UTC day `days` after `day`. */
export function addDays(day: string, days: number): string {
  return utcDay(new Date(Date.parse(`${day}T00:00:00.000Z`) + days * DAY_MS));
}

type Outcome = 'won' | 'lost';

/** One sample result: outcome, sites cleared, score, turns. The scores follow R3's formula. */
type Result = [Outcome, number, number, number];

// Today's leaderboard, already in R5 order. The last number is how far through the day so far
// the run was submitted, so every run is in the past. The rows tie at each level of the order:
// Ember Queen and Nightjar on score, Old Wick and Sir Reginald on everything but time.
const PLAYERS: [username: string, displayName: string, result: Result, dayFraction: number][] = [
  ['mossbeard', 'Mossbeard', ['won', 12, 1802, 36], 0.32],
  ['emberqueen', 'Ember Queen', ['won', 12, 1786, 38], 0.21],
  ['nightjar', 'Nightjar', ['won', 12, 1786, 43], 0.08],
  ['oldwick', 'Old Wick', ['won', 12, 1755, 45], 0.45],
  ['featherbane', 'Sir Reginald Featherbane', ['won', 12, 1755, 45], 0.52],
  ['wren', 'Wren', ['lost', 10, 1080, 47], 0.27],
  ['lanternjack', 'Lantern Jack', ['lost', 9, 985, 44], 0.61],
  ['frostbite', 'Frostbite', ['lost', 9, 960, 39], 0.05],
  ['cinder', 'Cinder', ['lost', 7, 760, 33], 0.7],
  ['sable', 'Sable', ['lost', 5, 545, 28], 0.38],
  ['bramblewick', 'Bramblewick', ['lost', 3, 330, 19], 0.76],
  ['quill', 'Quill', ['lost', 1, 100, 6], 0.83],
];

function seed(now: Date): MockData {
  const today = utcDay(now);
  const dayStart = Date.parse(`${today}T00:00:00.000Z`);
  const sinceMidnight = now.getTime() - dayStart;
  const earlierToday = (fraction: number) =>
    new Date(dayStart + Math.floor(sinceMidnight * fraction)).toISOString();
  const onDay = (daysAgo: number, time: string) => `${addDays(today, -daysAgo)}T${time}.000Z`;

  const users: MockUser[] = [];
  const runs: MockRun[] = [];
  let nextId = 1;
  const id = (kind: string) => `mock-${kind}-${String(nextId++).padStart(3, '0')}`;

  const addUser = (username: string, displayName: string, joinedDaysAgo: number): MockUser => {
    const user = {
      id: id('user'),
      username,
      displayName,
      joinedAt: onDay(joinedDaysAgo, '12:00:00'),
      password: MOCK_PASSWORD,
    };
    users.push(user);
    return user;
  };
  const addRun = (
    user: MockUser,
    date: string,
    official: boolean,
    result: Result | 'rejected',
    submittedAt: string,
  ) => {
    const verified = result !== 'rejected';
    const [outcome, nodesCleared, score, turns] = verified ? result : [null, 0, 0, 0];
    runs.push({
      id: id('run'),
      userId: user.id,
      date,
      official,
      verified,
      rejectReason: verified ? null : 'RESULT_MISMATCH',
      outcome,
      nodesCleared,
      score,
      turns,
      submittedAt,
    });
  };

  const demo = addUser(DEMO_USERNAME, 'Delver', 3);
  addRun(demo, addDays(today, -2), true, ['won', 12, 1743, 39], onDay(2, '19:42:10'));
  addRun(demo, addDays(today, -1), false, ['lost', 4, 430, 21], onDay(1, '08:15:31'));
  addRun(demo, addDays(today, -1), true, ['lost', 8, 890, 37], onDay(1, '21:03:47'));
  addRun(demo, today, false, 'rejected', earlierToday(0.4));
  addRun(demo, today, false, ['won', 12, 1738, 44], earlierToday(0.6));

  PLAYERS.forEach(([username, displayName, result, dayFraction], index) => {
    const player = addUser(username, displayName, 4 + (index % 6));
    addRun(player, today, true, result, earlierToday(dayFraction));
  });

  return { seededDay: today, users, runs, sessionUserId: null, authRequests: [], nextId };
}

let data: MockData = seed(new Date());

/** The live data. Handlers read and change it in place. */
export function mockData(): MockData {
  return data;
}

/** Back to the seeded data, logged out. `now` sets what "today" is. */
export function resetMockData(now: Date = new Date()): void {
  data = seed(now);
}

/** Replaces the data with a saved copy, for example one kept across a page reload. */
export function loadMockData(saved: MockData): void {
  data = saved;
}

export function findUser(username: string): MockUser | undefined {
  const name = username.toLowerCase();
  return data.users.find((user) => user.username === name);
}

/** The user the session cookie belongs to, if any. */
export function sessionUser(): MockUser | undefined {
  return data.users.find((user) => user.id === data.sessionUserId);
}

/** Starts a session, as if the browser now held that user's cookie. */
export function logInAs(username: string): MockUser {
  const user = findUser(username);
  if (!user) throw new Error(`No mock user "${username}"`);
  data.sessionUserId = user.id;
  return user;
}

export function newId(kind: 'user' | 'run'): string {
  return `mock-${kind}-${String(data.nextId++).padStart(3, '0')}`;
}

/** A user as the API sends it: without the password. */
export function publicUser({ id, username, displayName, joinedAt }: MockUser): User {
  return { id, username, displayName, joinedAt };
}

/** A run as the API sends it: without the owner's id. */
export function runSummary(run: MockRun): RunSummary {
  const { userId: _userId, ...summary } = run;
  return summary;
}

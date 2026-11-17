// The mock API answers the typed client as the real server would (task P1-D2). These run on
// msw/node, started for every test file in src/test/setup.ts.
import { ENGINE_VERSION } from '@daily-delve/shared';
import type { LeaderboardEntry, RegisterRequest, SubmitRunRequest } from '@daily-delve/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiClientError,
  deleteMe,
  deleteRun,
  getHealth,
  getLeaderboard,
  getMe,
  getMyRuns,
  getToday,
  login,
  logout,
  register,
  submitRun,
  updateMe,
} from '../api/client.ts';
import { DEMO_USERNAME, MOCK_PASSWORD, addDays, logInAs, resetMockData, utcDay } from './data.ts';

/** The error a call rejects with. Fails the test when the call succeeds. */
async function failure(promise: Promise<unknown>): Promise<ApiClientError> {
  const error = await promise.then(
    () => expect.fail('expected the call to fail'),
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiClientError);
  return error as ApiClientError;
}

/** The field paths named by a 400 VALIDATION error. */
function fieldPaths(error: ApiClientError): string[] {
  const { fields } = error.details as { fields: { path: string; message: string }[] };
  return fields.map((field) => field.path);
}

/** R5 order, written out on its own: is `a` correctly ranked above `b`? */
function rankedAbove(a: LeaderboardEntry, b: LeaderboardEntry): boolean {
  if (a.nodesCleared !== b.nodesCleared) return a.nodesCleared > b.nodesCleared;
  if (a.score !== b.score) return a.score > b.score;
  if (a.turns !== b.turns) return a.turns < b.turns;
  return a.submittedAt <= b.submittedAt;
}

function run(overrides: Partial<SubmitRunRequest> = {}): SubmitRunRequest {
  return {
    date: utcDay(new Date()),
    official: false,
    engineVersion: ENGINE_VERSION,
    actions: [{ type: 'move', dir: 'E' }, { type: 'endTurn' }],
    claimed: { outcome: 'won', nodesCleared: 12, score: 1900, turns: 30 },
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('register', () => {
  it('creates the account, starts a session, and defaults the display name', async () => {
    const { user } = await register({ username: 'New_Delver', password: 'password1' });
    expect(user).toEqual({
      id: expect.any(String),
      username: 'new_delver',
      displayName: 'new_delver',
      joinedAt: expect.any(String),
    });
    await expect(getMe()).resolves.toEqual({ user });
  });

  it('keeps a given display name, trimmed', async () => {
    const { user } = await register({
      username: 'kip',
      password: 'password1',
      displayName: '  Kip the Kid ',
    });
    expect(user.displayName).toBe('Kip the Kid');
  });

  it('refuses a taken username in any letter case with 409 USERNAME_TAKEN', async () => {
    const error = await failure(register({ username: 'DELVER', password: 'password1' }));
    expect(error).toMatchObject({ status: 409, code: 'USERNAME_TAKEN' });
  });

  it.each([
    ['a username under 3 characters', { username: 'ab' }, 'username'],
    ['a username over 20 characters', { username: 'a'.repeat(21) }, 'username'],
    ['a username with other characters', { username: 'kip-kid' }, 'username'],
    ['a password under 8 characters', { password: 'short' }, 'password'],
    ['a password over 72 characters', { password: 'p'.repeat(73) }, 'password'],
    ['an empty display name', { displayName: '   ' }, 'displayName'],
    ['a display name over 24 characters', { displayName: 'd'.repeat(25) }, 'displayName'],
  ])('refuses %s with 400 VALIDATION naming the field', async (_name, change, path) => {
    const body = { username: 'kip', password: 'password1', ...change };
    const error = await failure(register(body));
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION' });
    expect(fieldPaths(error)).toEqual([path]);
  });

  it('accepts the limits exactly', async () => {
    const body = {
      username: 'a_9'.padEnd(20, 'z'),
      password: 'p'.repeat(72),
      displayName: 'd'.repeat(24),
    };
    await expect(register(body)).resolves.toMatchObject({ user: { username: body.username } });
    await expect(register({ username: 'abc', password: 'p'.repeat(8) })).resolves.toBeDefined();
  });

  it('refuses unknown keys and missing fields', async () => {
    const extra = { username: 'kip', password: 'password1', admin: true } as RegisterRequest;
    expect(fieldPaths(await failure(register(extra)))).toEqual(['(body)']);
    const missing = { username: 'kip' } as RegisterRequest;
    expect(fieldPaths(await failure(register(missing)))).toEqual(['password']);
  });
});

describe('login and logout', () => {
  it('logs in a seeded user and starts a session', async () => {
    const { user } = await login({ username: DEMO_USERNAME, password: MOCK_PASSWORD });
    expect(user).toMatchObject({ username: 'delver', displayName: 'Delver' });
    await expect(getMe()).resolves.toEqual({ user });
  });

  it('ignores letter case in the username', async () => {
    await expect(login({ username: 'Delver', password: MOCK_PASSWORD })).resolves.toBeDefined();
  });

  it('answers a wrong password and an unknown user with the same 401', async () => {
    const wrongPassword = await failure(login({ username: 'delver', password: 'password2' }));
    const unknownUser = await failure(login({ username: 'nobody', password: MOCK_PASSWORD }));
    expect(wrongPassword).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
    expect(unknownUser).toMatchObject({ status: 401, code: wrongPassword.code });
    expect(unknownUser.message).toBe(wrongPassword.message);
    expect((await failure(getMe())).code).toBe('UNAUTHENTICATED');
  });

  it('ends the session on logout', async () => {
    await login({ username: DEMO_USERNAME, password: MOCK_PASSWORD });
    await expect(logout()).resolves.toBeUndefined();
    expect(await failure(getMe())).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    expect(await failure(logout())).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });

  it('allows 10 auth requests a minute, then answers 429 RATE_LIMITED', async () => {
    for (let i = 0; i < 10; i++) {
      await failure(login({ username: 'delver', password: 'wrong-password' }));
    }
    const error = await failure(login({ username: DEMO_USERNAME, password: MOCK_PASSWORD }));
    expect(error).toMatchObject({ status: 429, code: 'RATE_LIMITED' });
  });
});

describe('leaderboard', () => {
  it("lists today's twelve official runs in R5 order, ranked from 1", async () => {
    const board = await getLeaderboard();
    expect(board.date).toBe(utcDay(new Date()));
    expect(board.total).toBe(12);
    expect(board.entries.map((e) => e.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    board.entries.slice(1).forEach((entry, i) => {
      expect(rankedAbove(board.entries[i]!, entry)).toBe(true);
    });
    expect(board.entries.some((e) => e.isMe)).toBe(false);
    expect(board.me).toBeNull();
  });

  it('pages with limit and offset', async () => {
    const all = await getLeaderboard();
    const page = await getLeaderboard({ limit: 5, offset: 5 });
    expect(page.total).toBe(12);
    expect(page.entries).toEqual(all.entries.slice(5, 10));
  });

  it('marks my row and returns it as `me` even when it is off the page', async () => {
    logInAs('quill');
    const page = await getLeaderboard({ limit: 3 });
    expect(page.entries.every((e) => !e.isMe)).toBe(true);
    expect(page.me).toMatchObject({ rank: 12, displayName: 'Quill', isMe: true });
  });

  it('returns an empty board for a day nobody played', async () => {
    const board = await getLeaderboard({ date: '2020-01-01' });
    expect(board).toEqual({ date: '2020-01-01', total: 0, entries: [], me: null });
  });

  it.each([
    [{ date: 'today' }, 'date'],
    [{ date: '2026-02-30' }, 'date'],
    [{ limit: 0 }, 'limit'],
    [{ limit: 101 }, 'limit'],
    [{ offset: -1 }, 'offset'],
  ])('refuses %o with 400 VALIDATION', async (query, path) => {
    const error = await failure(getLeaderboard(query));
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION' });
    expect(fieldPaths(error)).toEqual([path]);
  });
});

describe('endpoints that need a session', () => {
  it.each([
    ['logout', () => logout()],
    ['getMe', () => getMe()],
    ['updateMe', () => updateMe({ displayName: 'X' })],
    ['deleteMe', () => deleteMe({ password: MOCK_PASSWORD })],
    ['submitRun', () => submitRun(run())],
    ['getMyRuns', () => getMyRuns()],
    ['deleteRun', () => deleteRun('mock-run-001')],
  ])('%s answers 401 UNAUTHENTICATED when logged out', async (_name, call) => {
    expect(await failure(call())).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });
});

describe('profile', () => {
  it('renames the user, and the leaderboard shows the new name', async () => {
    logInAs('mossbeard');
    const { user } = await updateMe({ displayName: 'Mossbeard the Bold' });
    expect(user.displayName).toBe('Mossbeard the Bold');
    expect((await getLeaderboard()).entries[0]).toMatchObject({
      displayName: 'Mossbeard the Bold',
      isMe: true,
    });
  });

  it('changes the password only with the right current password', async () => {
    logInAs(DEMO_USERNAME);
    const wrong = updateMe({ currentPassword: 'not-my-password', newPassword: 'new-password' });
    expect(await failure(wrong)).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
    await updateMe({ currentPassword: MOCK_PASSWORD, newPassword: 'new-password' });
    await logout();
    await expect(
      login({ username: DEMO_USERNAME, password: 'new-password' }),
    ).resolves.toBeDefined();
  });

  it('needs the current password to set a new one', async () => {
    logInAs(DEMO_USERNAME);
    const error = await failure(updateMe({ newPassword: 'new-password' }));
    expect(fieldPaths(error)).toEqual(['currentPassword']);
  });

  it('answers a body over 100 KB with an R5 error', async () => {
    logInAs(DEMO_USERNAME);
    const error = await failure(updateMe({ displayName: 'x'.repeat(110 * 1024) }));
    expect(error).toMatchObject({ status: 413, code: 'VALIDATION' });
  });

  it('deletes the account and its runs only with the right password', async () => {
    logInAs(DEMO_USERNAME);
    const wrong = await failure(deleteMe({ password: 'not-my-password' }));
    expect(wrong).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
    await expect(deleteMe({ password: MOCK_PASSWORD })).resolves.toBeUndefined();
    expect((await failure(getMe())).code).toBe('UNAUTHENTICATED');
    const login404 = await failure(login({ username: DEMO_USERNAME, password: MOCK_PASSWORD }));
    expect(login404.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('runs', () => {
  it("lists the user's runs newest first, in pages", async () => {
    logInAs(DEMO_USERNAME);
    const all = await getMyRuns();
    expect(all.total).toBe(5);
    const times = all.runs.map((r) => r.submittedAt);
    expect(times).toEqual([...times].sort().reverse());
    expect(all.runs[0]).not.toHaveProperty('userId');
    const page = await getMyRuns({ limit: 2, offset: 1 });
    expect(page).toEqual({ runs: all.runs.slice(1, 3), total: 5 });
  });

  it('stores a practice run as verified with no rank', async () => {
    logInAs(DEMO_USERNAME);
    const { run: saved, rank } = await submitRun(run());
    expect(saved).toMatchObject({ official: false, verified: true, outcome: 'won', score: 1900 });
    expect(rank).toBeNull();
    expect((await getMyRuns()).runs[0]).toEqual(saved);
  });

  it('ranks an official run, shows it on today, and takes only one a day', async () => {
    logInAs(DEMO_USERNAME);
    expect((await getToday()).officialRun).toBeNull();
    const { run: saved, rank } = await submitRun(run({ official: true }));
    expect(rank).toBe(1);
    expect((await getToday()).officialRun).toEqual(saved);
    expect((await getLeaderboard()).entries[0]).toMatchObject({
      displayName: 'Delver',
      isMe: true,
    });

    const again = await failure(submitRun(run({ official: true })));
    expect(again).toMatchObject({ status: 409, code: 'OFFICIAL_ALREADY_SUBMITTED' });
  });

  it('rejects a run with no actions as RUN_INCOMPLETE, keeping the official attempt', async () => {
    logInAs(DEMO_USERNAME);
    const error = await failure(submitRun(run({ official: true, actions: [] })));
    expect(error).toMatchObject({ status: 422, code: 'RUN_REJECTED' });
    expect(error.details).toEqual({ runId: expect.any(String), reason: 'RUN_INCOMPLETE' });
    const { runs } = await getMyRuns({ limit: 1 });
    expect(runs[0]).toMatchObject({
      verified: false,
      outcome: null,
      rejectReason: 'RUN_INCOMPLETE',
    });
    await expect(submitRun(run({ official: true }))).resolves.toMatchObject({ rank: 1 });
  });

  it('refuses another engine version and a closed date with 409', async () => {
    logInAs(DEMO_USERNAME);
    const version = await failure(submitRun(run({ engineVersion: '0.0.1' })));
    expect(version).toMatchObject({ status: 409, code: 'ENGINE_VERSION_MISMATCH' });
    const twoDaysAgo = addDays(utcDay(new Date()), -2);
    const closed = await failure(submitRun(run({ date: twoDaysAgo })));
    expect(closed).toMatchObject({ status: 409, code: 'DATE_CLOSED' });
  });

  it("accepts yesterday's run only in the first 30 minutes of the day", async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-13T00:29:00.000Z'));
    resetMockData();
    logInAs(DEMO_USERNAME);
    await expect(submitRun(run({ date: '2026-11-12' }))).resolves.toBeDefined();
    vi.setSystemTime(new Date('2026-11-13T00:31:00.000Z'));
    expect((await failure(submitRun(run({ date: '2026-11-12' })))).code).toBe('DATE_CLOSED');
  });

  it('checks the run body with 400 VALIDATION', async () => {
    logInAs(DEMO_USERNAME);
    const bad = {
      ...run(),
      actions: [{ type: 'teleport' }],
      claimed: { outcome: 'won', nodesCleared: 1.5, score: 0, turns: 0 },
    } as unknown as SubmitRunRequest;
    expect(fieldPaths(await failure(submitRun(bad)))).toEqual([
      'actions.0.type',
      'claimed.nodesCleared',
    ]);
    const tooMany = run({ actions: Array.from({ length: 2001 }, () => ({ type: 'endTurn' })) });
    expect(fieldPaths(await failure(submitRun(tooMany)))).toEqual(['actions']);
  });

  it('deletes a practice run but not a verified official one or a stranger run', async () => {
    logInAs(DEMO_USERNAME);
    const { runs } = await getMyRuns();
    const practice = runs.find((r) => !r.official)!;
    const official = runs.find((r) => r.official && r.verified)!;

    await expect(deleteRun(practice.id)).resolves.toBeUndefined();
    expect((await getMyRuns()).total).toBe(4);
    expect(await failure(deleteRun(official.id))).toMatchObject({
      status: 409,
      code: 'CANNOT_DELETE_OFFICIAL',
    });
    expect(await failure(deleteRun(practice.id))).toMatchObject({ status: 404, code: 'NOT_FOUND' });

    logInAs('nightjar');
    expect(await failure(deleteRun(official.id))).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

describe('the rest of R5', () => {
  it('answers health with the same numbers as the real server', async () => {
    await expect(getHealth()).resolves.toEqual({
      ok: true,
      engineVersion: ENGINE_VERSION,
      rngCheck: [444, 394, 59, 197, 499],
    });
  });

  it("gives today's date and a 16-hex-character seed that stays the same all day", async () => {
    const today = await getToday();
    expect(today).toMatchObject({ date: utcDay(new Date()), engineVersion: ENGINE_VERSION });
    expect(today.seed).toMatch(/^[0-9a-f]{16}$/);
    expect((await getToday()).seed).toBe(today.seed);
  });

  it("shows a leaderboard player's official run on today", async () => {
    logInAs('nightjar');
    expect((await getToday()).officialRun).toMatchObject({ official: true, turns: 43 });
  });

  it('answers an unknown /api route with 404 NOT_FOUND in the R5 format', async () => {
    const response = await fetch('/api/nope', { method: 'POST' });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'No route for POST /api/nope' },
    });
  });
});

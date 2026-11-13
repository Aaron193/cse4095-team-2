// The mock API (task P1-D2): every endpoint in TODO.md, Reference R5, answered from the
// in-memory data in data.ts. It checks the R5 limits and rules and sends errors in the R5
// format, as the real server does, so screens can be built and tested without the server.
//
// Where the mock is simpler than the server:
// - A run is not re-simulated: the browser's `claimed` result is stored as verified. A run
//   with no actions is rejected as RUN_INCOMPLETE, so screens can show a rejection.
// - Today's seed is a stand-in hash of the date, not the server's HMAC.
import { delay, http, HttpResponse } from 'msw';
import { ENGINE_VERSION } from '@daily-delve/shared';
import type {
  Action,
  ApiError,
  ErrorCode,
  Health,
  LeaderboardEntry,
  LeaderboardResponse,
  RunListResponse,
  RunRejectedDetails,
  SubmitRunResponse,
  TodayResponse,
  UserResponse,
} from '@daily-delve/shared';
import { browserRngCheck } from '../game/selfcheck.ts';
import {
  addDays,
  findUser,
  mockData,
  newId,
  publicUser,
  runSummary,
  sessionUser,
  utcDay,
} from './data.ts';
import type { MockRun, MockUser } from './data.ts';

// R5 "Limits", and the rate limit of task P1-B5.
const BODY_LIMIT_BYTES = 100 * 1024;
const MAX_ACTIONS = 2000; // R4 balance constant; not exported by @daily-delve/shared yet
const MAX_PAGE_SIZE = 100;
const AUTH_REQUESTS_PER_MINUTE = 10;
const DATE_GRACE_MINUTES = 30;

interface FieldError {
  path: string;
  message: string;
}

type Body = Record<string, unknown>;

/**
 * An error in the R5 format. Typed as a plain Response so that one resolver can return either
 * an error or its success body.
 */
function apiError(status: number, code: ErrorCode, message: string, details?: unknown): Response {
  const error: ApiError['error'] =
    details === undefined ? { code, message } : { code, message, details };
  return HttpResponse.json<ApiError>({ error }, { status });
}

/** 400 VALIDATION naming each bad field, as the server's validate middleware sends it. */
function validationError(where: 'body' | 'query', fields: FieldError[]) {
  const names = [...new Set(fields.map((field) => field.path))].join(', ');
  return apiError(400, 'VALIDATION', `Invalid request ${where}: ${names}`, { fields });
}

function unauthenticated() {
  return apiError(401, 'UNAUTHENTICATED', 'Log in to do that');
}

function invalidCredentials() {
  return apiError(401, 'INVALID_CREDENTIALS', 'Wrong username or password');
}

/** Reads a JSON body as the server does: at most 100 KB, an object, and no unknown keys. */
async function readBody(request: Request, allowed: readonly string[]): Promise<Body | Response> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > BODY_LIMIT_BYTES) {
    return apiError(413, 'VALIDATION', 'Request body is too large');
  }
  let value: unknown = {};
  if (text.trim() !== '') {
    try {
      value = JSON.parse(text);
    } catch {
      return apiError(400, 'VALIDATION', 'Request could not be read');
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return validationError('body', [{ path: '(body)', message: 'Expected an object' }]);
  }
  const unknownKeys = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknownKeys.length > 0) {
    const list = unknownKeys.map((key) => `"${key}"`).join(', ');
    return validationError('body', [{ path: '(body)', message: `Unrecognized key: ${list}` }]);
  }
  return value as Body;
}

interface StringRule {
  min: number;
  max: number;
  optional?: boolean;
  trim?: boolean;
}

/** Checks one string field against R5's limits. Returns the (trimmed) value if it is there. */
function checkString(body: Body, path: string, rule: StringRule, fields: FieldError[]) {
  const value = body[path];
  if (value === undefined) {
    if (!rule.optional) fields.push({ path, message: 'Required' });
    return undefined;
  }
  if (typeof value !== 'string') {
    fields.push({ path, message: 'Expected a string' });
    return undefined;
  }
  const text = rule.trim ? value.trim() : value;
  if (text.length < rule.min || text.length > rule.max) {
    fields.push({ path, message: `Must be ${rule.min} to ${rule.max} characters` });
  }
  return text;
}

const USERNAME: StringRule = { min: 3, max: 20 };
const PASSWORD: StringRule = { min: 8, max: 72 };
const DISPLAY_NAME: StringRule = { min: 1, max: 24, optional: true, trim: true };

function checkUsername(body: Body, fields: FieldError[]): string | undefined {
  const value = checkString(body, 'username', USERNAME, fields);
  if (value !== undefined && !/^[a-z0-9_]*$/i.test(value)) {
    fields.push({ path: 'username', message: 'Use only letters, numbers, and _' });
  }
  return value?.toLowerCase();
}

function isDay(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
    utcDay(new Date(`${value}T00:00:00.000Z`)) === value
  );
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Reads `limit` and `offset` from the query, with the endpoint's default page size. */
function readPage(url: URL, defaultLimit: number, fields: FieldError[]) {
  const read = (name: string, fallback: number, min: number) => {
    const raw = url.searchParams.get(name);
    if (raw === null || raw === '') return fallback;
    const value = Number(raw);
    const max = name === 'limit' ? MAX_PAGE_SIZE : Number.MAX_SAFE_INTEGER;
    if (!/^\d+$/.test(raw) || value < min || value > max) {
      const range = name === 'limit' ? `from ${min} to ${max}` : `of at least ${min}`;
      fields.push({ path: name, message: `Must be a whole number ${range}` });
    }
    return value;
  };
  return { limit: read('limit', defaultLimit, 1), offset: read('offset', 0, 0) };
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** R5 order: sites cleared high to low, score high to low, turns low to high, then time. */
function leaderboardOrder(a: MockRun, b: MockRun): number {
  return (
    b.nodesCleared - a.nodesCleared ||
    b.score - a.score ||
    a.turns - b.turns ||
    compareText(a.submittedAt, b.submittedAt) ||
    compareText(a.id, b.id)
  );
}

/** A day's official, verified runs, ranked. */
function rankedRuns(date: string): MockRun[] {
  return mockData()
    .runs.filter((run) => run.date === date && run.official && run.verified)
    .sort(leaderboardOrder);
}

function toEntry(run: MockRun, index: number, me: MockUser | undefined): LeaderboardEntry {
  const owner = mockData().users.find((user) => user.id === run.userId);
  return {
    rank: index + 1,
    displayName: owner?.displayName ?? 'Unknown',
    outcome: run.outcome ?? 'lost',
    nodesCleared: run.nodesCleared,
    score: run.score,
    turns: run.turns,
    submittedAt: run.submittedAt,
    isMe: run.userId === me?.id,
  };
}

/** A stand-in for the server's seed: 16 hex characters that depend only on the date. */
function mockSeed(date: string): string {
  let a = 0x811c9dc5;
  let b = 0x2545f491;
  for (const char of `daily-delve:${date}`) {
    const code = char.charCodeAt(0);
    a = Math.imul(a ^ code, 0x01000193);
    b = Math.imul(b ^ code, 0x5bd1e995) ^ (b >>> 13);
  }
  return [a, b].map((n) => (n >>> 0).toString(16).padStart(8, '0')).join('');
}

/** Today, and also yesterday during the first minutes of the UTC day (R5 "Date rule"). */
function isOpenDate(date: string, now: Date): boolean {
  const today = utcDay(now);
  if (date === today) return true;
  const minutesIntoDay = (now.getTime() - Date.parse(`${today}T00:00:00.000Z`)) / 60_000;
  return date === addDays(today, -1) && minutesIntoDay < DATE_GRACE_MINUTES;
}

const ACTION_TYPES: ReadonlySet<string> = new Set<Action['type']>([
  'move',
  'playCard',
  'endTurn',
  'pickReward',
  'shrine',
]);

function checkRun(body: Body, fields: FieldError[]) {
  if (!isDay(body.date)) fields.push({ path: 'date', message: 'Expected a date, YYYY-MM-DD' });
  if (typeof body.official !== 'boolean') {
    fields.push({ path: 'official', message: 'Expected true or false' });
  }
  if (typeof body.engineVersion !== 'string') {
    fields.push({ path: 'engineVersion', message: 'Expected a string' });
  }

  if (!Array.isArray(body.actions)) {
    fields.push({ path: 'actions', message: 'Expected a list of actions' });
  } else if (body.actions.length > MAX_ACTIONS) {
    fields.push({ path: 'actions', message: `At most ${MAX_ACTIONS} actions` });
  } else {
    body.actions.forEach((action: unknown, index) => {
      const type = (action as { type?: unknown } | null)?.type;
      if (typeof type !== 'string' || !ACTION_TYPES.has(type)) {
        fields.push({ path: `actions.${index}.type`, message: 'Unknown action' });
      }
    });
  }

  const claimed = body.claimed as Record<string, unknown> | null | undefined;
  if (typeof claimed !== 'object' || claimed === null) {
    fields.push({ path: 'claimed', message: 'Expected a run result' });
    return;
  }
  if (claimed.outcome !== 'won' && claimed.outcome !== 'lost') {
    fields.push({ path: 'claimed.outcome', message: 'Expected "won" or "lost"' });
  }
  for (const key of ['nodesCleared', 'score', 'turns']) {
    if (!isCount(claimed[key])) {
      fields.push({ path: `claimed.${key}`, message: 'Expected a whole number, 0 or more' });
    }
  }
}

export const handlers = [
  // Every request waits a moment, like a real server: 100 to 400 ms in the browser, and
  // almost nothing in tests. Returning nothing passes the request on to the next handler.
  http.all('/api/*', async () => {
    await delay();
  }),

  // At most AUTH_REQUESTS_PER_MINUTE requests a minute to /api/auth/*.
  http.all('/api/auth/*', () => {
    const now = Date.now();
    const data = mockData();
    data.authRequests = data.authRequests.filter((time) => now - time < 60_000);
    data.authRequests.push(now);
    if (data.authRequests.length > AUTH_REQUESTS_PER_MINUTE) {
      return apiError(429, 'RATE_LIMITED', 'Too many requests. Try again in a minute');
    }
    return undefined;
  }),

  http.get('/api/health', () =>
    HttpResponse.json<Health>({
      ok: true,
      engineVersion: ENGINE_VERSION,
      rngCheck: browserRngCheck(),
    }),
  ),

  http.post('/api/auth/register', async ({ request }) => {
    const body = await readBody(request, ['username', 'password', 'displayName']);
    if (body instanceof Response) return body;
    const fields: FieldError[] = [];
    const username = checkUsername(body, fields);
    checkString(body, 'password', PASSWORD, fields);
    const displayName = checkString(body, 'displayName', DISPLAY_NAME, fields);
    if (fields.length > 0 || username === undefined) return validationError('body', fields);

    if (findUser(username)) return apiError(409, 'USERNAME_TAKEN', 'That username is taken');
    const user: MockUser = {
      id: newId('user'),
      username,
      displayName: displayName ?? username,
      joinedAt: new Date().toISOString(),
      password: body.password as string,
    };
    const data = mockData();
    data.users.push(user);
    data.sessionUserId = user.id;
    return HttpResponse.json<UserResponse>({ user: publicUser(user) }, { status: 201 });
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await readBody(request, ['username', 'password']);
    if (body instanceof Response) return body;
    const fields: FieldError[] = [];
    const username = checkUsername(body, fields);
    const password = checkString(body, 'password', PASSWORD, fields);
    if (fields.length > 0 || username === undefined) return validationError('body', fields);

    const user = findUser(username);
    if (!user || user.password !== password) return invalidCredentials();
    mockData().sessionUserId = user.id;
    return HttpResponse.json<UserResponse>({ user: publicUser(user) });
  }),

  http.post('/api/auth/logout', () => {
    if (!sessionUser()) return unauthenticated();
    mockData().sessionUserId = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/me', () => {
    const user = sessionUser();
    if (!user) return unauthenticated();
    return HttpResponse.json<UserResponse>({ user: publicUser(user) });
  }),

  http.patch('/api/me', async ({ request }) => {
    const user = sessionUser();
    if (!user) return unauthenticated();
    const body = await readBody(request, ['displayName', 'currentPassword', 'newPassword']);
    if (body instanceof Response) return body;
    const fields: FieldError[] = [];
    const displayName = checkString(body, 'displayName', DISPLAY_NAME, fields);
    const current = checkString(
      body,
      'currentPassword',
      { min: 1, max: 72, optional: true },
      fields,
    );
    const next = checkString(body, 'newPassword', { ...PASSWORD, optional: true }, fields);
    if (next !== undefined && current === undefined) {
      fields.push({ path: 'currentPassword', message: 'Required to change the password' });
    }
    if (current !== undefined && next === undefined) {
      fields.push({ path: 'newPassword', message: 'Required with currentPassword' });
    }
    if (fields.length > 0) return validationError('body', fields);

    if (next !== undefined) {
      if (current !== user.password) return invalidCredentials();
      user.password = next;
    }
    if (displayName !== undefined) user.displayName = displayName;
    return HttpResponse.json<UserResponse>({ user: publicUser(user) });
  }),

  http.delete('/api/me', async ({ request }) => {
    const user = sessionUser();
    if (!user) return unauthenticated();
    const body = await readBody(request, ['password']);
    if (body instanceof Response) return body;
    const fields: FieldError[] = [];
    const password = checkString(body, 'password', { min: 1, max: 72 }, fields);
    if (fields.length > 0) return validationError('body', fields);
    if (password !== user.password) return invalidCredentials();

    const data = mockData();
    data.users = data.users.filter((other) => other.id !== user.id);
    data.runs = data.runs.filter((run) => run.userId !== user.id);
    data.sessionUserId = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/dungeons/today', () => {
    const date = utcDay(new Date());
    const user = sessionUser();
    const official = user
      ? mockData().runs.find(
          (run) => run.userId === user.id && run.date === date && run.official && run.verified,
        )
      : undefined;
    return HttpResponse.json<TodayResponse>({
      date,
      seed: mockSeed(date),
      engineVersion: ENGINE_VERSION,
      officialRun: official ? runSummary(official) : null,
    });
  }),

  http.post('/api/runs', async ({ request }) => {
    const user = sessionUser();
    if (!user) return unauthenticated();
    const body = await readBody(request, [
      'date',
      'official',
      'engineVersion',
      'actions',
      'claimed',
    ]);
    if (body instanceof Response) return body;
    const fields: FieldError[] = [];
    checkRun(body, fields);
    if (fields.length > 0) return validationError('body', fields);

    const date = body.date as string;
    const official = body.official as boolean;
    const actions = body.actions as unknown[];
    const claimed = body.claimed as Pick<MockRun, 'nodesCleared' | 'score' | 'turns'> & {
      outcome: 'won' | 'lost';
    };
    if (body.engineVersion !== ENGINE_VERSION) {
      return apiError(409, 'ENGINE_VERSION_MISMATCH', `The server runs engine ${ENGINE_VERSION}`);
    }
    const now = new Date();
    if (!isOpenDate(date, now)) return apiError(409, 'DATE_CLOSED', 'This dungeon has closed');
    const data = mockData();
    if (
      official &&
      data.runs.some(
        (run) => run.userId === user.id && run.date === date && run.official && run.verified,
      )
    ) {
      return apiError(409, 'OFFICIAL_ALREADY_SUBMITTED', 'Your official run for this day is in');
    }

    const verified = actions.length > 0;
    const run: MockRun = {
      id: newId('run'),
      userId: user.id,
      date,
      official,
      verified,
      rejectReason: verified ? null : 'RUN_INCOMPLETE',
      outcome: verified ? claimed.outcome : null,
      nodesCleared: verified ? claimed.nodesCleared : 0,
      score: verified ? claimed.score : 0,
      turns: verified ? claimed.turns : 0,
      submittedAt: now.toISOString(),
    };
    data.runs.push(run);
    if (!verified) {
      const details: RunRejectedDetails = { runId: run.id, reason: 'RUN_INCOMPLETE' };
      return apiError(422, 'RUN_REJECTED', 'The run has not ended', details);
    }
    const rank = official ? rankedRuns(date).indexOf(run) + 1 : null;
    return HttpResponse.json<SubmitRunResponse>({ run: runSummary(run), rank }, { status: 201 });
  }),

  http.get('/api/me/runs', ({ request }) => {
    const user = sessionUser();
    if (!user) return unauthenticated();
    const fields: FieldError[] = [];
    const { limit, offset } = readPage(new URL(request.url), 20, fields);
    if (fields.length > 0) return validationError('query', fields);

    const runs = mockData()
      .runs.filter((run) => run.userId === user.id)
      .sort((a, b) => compareText(b.submittedAt, a.submittedAt) || compareText(b.id, a.id));
    return HttpResponse.json<RunListResponse>({
      runs: runs.slice(offset, offset + limit).map(runSummary),
      total: runs.length,
    });
  }),

  http.delete('/api/runs/:id', ({ params }) => {
    const user = sessionUser();
    if (!user) return unauthenticated();
    const data = mockData();
    const run = data.runs.find((other) => other.id === params.id && other.userId === user.id);
    if (!run) return apiError(404, 'NOT_FOUND', 'No such run');
    if (run.official && run.verified) {
      return apiError(409, 'CANNOT_DELETE_OFFICIAL', 'A verified official run cannot be deleted');
    }
    data.runs = data.runs.filter((other) => other !== run);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/leaderboard', ({ request }) => {
    const url = new URL(request.url);
    const fields: FieldError[] = [];
    const date = url.searchParams.get('date') || utcDay(new Date());
    if (!isDay(date)) fields.push({ path: 'date', message: 'Expected a date, YYYY-MM-DD' });
    const { limit, offset } = readPage(url, 50, fields);
    if (fields.length > 0) return validationError('query', fields);

    const me = sessionUser();
    const ranked = rankedRuns(date).map((run, index) => ({ run, entry: toEntry(run, index, me) }));
    const mine = ranked.find(({ run }) => run.userId === me?.id);
    return HttpResponse.json<LeaderboardResponse>({
      date,
      total: ranked.length,
      entries: ranked.slice(offset, offset + limit).map((row) => row.entry),
      me: mine ? mine.entry : null,
    });
  }),

  // Anything else under /api is unknown, as on the server.
  http.all('/api/*', ({ request }) => {
    const { pathname } = new URL(request.url);
    return apiError(404, 'NOT_FOUND', `No route for ${request.method} ${pathname}`);
  }),
];

import { ENGINE_VERSION } from '@daily-delve/shared';
import type { LeaderboardResponse, SubmitRunRequest, User } from '@daily-delve/shared';
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
} from './client.ts';

const USER: User = {
  id: 'u1',
  username: 'tyler',
  displayName: 'Tyler',
  joinedAt: '2026-11-12T00:00:00.000Z',
};

const RUN: SubmitRunRequest = {
  date: '2026-11-12',
  official: true,
  engineVersion: ENGINE_VERSION,
  actions: [{ type: 'endTurn' }],
  claimed: { outcome: 'lost', nodesCleared: 0, score: 0, turns: 1 },
};

/** Makes `fetch` answer every call with this status and body. Returns the mock. */
function mockFetch(status: number, body?: unknown, contentType = 'application/json') {
  const fetchMock = vi.fn<typeof fetch>(async () => {
    const text = body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body);
    return new Response(text, { status, headers: { 'Content-Type': contentType } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** The URL and options of the only call to the mocked `fetch`. */
function sent(fetchMock: ReturnType<typeof mockFetch>) {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0]!;
  return {
    url,
    init: init!,
    body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
  };
}

/** The error a call rejects with. Fails the test when the call succeeds. */
async function failure(promise: Promise<unknown>): Promise<ApiClientError> {
  const error = await promise.then(
    () => expect.fail('expected the call to fail'),
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiClientError);
  return error as ApiClientError;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// The table in TODO.md, Reference R5, row by row.
const R5_ENDPOINTS = [
  'GET /health',
  'POST /auth/register',
  'POST /auth/login',
  'POST /auth/logout',
  'GET /me',
  'PATCH /me',
  'DELETE /me',
  'GET /dungeons/today',
  'POST /runs',
  'GET /me/runs',
  'DELETE /runs/:id',
  'GET /leaderboard',
];

interface EndpointCall {
  fn: string;
  endpoint: string;
  call: () => Promise<unknown>;
  url: string;
  body?: unknown;
  /** 204 endpoints resolve to nothing. */
  noContent?: boolean;
}

const CALLS: EndpointCall[] = [
  { fn: 'getHealth', endpoint: 'GET /health', call: () => getHealth(), url: '/api/health' },
  {
    fn: 'register',
    endpoint: 'POST /auth/register',
    call: () => register({ username: 'tyler', password: 'password1', displayName: 'Tyler' }),
    url: '/api/auth/register',
    body: { username: 'tyler', password: 'password1', displayName: 'Tyler' },
  },
  {
    fn: 'login',
    endpoint: 'POST /auth/login',
    call: () => login({ username: 'tyler', password: 'password1' }),
    url: '/api/auth/login',
    body: { username: 'tyler', password: 'password1' },
  },
  {
    fn: 'logout',
    endpoint: 'POST /auth/logout',
    call: () => logout(),
    url: '/api/auth/logout',
    noContent: true,
  },
  { fn: 'getMe', endpoint: 'GET /me', call: () => getMe(), url: '/api/me' },
  {
    fn: 'updateMe',
    endpoint: 'PATCH /me',
    call: () => updateMe({ displayName: 'T' }),
    url: '/api/me',
    body: { displayName: 'T' },
  },
  {
    fn: 'deleteMe',
    endpoint: 'DELETE /me',
    call: () => deleteMe({ password: 'password1' }),
    url: '/api/me',
    body: { password: 'password1' },
    noContent: true,
  },
  {
    fn: 'getToday',
    endpoint: 'GET /dungeons/today',
    call: () => getToday(),
    url: '/api/dungeons/today',
  },
  {
    fn: 'submitRun',
    endpoint: 'POST /runs',
    call: () => submitRun(RUN),
    url: '/api/runs',
    body: RUN,
  },
  {
    fn: 'getMyRuns',
    endpoint: 'GET /me/runs',
    call: () => getMyRuns({ limit: 20, offset: 40 }),
    url: '/api/me/runs?limit=20&offset=40',
  },
  {
    fn: 'deleteRun',
    endpoint: 'DELETE /runs/:id',
    call: () => deleteRun('r1'),
    url: '/api/runs/r1',
    noContent: true,
  },
  {
    fn: 'getLeaderboard',
    endpoint: 'GET /leaderboard',
    call: () => getLeaderboard({ date: '2026-11-12', limit: 50, offset: 0 }),
    url: '/api/leaderboard?date=2026-11-12&limit=50&offset=0',
  },
];

describe('the client covers the R5 contract', () => {
  it('has exactly one function for every R5 endpoint', () => {
    expect(CALLS.map((c) => c.endpoint).sort()).toEqual([...R5_ENDPOINTS].sort());
    expect(new Set(CALLS.map((c) => c.fn)).size).toBe(R5_ENDPOINTS.length);
  });

  it.each(CALLS)('$fn sends $endpoint', async ({ endpoint, call, url, body, noContent }) => {
    const fetchMock = noContent ? mockFetch(204) : mockFetch(200, { ok: true });
    const result = await call();

    const request = sent(fetchMock);
    expect(request.url).toBe(url);
    expect(request.init.method).toBe(endpoint.split(' ')[0]);
    expect(request.init.credentials).toBe('same-origin');
    expect(request.init.headers).toMatchObject({ Accept: 'application/json' });
    expect(request.body).toEqual(body);
    if (body !== undefined) {
      expect(request.init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    }
    expect(result).toEqual(noContent ? undefined : { ok: true });
  });
});

describe('login', () => {
  it('returns the user on success', async () => {
    mockFetch(200, { user: USER });
    await expect(login({ username: 'tyler', password: 'password1' })).resolves.toEqual({
      user: USER,
    });
  });

  it('throws INVALID_CREDENTIALS with the server message on a 401', async () => {
    mockFetch(401, {
      error: { code: 'INVALID_CREDENTIALS', message: 'Wrong username or password' },
    });
    const error = await failure(login({ username: 'tyler', password: 'wrong-pass' }));
    expect(error).toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Wrong username or password',
      details: undefined,
    });
  });
});

describe('register', () => {
  it('returns the new user on a 201', async () => {
    mockFetch(201, { user: USER });
    await expect(register({ username: 'tyler', password: 'password1' })).resolves.toEqual({
      user: USER,
    });
  });

  it('throws USERNAME_TAKEN on a 409', async () => {
    mockFetch(409, { error: { code: 'USERNAME_TAKEN', message: 'That username is taken' } });
    const error = await failure(register({ username: 'tyler', password: 'password1' }));
    expect(error).toMatchObject({ status: 409, code: 'USERNAME_TAKEN' });
  });
});

describe('getLeaderboard', () => {
  const board: LeaderboardResponse = { date: '2026-11-12', total: 0, entries: [], me: null };

  it('returns the board and sends only the parameters that are set', async () => {
    const fetchMock = mockFetch(200, board);
    await expect(getLeaderboard({ limit: 10 })).resolves.toEqual(board);
    expect(sent(fetchMock).url).toBe('/api/leaderboard?limit=10');
  });

  it('sends no query string when no parameters are set', async () => {
    const fetchMock = mockFetch(200, board);
    await getLeaderboard();
    expect(sent(fetchMock).url).toBe('/api/leaderboard');
  });

  it('keeps the details of a 400 VALIDATION error', async () => {
    const details = { fields: [{ path: 'date', message: 'Invalid date' }] };
    mockFetch(400, {
      error: { code: 'VALIDATION', message: 'Invalid request query: date', details },
    });
    const error = await failure(getLeaderboard({ date: 'yesterday' }));
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION', details });
  });
});

describe('logout', () => {
  it('resolves to nothing on a 204', async () => {
    mockFetch(204);
    await expect(logout()).resolves.toBeUndefined();
  });

  it('throws UNAUTHENTICATED on a 401', async () => {
    mockFetch(401, { error: { code: 'UNAUTHENTICATED', message: 'Log in first' } });
    const error = await failure(logout());
    expect(error).toMatchObject({ status: 401, code: 'UNAUTHENTICATED', message: 'Log in first' });
  });
});

describe('failures without an R5 error body', () => {
  it('reports a request that got no answer as NETWORK_ERROR with status 0', async () => {
    const cause = new TypeError('Failed to fetch');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw cause;
      }),
    );
    const error = await failure(getMe());
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR', cause });
    expect(error.message).toBe("Can't reach the server.");
  });

  it('reports an HTML error page as INTERNAL with its status', async () => {
    mockFetch(502, '<html><body>Bad gateway</body></html>', 'text/html');
    const error = await failure(getToday());
    expect(error).toMatchObject({ status: 502, code: 'INTERNAL' });
  });

  it('reports an error body with an unknown code as INTERNAL', async () => {
    mockFetch(418, { error: { code: 'TEAPOT', message: 'I am a teapot' } });
    const error = await failure(getToday());
    expect(error).toMatchObject({ status: 418, code: 'INTERNAL' });
  });

  it('reports an empty error response as INTERNAL', async () => {
    mockFetch(500);
    expect(await failure(getHealth())).toMatchObject({ status: 500, code: 'INTERNAL' });
  });

  it('reports a success with an unreadable body as INTERNAL', async () => {
    mockFetch(200, '{"user":');
    expect(await failure(getMe())).toMatchObject({ status: 200, code: 'INTERNAL' });
  });
});

describe('request options', () => {
  it('passes the signal to fetch', async () => {
    const fetchMock = mockFetch(200, { user: USER });
    const controller = new AbortController();
    await getMe({ signal: controller.signal });
    expect(sent(fetchMock).init.signal).toBe(controller.signal);
  });

  it('rejects an aborted call with the AbortError, not an ApiClientError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
          }),
      ),
    );
    const controller = new AbortController();
    const call = getMe({ signal: controller.signal });
    controller.abort();
    const error = await call.catch((reason: unknown) => reason);
    expect(error).not.toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ name: 'AbortError' });
  });

  it('puts a run id into the path safely', async () => {
    const fetchMock = mockFetch(204);
    await deleteRun('a/b?c');
    expect(sent(fetchMock).url).toBe('/api/runs/a%2Fb%3Fc');
  });
});

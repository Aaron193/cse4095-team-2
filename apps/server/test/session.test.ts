// Task P1-B1: sessions in the database, the dd.sid cookie, and requireAuth.
// No login route exists yet (that is P1-B3), so most of these tests mount the session
// middleware on a small app with a test-only login route and a protected route.
import express from 'express';
import type { Express } from 'express';
import type { Knex } from 'knex';
import request from 'supertest';
import type { Response } from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.ts';
import type { AppConfig } from '../src/config.ts';
import { createDb, MEMORY_SQLITE } from '../src/db/knex.ts';
import { asyncHandler } from '../src/middleware/asyncHandler.ts';
import { errorHandler } from '../src/middleware/errors.ts';
import {
  requireAuth,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  sessionMiddleware,
  startSession,
} from '../src/middleware/session.ts';
import { createTestDb, DAY_MS, sessionCookie, testClock, testConfig } from './helpers.ts';

let db: Knex;
let clock: ReturnType<typeof testClock>;

beforeEach(async () => {
  db = await createTestDb();
  clock = testClock();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.destroy();
});

function sessionApp(config: AppConfig = testConfig, database: Knex = db): Express {
  const app = express();
  app.use(express.json());
  app.use(sessionMiddleware({ db: database, now: clock.now, config }));
  app.post(
    '/test/login',
    asyncHandler(async (req, res) => {
      await startSession(req, String(req.body.userId));
      res.status(204).end();
    }),
  );
  app.get('/test/protected', requireAuth, (req, res) => {
    res.json({ userId: req.session.userId });
  });
  app.use(errorHandler);
  return app;
}

async function login(app: Express, userId = 'user-1', cookie?: string): Promise<string> {
  const req = request(app).post('/test/login');
  if (cookie) req.set('Cookie', cookie);
  const res = await req.send({ userId });
  expect(res.status).toBe(204);
  return sessionCookie(res);
}

function protectedStatus(app: Express, cookie: string): Promise<number> {
  return request(app)
    .get('/test/protected')
    .set('Cookie', cookie)
    .then((res) => res.status);
}

/** The attributes of the dd.sid Set-Cookie header, names lowercased. */
function cookieAttributes(res: Response): Map<string, string> {
  const header = res.get('Set-Cookie')?.find((h) => h.startsWith(`${SESSION_COOKIE}=`));
  if (!header) throw new Error('no session cookie');
  const pairs = header
    .split(';')
    .slice(1)
    .map((part): [string, string] => {
      const [name = '', ...value] = part.trim().split('=');
      return [name.toLowerCase(), value.join('=')];
    });
  return new Map(pairs);
}

describe('requireAuth', () => {
  it('returns 401 UNAUTHENTICATED in the R5 format without a cookie', async () => {
    const res = await request(sessionApp()).get('/test/protected');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { code: 'UNAUTHENTICATED', message: expect.any(String) } });
  });

  it('returns 200 with the cookie from a login', async () => {
    const app = sessionApp();
    const cookie = await login(app, 'user-1');
    const res = await request(app).get('/test/protected').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 'user-1' });
  });

  it('still accepts the session after the app is re-created on the same database', async () => {
    const cookie = await login(sessionApp(), 'user-1');
    const recreated = sessionApp();
    const res = await request(recreated).get('/test/protected').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 'user-1' });
  });

  it('refuses a cookie signed with another secret', async () => {
    const cookie = await login(sessionApp({ ...testConfig, sessionSecret: 'another-secret' }));
    expect(await protectedStatus(sessionApp(), cookie)).toBe(401);
  });

  it('refuses a session that is no longer in the store', async () => {
    const app = sessionApp();
    const cookie = await login(app);
    await db('sessions').delete();
    expect(await protectedStatus(app, cookie)).toBe(401);
  });

  it('gives the session a new ID at login, so the old ID stops working', async () => {
    const app = sessionApp();
    const before = await login(app, 'user-1');
    const after = await login(app, 'user-2', before);
    expect(after).not.toBe(before);
    expect(await protectedStatus(app, before)).toBe(401);
    const res = await request(app).get('/test/protected').set('Cookie', after);
    expect(res.body).toEqual({ userId: 'user-2' });
  });

  it('turns a store failure into a 500 INTERNAL error', async () => {
    const cookie = await login(sessionApp());
    const broken = createDb({ sqliteFile: MEMORY_SQLITE });
    await broken.destroy();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(sessionApp(testConfig, broken))
      .get('/test/protected')
      .set('Cookie', cookie);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  });
});

describe('the dd.sid cookie', () => {
  it('is HttpOnly, SameSite=Lax, site-wide, 7 days long, and not Secure in development', async () => {
    const res = await request(sessionApp()).post('/test/login').send({ userId: 'user-1' });
    const attributes = cookieAttributes(res);
    expect(attributes.has('httponly')).toBe(true);
    expect(attributes.get('samesite')).toBe('Lax');
    expect(attributes.get('path')).toBe('/');
    expect(attributes.has('secure')).toBe(false);

    // express-session writes Expires from the real clock, to the second.
    const lifetime = Date.parse(attributes.get('expires')!) - Date.now();
    expect(lifetime).toBeGreaterThan(SESSION_MAX_AGE_MS - 60_000);
    expect(lifetime).toBeLessThanOrEqual(SESSION_MAX_AGE_MS);
  });

  it('is Secure in production, and only sent over HTTPS', async () => {
    const app = sessionApp({ ...testConfig, production: true });
    app.set('trust proxy', 1); // as createApp does in production

    const overHttp = await request(app).post('/test/login').send({ userId: 'user-1' });
    expect(overHttp.get('Set-Cookie')).toBeUndefined();

    const overHttps = await request(app)
      .post('/test/login')
      .set('X-Forwarded-Proto', 'https')
      .send({ userId: 'user-1' });
    expect(cookieAttributes(overHttps).has('secure')).toBe(true);
  });

  it('createApp trusts the proxy in production only', () => {
    expect(createApp({ db, now: clock.now, config: testConfig }).get('trust proxy')).toBe(false);
    const production = createApp({
      db,
      now: clock.now,
      config: { ...testConfig, production: true },
    });
    expect(production.get('trust proxy')).toBe(1);
  });
});

describe('session expiry, by the injected clock', () => {
  it('ends a session that goes unused for 7 days', async () => {
    const app = sessionApp();
    const cookie = await login(app);
    clock.advance(SESSION_MAX_AGE_MS);
    expect(await protectedStatus(app, cookie)).toBe(401);
  });

  it('keeps a session alive for 7 days after each request', async () => {
    const app = sessionApp();
    const cookie = await login(app);
    clock.advance(6 * DAY_MS);
    expect(await protectedStatus(app, cookie)).toBe(200);
    clock.advance(6 * DAY_MS); // 12 days after login, 6 after the last request
    expect(await protectedStatus(app, cookie)).toBe(200);
    clock.advance(SESSION_MAX_AGE_MS);
    expect(await protectedStatus(app, cookie)).toBe(401);
  });
});

describe('the sessions table', () => {
  it("keeps each session's user ID in its own column", async () => {
    await login(sessionApp(), 'user-1');
    expect(await db('sessions').select('user_id')).toEqual([{ user_id: 'user-1' }]);
  });

  it('prunes expired sessions when a session is saved, without a timer', async () => {
    const app = sessionApp();
    await login(app, 'user-1');
    clock.advance(DAY_MS);
    await login(app, 'user-2');
    clock.advance(SESSION_MAX_AGE_MS - DAY_MS); // user-1 has expired, user-2 has a day left
    await login(app, 'user-3');

    const rows = await db('sessions').select('user_id').orderBy('user_id');
    expect(rows).toEqual([{ user_id: 'user-2' }, { user_id: 'user-3' }]);
  });
});

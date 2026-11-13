// The auth routes (TODO.md, Reference R5). Task P1-B2: POST /api/auth/register.
// Task P1-B3: POST /api/auth/login and POST /api/auth/logout.
import bcrypt from 'bcryptjs';
import type { Express } from 'express';
import type { Knex } from 'knex';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRow } from '../src/db/rows.ts';
import {
  createTestApp,
  createTestDb,
  FIXED_NOW,
  registerUser,
  sessionCookie,
  TEST_USER,
} from './helpers.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let db: Knex;
let app: Express;

beforeEach(async () => {
  db = await createTestDb();
  app = createTestApp(db);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.destroy();
});

function register(body: object, to: Express = app) {
  return request(to).post('/api/auth/register').send(body);
}

/** The session ID inside a signed dd.sid cookie: dd.sid=s%3A<id>.<signature>. */
function sessionId(cookie: string): string {
  const value = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1));
  return value.slice('s:'.length, value.lastIndexOf('.'));
}

function fieldPaths(body: { error: { details: { fields: { path: string }[] } } }): string[] {
  return [...new Set(body.error.details.fields.map((field) => field.path))];
}

async function usernames(): Promise<string[]> {
  const rows = await db<UserRow>('users').select('username').orderBy('username');
  return rows.map((row) => row.username);
}

describe('POST /api/auth/register', () => {
  it('answers 201 with the new user, sets the session cookie, and never shows the hash', async () => {
    const res = await register({
      username: 'Tyler_K',
      password: 'correct horse',
      displayName: 'Tyler',
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      user: {
        id: expect.stringMatching(UUID),
        username: 'tyler_k',
        displayName: 'Tyler',
        joinedAt: FIXED_NOW.toISOString(),
      },
    });
    expect(sessionCookie(res)).toMatch(/^dd\.sid=s%3A/);

    const row = await db<UserRow>('users').where({ id: res.body.user.id }).first();
    expect(await bcrypt.compare('correct horse', row!.password_hash)).toBe(true);
    expect(res.text).not.toContain(row!.password_hash);
    expect(res.text).not.toMatch(/hash|password|correct horse/i);
  });

  it('starts a session that belongs to the new user', async () => {
    const res = await register(TEST_USER);
    expect(await db('sessions').select('sid', 'user_id')).toEqual([
      { sid: sessionId(sessionCookie(res)), user_id: res.body.user.id },
    ]);
  });

  it('hashes the password with bcrypt at the cost from the config', async () => {
    await register(TEST_USER, createTestApp(db, { config: { bcryptCost: 5 } }));
    const row = await db<UserRow>('users').first();
    expect(row!.password_hash).toMatch(/^\$2[ab]\$05\$/);
  });

  it('stores the username lowercase and defaults the display name to the username as typed', async () => {
    const res = await register({ username: 'MixedCase_7', password: 'password1' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ username: 'mixedcase_7', displayName: 'MixedCase_7' });
    expect(await usernames()).toEqual(['mixedcase_7']);
  });

  it('trims the display name', async () => {
    const res = await register({ ...TEST_USER, displayName: '  Tyler K  ' });
    expect(res.body.user.displayName).toBe('Tyler K');
  });

  it('sets a Secure cookie in production, behind the HTTPS proxy', async () => {
    const production = createTestApp(db, { config: { production: true } });
    const res = await request(production)
      .post('/api/auth/register')
      .set('X-Forwarded-Proto', 'https')
      .send(TEST_USER);
    expect(res.status).toBe(201);
    const header = res.get('Set-Cookie')!.find((h) => h.startsWith('dd.sid='));
    expect(header).toMatch(/;\s*Secure(;|$)/i);
  });

  describe('a taken username', () => {
    it('is refused in any letter case: 409 USERNAME_TAKEN, and nothing is stored', async () => {
      await registerUser(app, { username: 'tyler', password: 'password1' });
      const res = await register({ username: 'TyLeR', password: 'password2' });
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: { code: 'USERNAME_TAKEN', message: expect.any(String) } });
      expect(res.get('Set-Cookie')).toBeUndefined();
      expect(await usernames()).toEqual(['tyler']);
    });

    it('is refused when another registration takes it while the password is hashed', async () => {
      const realHash = bcrypt.hash;
      vi.spyOn(bcrypt, 'hash').mockImplementationOnce(async (password, salt) => {
        await db('users').insert({
          id: 'other-request',
          username: 'racer',
          password_hash: 'x',
          display_name: 'Racer',
          created_at: FIXED_NOW.toISOString(),
        });
        return realHash(password, salt);
      });

      const res = await register({ username: 'Racer', password: 'password1' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('USERNAME_TAKEN');
      expect(await usernames()).toEqual(['racer']);
    });

    it('goes to exactly one of two simultaneous registrations', async () => {
      const results = await Promise.all([
        register({ username: 'racer', password: 'password1' }),
        register({ username: 'RACER', password: 'password2' }),
      ]);
      expect(results.map((res) => res.status).sort()).toEqual([201, 409]);
      expect(await usernames()).toEqual(['racer']);
    });
  });

  describe('the R5 limits', () => {
    const valid = { username: 'tyler', password: 'password1', displayName: 'Tyler' };

    it.each([
      ['username', 'too short', { username: 'ab' }],
      ['username', 'too long', { username: 'a'.repeat(21) }],
      ['username', 'with a space', { username: 'ty ler' }],
      ['username', 'with a hyphen', { username: 'ty-ler' }],
      ['username', 'with a non-ASCII letter', { username: 'tylér' }],
      ['username', 'missing', { username: undefined }],
      ['username', 'not a string', { username: 12345 }],
      ['password', 'too short', { password: 'x'.repeat(7) }],
      ['password', 'too long', { password: 'x'.repeat(73) }],
      ['password', 'missing', { password: undefined }],
      ['displayName', 'empty', { displayName: '' }],
      ['displayName', 'blank once trimmed', { displayName: '   ' }],
      ['displayName', 'too long', { displayName: 'x'.repeat(25) }],
      ['displayName', 'not a string', { displayName: 7 }],
    ])('refuse a %s that is %s: 400 VALIDATION naming it', async (field, _case, change) => {
      const res = await register({ ...valid, ...change });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION');
      expect(fieldPaths(res.body)).toEqual([field]);
      expect(res.get('Set-Cookie')).toBeUndefined();
      expect(await usernames()).toEqual([]);
    });

    it('refuse unknown fields', async () => {
      const res = await register({ ...valid, admin: true });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION');
      expect(JSON.stringify(res.body.error)).toContain('admin');
    });

    it.each([
      ['the shortest username', { username: 'abc' }],
      ['the longest username', { username: 'a'.repeat(20) }],
      ['a username of digits and _', { username: '__0123__' }],
      ['the shortest password', { password: 'x'.repeat(8) }],
      ['the longest password', { password: 'x'.repeat(72) }],
      ['the longest display name', { displayName: 'x'.repeat(24) }],
      ['a display name that fits once trimmed', { displayName: `  ${'x'.repeat(24)}  ` }],
    ])('accept %s', async (_case, change) => {
      const res = await register({ ...valid, ...change });
      expect(res.status).toBe(201);
    });
  });
});

function login(body: object, cookie?: string) {
  const req = request(app).post('/api/auth/login');
  if (cookie) req.set('Cookie', cookie);
  return req.send(body);
}

function logout(cookie?: string) {
  const req = request(app).post('/api/auth/logout');
  if (cookie) req.set('Cookie', cookie);
  return req;
}

describe('POST /api/auth/login', () => {
  it('answers 200 with the user and starts a session for them', async () => {
    const { user } = await registerUser(app);
    const res = await login(TEST_USER);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user });
    expect(res.text).not.toMatch(/hash|password/i);

    const cookie = sessionCookie(res);
    const sessions = await db('sessions')
      .where({ sid: sessionId(cookie) })
      .select('user_id');
    expect(sessions).toEqual([{ user_id: user.id }]);
    expect((await logout(cookie)).status).toBe(204); // the session is a logged-in one
  });

  it('compares usernames without regard to case', async () => {
    await registerUser(app, { username: 'Tyler', password: 'password1' });
    expect((await login({ username: 'TYLER', password: 'password1' })).status).toBe(200);
  });

  it('gives the session a new ID, so an ID from before the login is worthless', async () => {
    const { cookie: before } = await registerUser(app);
    const after = sessionCookie(await login(TEST_USER, before));
    expect(after).not.toBe(before);
    expect((await logout(before)).status).toBe(401);
    expect((await logout(after)).status).toBe(204);
  });

  it('gives a wrong password and an unknown username the same 401 INVALID_CREDENTIALS', async () => {
    await registerUser(app);
    const wrongPassword = await login({ username: TEST_USER.username, password: 'wrong password' });
    const unknownUser = await login({ username: 'nobody', password: TEST_USER.password });

    for (const res of [wrongPassword, unknownUser]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: { code: 'INVALID_CREDENTIALS', message: expect.any(String) },
      });
      expect(res.get('Set-Cookie')).toBeUndefined();
    }
    expect(unknownUser.body).toEqual(wrongPassword.body);
    expect(await db('sessions').select('sid')).toHaveLength(1); // only the registration's
  });

  it('still runs one bcrypt comparison for an unknown username, to take as long', async () => {
    const compare = vi.spyOn(bcrypt, 'compare');
    await login({ username: 'nobody', password: 'password1' });
    expect(compare).toHaveBeenCalledOnce();
    expect(compare.mock.calls[0]![0]).toBe('password1');
  });

  it.each([
    ['username', { password: 'password1' }],
    ['username', { username: '', password: 'password1' }],
    ['username', { username: 42, password: 'password1' }],
    ['password', { username: 'tyler' }],
    ['password', { username: 'tyler', password: '' }],
  ])('refuses a request without a usable %s: 400 VALIDATION naming it', async (field, body) => {
    const res = await login(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
    expect(fieldPaths(res.body)).toEqual([field]);
  });
});

describe('POST /api/auth/logout', () => {
  it('needs a session: 401 UNAUTHENTICATED without one', async () => {
    const res = await logout();
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { code: 'UNAUTHENTICATED', message: expect.any(String) } });
  });

  it('answers 204, deletes the session, and clears the cookie', async () => {
    const { cookie } = await registerUser(app);
    const res = await logout(cookie);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(await db('sessions').select('sid')).toEqual([]);

    const cleared = res.get('Set-Cookie')?.find((h) => h.startsWith('dd.sid='));
    expect(cleared).toMatch(/^dd\.sid=;/);
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(cleared).toMatch(/Path=\//);
  });

  it('leaves protected routes answering 401 to the old cookie', async () => {
    const { cookie } = await registerUser(app);
    await logout(cookie);
    const res = await logout(cookie);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});

// Task P1-B4: GET /api/me (TODO.md, Reference R5).
import type { Express } from 'express';
import type { Knex } from 'knex';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, createTestDb, registerUser, sessionCookie, TEST_USER } from './helpers.ts';

let db: Knex;
let app: Express;

beforeEach(async () => {
  db = await createTestDb();
  app = createTestApp(db);
});

afterEach(async () => {
  await db.destroy();
});

function getMe(cookie?: string, to: Express = app) {
  const req = request(to).get('/api/me');
  if (cookie) req.set('Cookie', cookie);
  return req;
}

const UNAUTHENTICATED = { error: { code: 'UNAUTHENTICATED', message: expect.any(String) } };

describe('GET /api/me', () => {
  it('answers 401 UNAUTHENTICATED when not logged in', async () => {
    const res = await getMe();
    expect(res.status).toBe(401);
    expect(res.body).toEqual(UNAUTHENTICATED);
  });

  it('answers 200 with the user after registering', async () => {
    const { user, cookie } = await registerUser(app);
    const res = await getMe(cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user });
    expect(res.text).not.toMatch(/hash|password/i);
  });

  it('answers 200 with the user after logging in', async () => {
    const { user } = await registerUser(app);
    const login = await request(app).post('/api/auth/login').send(TEST_USER);
    const res = await getMe(sessionCookie(login));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user });
  });

  it('answers 401 after logging out', async () => {
    const { cookie } = await registerUser(app);
    await request(app).post('/api/auth/logout').set('Cookie', cookie);
    const res = await getMe(cookie);
    expect(res.status).toBe(401);
    expect(res.body).toEqual(UNAUTHENTICATED);
  });

  it('still knows the user after the app is re-created on the same database', async () => {
    const { user, cookie } = await registerUser(app);
    const res = await getMe(cookie, createTestApp(db));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user });
  });

  it('reads the user from the database, not from the session', async () => {
    const { user, cookie } = await registerUser(app);
    await db('users').where({ id: user.id }).update({ display_name: 'Renamed' });
    const res = await getMe(cookie);
    expect(res.body.user.displayName).toBe('Renamed');
  });

  it('answers 401 and ends the session when its user no longer exists', async () => {
    const { user, cookie } = await registerUser(app);
    await db('users').where({ id: user.id }).delete();

    const res = await getMe(cookie);
    expect(res.status).toBe(401);
    expect(res.body).toEqual(UNAUTHENTICATED);
    expect(res.get('Set-Cookie')?.find((h) => h.startsWith('dd.sid='))).toMatch(/^dd\.sid=;/);
    expect(await db('sessions').select('sid')).toEqual([]);
    expect((await getMe(cookie)).status).toBe(401);
  });
});

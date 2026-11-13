// Task P1-B5: security headers, the 100 KB body limit, and the rate limit on /api/auth/*.
import type { Express } from 'express';
import type { Knex } from 'knex';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { createTestDb, createTestApp, fixedNow, TEST_USER } from './helpers.ts';

let db: Knex;
let app: Express;

beforeEach(async () => {
  db = await createTestDb();
  app = createTestApp(db);
});

afterEach(async () => {
  await db.destroy();
});

const RATE_LIMITED = { error: { code: 'RATE_LIMITED', message: expect.any(String) } };

/** A failed login: cheap, and counted like any other request to /api/auth/*. */
function badLogin(to: Express) {
  return request(to).post('/api/auth/login').send({ username: 'nobody', password: 'password1' });
}

describe('the rate limit on /api/auth/*', () => {
  it('answers the request over the limit with 429 RATE_LIMITED in the R5 format', async () => {
    const limited = createTestApp(db, { config: { authRateLimit: 3 } });
    for (let i = 0; i < 3; i++) expect((await badLogin(limited)).status).toBe(401);

    const res = await badLogin(limited);
    expect(res.status).toBe(429);
    expect(res.body).toEqual(RATE_LIMITED);
    expect(Number(res.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('is 10 requests a minute unless configured otherwise', async () => {
    const defaults = createApp({ db, now: fixedNow, config: { bcryptCost: 4 } });
    // An empty body fails validation before any database work: the quickest request to count.
    const post = () => request(defaults).post('/api/auth/login').send({});
    for (let i = 0; i < 10; i++) expect((await post()).status).toBe(400);
    expect((await post()).status).toBe(429);
  });

  it('counts register, login, and logout together', async () => {
    const limited = createTestApp(db, { config: { authRateLimit: 2 } });
    expect((await request(limited).post('/api/auth/register').send(TEST_USER)).status).toBe(201);
    expect((await request(limited).post('/api/auth/logout')).status).toBe(401);
    expect((await request(limited).post('/api/auth/login').send(TEST_USER)).status).toBe(429);
  });

  it('leaves the other routes alone', async () => {
    const limited = createTestApp(db, { config: { authRateLimit: 1 } });
    await badLogin(limited);
    expect((await badLogin(limited)).status).toBe(429);
    expect((await request(limited).get('/api/health')).status).toBe(200);
    expect((await request(limited).get('/api/me')).status).toBe(401);
  });

  it('counts each client address on its own, as reported by the production proxy', async () => {
    const production = createTestApp(db, { config: { production: true, authRateLimit: 1 } });
    const from = (address: string) => badLogin(production).set('X-Forwarded-For', address);
    expect((await from('203.0.113.1')).status).toBe(401);
    expect((await from('203.0.113.1')).status).toBe(429);
    expect((await from('203.0.113.2')).status).toBe(401);
  });
});

describe('the 100 KB body limit', () => {
  /** A JSON body of exactly `bytes` bytes. */
  function bodyOfSize(bytes: number): string {
    const padding = bytes - JSON.stringify({ username: '' }).length;
    return JSON.stringify({ username: 'x'.repeat(padding) });
  }

  function postBody(body: string) {
    return request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send(body);
  }

  it('refuses a bigger body with 413 in the R5 error format', async () => {
    const res = await postBody(bodyOfSize(100 * 1024 + 1));
    expect(res.status).toBe(413);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION', message: 'Request body is too large' },
    });
  });

  it('reads a body of exactly 100 KB', async () => {
    const res = await postBody(bodyOfSize(100 * 1024));
    // Read and parsed, then refused by the register schema instead.
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
    expect(res.body.error.message).toContain('username');
  });
});

describe('security headers', () => {
  it.each([
    ['a success', '/api/health', 200],
    ['an error', '/api/nope', 404],
  ])('are on %s', async (_kind, path, status) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(status);
    expect(res.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(res.get('Content-Security-Policy')).toContain("script-src 'self'");
    expect(res.get('Strict-Transport-Security')).toMatch(/max-age=\d+/);
    expect(res.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(res.get('Referrer-Policy')).toBe('no-referrer');
    expect(res.get('X-Powered-By')).toBeUndefined();
  });

  it('are on rate-limited answers too', async () => {
    const limited = createTestApp(db, { config: { authRateLimit: 1 } });
    await badLogin(limited);
    const res = await badLogin(limited);
    expect(res.status).toBe(429);
    expect(res.get('X-Content-Type-Options')).toBe('nosniff');
  });
});

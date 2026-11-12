import express from 'express';
import type { Express } from 'express';
import type { Knex } from 'knex';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.ts';
import { errorHandler } from '../src/middleware/errors.ts';
import { createTestDb, fixedNow } from './helpers.ts';

let db: Knex;
let app: Express;

beforeEach(async () => {
  db = await createTestDb();
  app = createApp({ db, now: fixedNow });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.destroy();
});

describe('GET /api/health', () => {
  it('returns 200 and ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });
});

describe('unknown /api routes', () => {
  it.each([
    ['get', '/api/nope'],
    ['post', '/api/health/extra'],
    ['delete', '/api'],
  ] as const)('%s %s returns 404 in the R5 error format', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: expect.stringContaining(path) },
    });
  });
});

describe('error middleware', () => {
  it('turns malformed JSON into a 400 VALIDATION error', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'VALIDATION', message: expect.any(String) } });
  });

  it('turns an unexpected error into a 500 INTERNAL error without leaking it', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failing = express();
    failing.get('/api/boom', () => {
      throw new Error('secret database password');
    });
    failing.use(errorHandler);

    const res = await request(failing).get('/api/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL', message: 'Internal server error' } });
    expect(JSON.stringify(res.body)).not.toContain('secret');
    expect(res.text).not.toContain('at ');
    expect(logged).toHaveBeenCalledOnce();
  });
});

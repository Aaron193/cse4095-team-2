import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError } from '../src/errors.ts';
import { asyncHandler } from '../src/middleware/asyncHandler.ts';
import { errorHandler } from '../src/middleware/errors.ts';
import { validateBody, validatedQuery, validateQuery } from '../src/middleware/validate.ts';

const bodySchema = z.strictObject({
  username: z.string().min(3).max(20),
  password: z.string().min(8),
  claimed: z.strictObject({ score: z.number().int() }).optional(),
});
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function testApp() {
  const app = express();
  app.use(express.json());
  app.post('/api/echo', validateBody(bodySchema), (req, res) => {
    res.json({ body: req.body });
  });
  app.get('/api/list', validateQuery(querySchema), (_req, res) => {
    res.json(validatedQuery<z.infer<typeof querySchema>>(res));
  });
  app.get(
    '/api/async-api-error',
    asyncHandler(async () => {
      await Promise.resolve();
      throw new ApiError(409, 'USERNAME_TAKEN', 'That username is taken');
    }),
  );
  app.get(
    '/api/async-crash',
    asyncHandler(async () => {
      await Promise.resolve();
      throw new Error('boom');
    }),
  );
  app.get(
    '/api/sync-throw',
    asyncHandler(() => {
      throw new ApiError(404, 'NOT_FOUND', 'No such run', { runId: 'r1' });
    }),
  );
  app.get(
    '/api/async-ok',
    asyncHandler(async (_req, res) => {
      await Promise.resolve();
      res.json({ ok: true });
    }),
  );
  app.use(errorHandler);
  return app;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('validateBody', () => {
  it('passes a valid body through', async () => {
    const body = { username: 'tyler', password: 'password1' };
    const res = await request(testApp()).post('/api/echo').send(body);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ body });
  });

  it('returns 400 VALIDATION in the R5 format with the bad field named in details', async () => {
    const res = await request(testApp())
      .post('/api/echo')
      .send({ username: 'ab', password: 'password1' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION',
        message: expect.stringContaining('username'),
        details: { fields: [{ path: 'username', message: expect.any(String) }] },
      },
    });
  });

  it('names every bad field, including nested and missing ones', async () => {
    const res = await request(testApp())
      .post('/api/echo')
      .send({ username: 'tyler', claimed: { score: 1.5 } });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.fields.map((f: { path: string }) => f.path);
    expect(paths.sort()).toEqual(['claimed.score', 'password']);
  });

  it('refuses unknown keys', async () => {
    const res = await request(testApp())
      .post('/api/echo')
      .send({ username: 'tyler', password: 'password1', admin: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
    expect(JSON.stringify(res.body.error)).toContain('admin');
  });

  it('treats a missing body as an empty object', async () => {
    const res = await request(testApp()).post('/api/echo');
    expect(res.status).toBe(400);
    const paths = res.body.error.details.fields.map((f: { path: string }) => f.path);
    expect(paths.sort()).toEqual(['password', 'username']);
  });
});

describe('validateQuery', () => {
  it('applies defaults and converts numbers', async () => {
    expect((await request(testApp()).get('/api/list')).body).toEqual({ limit: 20 });
    expect((await request(testApp()).get('/api/list?limit=5')).body).toEqual({ limit: 5 });
  });

  it('returns 400 VALIDATION naming the bad parameter', async () => {
    const res = await request(testApp()).get('/api/list?limit=500');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
    expect(res.body.error.details.fields[0].path).toBe('limit');
  });
});

describe('ApiError and asyncHandler', () => {
  it('sends an ApiError thrown in an async route in the R5 format', async () => {
    const res = await request(testApp()).get('/api/async-api-error');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { code: 'USERNAME_TAKEN', message: 'That username is taken' },
    });
  });

  it('sends details when the ApiError has them, and catches synchronous throws', async () => {
    const res = await request(testApp()).get('/api/sync-throw');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'No such run', details: { runId: 'r1' } },
    });
  });

  it('turns any other rejection into a 500 INTERNAL error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(testApp()).get('/api/async-crash');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  });

  it('leaves a successful async route alone', async () => {
    const res = await request(testApp()).get('/api/async-ok');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

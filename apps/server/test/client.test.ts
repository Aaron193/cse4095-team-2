// The built client served by the API process (task P1-D5).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Express } from 'express';
import type { Knex } from 'knex';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { findClientBuild } from '../src/client.ts';
import { createTestDb, fixedNow, testConfig } from './helpers.ts';

const INDEX_HTML = '<!doctype html><title>Daily Delve</title><div id="root"></div>';
const SCRIPT = 'console.log("app");';

let buildDir: string;
let db: Knex;
let app: Express;

beforeAll(() => {
  // A stand-in for apps/client/dist: index.html, a hashed asset, and a file at the top level.
  buildDir = mkdtempSync(path.join(tmpdir(), 'daily-delve-client-'));
  mkdirSync(path.join(buildDir, 'assets'));
  writeFileSync(path.join(buildDir, 'index.html'), INDEX_HTML);
  writeFileSync(path.join(buildDir, 'assets', 'index-abc123.js'), SCRIPT);
  writeFileSync(path.join(buildDir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
});

afterAll(() => {
  rmSync(buildDir, { recursive: true, force: true });
});

beforeEach(async () => {
  db = await createTestDb();
  app = createApp({ db, now: fixedNow, config: testConfig, clientDir: buildDir });
});

afterEach(async () => {
  await db.destroy();
});

describe('serving the client build', () => {
  it.each(['/', '/login', '/play/test-fight', '/no/such/page'])(
    'answers GET %s with index.html, revalidated on every visit',
    async (url) => {
      const res = await request(app).get(url);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/^text\/html/);
      expect(res.headers['cache-control']).toBe('no-cache');
      expect(res.text).toBe(INDEX_HTML);
    },
  );

  it('serves hashed assets, cacheable for a year', async () => {
    const res = await request(app).get('/assets/index-abc123.js');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/javascript/);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.text).toBe(SCRIPT);
  });

  it('answers a missing asset with 404, not index.html', async () => {
    const res = await request(app).get('/assets/index-gone.js');
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('<div id="root">');
  });

  it('serves other files in the build by name', async () => {
    const res = await request(app).get('/favicon.svg');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^image\/svg\+xml/);
  });

  it('keeps the API on the same port', async () => {
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.ok).toBe(true);

    const unknown = await request(app).get('/api/no-such-route');
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe('NOT_FOUND');
  });

  it('sends the security headers with the page', async () => {
    const res = await request(app).get('/');
    expect(res.headers['content-security-policy']).toContain("script-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('findClientBuild', () => {
  it('finds a folder with index.html', () => {
    expect(findClientBuild(buildDir)).toBe(buildDir);
  });

  it('is undefined when there is no build', () => {
    expect(findClientBuild(path.join(buildDir, 'assets'))).toBeUndefined();
  });
});

describe('without a client build', () => {
  it('leaves non-/api paths unanswered', async () => {
    const apiOnly = createApp({ db, now: fixedNow, config: testConfig });
    const res = await request(apiOnly).get('/play/test-fight');
    expect(res.status).toBe(404);
  });
});

import type { Express } from 'express';
import type { Knex } from 'knex';
import type { RegisterRequest, User } from '@daily-delve/shared';
import request from 'supertest';
import type { Response } from 'supertest';
import { createApp } from '../src/app.ts';
import type { AppConfig } from '../src/config.ts';
import { createDb, MEMORY_SQLITE, runMigrations } from '../src/db/knex.ts';
import { SESSION_COOKIE } from '../src/middleware/session.ts';

/**
 * A fresh, migrated database for one test. Uses Postgres when DATABASE_URL is set
 * (the Postgres CI job, task P1-D7), otherwise an in-memory SQLite database.
 */
export async function createTestDb(): Promise<Knex> {
  const databaseUrl = process.env.DATABASE_URL;
  const db = createDb(databaseUrl ? { databaseUrl } : { sqliteFile: MEMORY_SQLITE });
  if (databaseUrl) {
    // Postgres keeps data between tests, so start from empty tables.
    await runMigrations(db);
    await db.raw('TRUNCATE TABLE runs, daily_dungeons, users, sessions CASCADE');
  } else {
    await runMigrations(db);
  }
  return db;
}

export const FIXED_NOW = new Date('2026-11-12T12:00:00.000Z');
export const fixedNow = (): Date => FIXED_NOW;

export const DAY_MS = 24 * 60 * 60 * 1000;

/** A clock for tests that need time to pass: starts at FIXED_NOW unless told otherwise. */
export function testClock(start: Date = FIXED_NOW) {
  let current = start.getTime();
  return {
    now: (): Date => new Date(current),
    advance(ms: number): void {
      current += ms;
    },
  };
}

/** The configuration ordinary tests run with: cheap password hashing, no rate limit in reach. */
export const testConfig: AppConfig = {
  production: false,
  sessionSecret: 'test-session-secret',
  bcryptCost: 4,
  authRateLimit: 1000,
};

export interface TestAppOptions {
  now?: () => Date;
  /** Changes to testConfig. */
  config?: Partial<AppConfig>;
}

/** The real app on `db`, with testConfig and the fixed clock unless told otherwise. */
export function createTestApp(db: Knex, options: TestAppOptions = {}): Express {
  return createApp({
    db,
    now: options.now ?? fixedNow,
    config: { ...testConfig, ...options.config },
  });
}

/** The `dd.sid=...` pair from a response's Set-Cookie header, ready to send back as Cookie. */
export function sessionCookie(res: Response): string {
  const cookie = res.get('Set-Cookie')?.find((header) => header.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) throw new Error(`The response set no ${SESSION_COOKIE} cookie`);
  return cookie.split(';')[0]!;
}

export const TEST_USER: RegisterRequest = { username: 'tyler', password: 'correct horse' };

/** Registers a user through the API and returns it with its session cookie. */
export async function registerUser(
  app: Express,
  body: RegisterRequest = TEST_USER,
): Promise<{ user: User; cookie: string }> {
  const res = await request(app).post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register answered ${res.status}: ${res.text}`);
  return { user: res.body.user as User, cookie: sessionCookie(res) };
}

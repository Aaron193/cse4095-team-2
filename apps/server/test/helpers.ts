import type { Knex } from 'knex';
import type { Response } from 'supertest';
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

/** The configuration ordinary tests run with. */
export const testConfig: AppConfig = {
  production: false,
  sessionSecret: 'test-session-secret',
};

/** The `dd.sid=...` pair from a response's Set-Cookie header, ready to send back as Cookie. */
export function sessionCookie(res: Response): string {
  const cookie = res.get('Set-Cookie')?.find((header) => header.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) throw new Error(`The response set no ${SESSION_COOKIE} cookie`);
  return cookie.split(';')[0]!;
}

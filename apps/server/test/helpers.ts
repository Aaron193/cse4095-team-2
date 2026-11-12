import type { Knex } from 'knex';
import { createDb, MEMORY_SQLITE, runMigrations } from '../src/db/knex.ts';

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
    await db.raw('TRUNCATE TABLE runs, daily_dungeons, users CASCADE');
  } else {
    await runMigrations(db);
  }
  return db;
}

export const FIXED_NOW = new Date('2026-11-12T12:00:00.000Z');
export const fixedNow = (): Date => FIXED_NOW;

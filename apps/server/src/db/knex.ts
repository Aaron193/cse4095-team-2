// The database connection (task P0-B2; TODO.md, Reference R1 and R6).
// Postgres when DATABASE_URL is set, otherwise SQLite: a file in development,
// ':memory:' in tests.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import knex from 'knex';
import type { Knex } from 'knex';
import { MIGRATIONS } from '../../migrations/index.ts';
import type { Migration } from '../../migrations/index.ts';

const here = path.dirname(fileURLToPath(import.meta.url));

/** apps/server/data/dev.sqlite3 (gitignored). */
export const DEV_SQLITE_FILE = path.resolve(here, '../../data/dev.sqlite3');
export const MEMORY_SQLITE = ':memory:';

export interface DbOptions {
  /** A Postgres connection string. When set, SQLite is not used. */
  databaseUrl?: string | undefined;
  /** The SQLite file, or ':memory:'. Defaults to DEV_SQLITE_FILE. */
  sqliteFile?: string | undefined;
}

export function createDb(options: DbOptions = {}): Knex {
  if (options.databaseUrl) {
    return knex({ client: 'pg', connection: options.databaseUrl });
  }

  const filename = options.sqliteFile ?? DEV_SQLITE_FILE;
  if (filename !== MEMORY_SQLITE) mkdirSync(path.dirname(filename), { recursive: true });

  return knex({
    client: 'better-sqlite3',
    connection: { filename },
    useNullAsDefault: true,
    pool: {
      // An in-memory database lives in one connection, so the pool must never open a second.
      min: 1,
      max: 1,
      // SQLite leaves foreign keys off unless every connection turns them on.
      afterCreate: (
        connection: { pragma: (sql: string) => unknown },
        done: (err: Error | null, connection: unknown) => void,
      ) => {
        connection.pragma('foreign_keys = ON');
        done(null, connection);
      },
    },
  });
}

/** Chooses the database from the environment: `DATABASE_URL` unset means SQLite. */
export function createDbFromEnv(env: NodeJS.ProcessEnv = process.env): Knex {
  return createDb({ databaseUrl: env.DATABASE_URL });
}

const migrationSource: Knex.MigrationSource<Migration> = {
  getMigrations: async () => MIGRATIONS,
  getMigrationName: (migration) => migration.name,
  getMigration: async (migration) => migration,
};

/** Brings the database up to the latest migration. Safe to call on every startup. */
export async function runMigrations(db: Knex): Promise<void> {
  await db.migrate.latest({ migrationSource });
}

/** Undoes every migration. For tests. */
export async function rollbackAllMigrations(db: Knex): Promise<void> {
  await db.migrate.rollback({ migrationSource }, true);
}

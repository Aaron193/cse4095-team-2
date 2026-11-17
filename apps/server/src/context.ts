// What createApp hands to the routers, middleware, and services that need it.
import type { Knex } from 'knex';
import type { AppConfig } from './config.ts';

export interface AppContext {
  /** A migrated database: see src/db/knex.ts. */
  db: Knex;
  /** The only way server code reads the time (R5, "The clock"). */
  now: () => Date;
  config: AppConfig;
}

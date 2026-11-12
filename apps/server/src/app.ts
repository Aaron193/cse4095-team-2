// Builds the Express app. Everything the app depends on is passed in, so tests can
// supply an in-memory database and a fixed clock (TODO.md, Reference R1 and R5).
import express from 'express';
import type { Express } from 'express';
import type { Knex } from 'knex';
import { errorHandler, notFoundHandler } from './middleware/errors.ts';
import { healthRouter } from './routes/health.ts';

export interface AppDeps {
  /** A migrated database: see src/db/knex.ts. */
  db: Knex;
  /** The only way server code reads the time (R5, "The clock"). */
  now: () => Date;
}

export function createApp(_deps: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api', healthRouter());

  // Anything else under /api is unknown. Non-/api paths are left for the client (P1-D5).
  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}

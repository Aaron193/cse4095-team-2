// Builds the Express app. Everything the app depends on is passed in, so tests can
// supply an in-memory database, a fixed clock, and their own configuration
// (TODO.md, Reference R1 and R5).
import express from 'express';
import type { Express } from 'express';
import type { Knex } from 'knex';
import { resolveConfig } from './config.ts';
import type { AppConfig } from './config.ts';
import type { AppContext } from './context.ts';
import { errorHandler, notFoundHandler } from './middleware/errors.ts';
import { sessionMiddleware } from './middleware/session.ts';
import { healthRouter } from './routes/health.ts';

export interface AppDeps {
  /** A migrated database: see src/db/knex.ts. */
  db: Knex;
  /** The only way server code reads the time (R5, "The clock"). */
  now: () => Date;
  /** Missing fields fall back to the development defaults in src/config.ts. */
  config?: Partial<AppConfig>;
}

export function createApp(deps: AppDeps): Express {
  const ctx: AppContext = { db: deps.db, now: deps.now, config: resolveConfig(deps.config) };

  const app = express();
  app.disable('x-powered-by');
  // In production the app runs behind the host's proxy. Trusting its X-Forwarded-* headers
  // makes req.secure true over HTTPS, which the Secure session cookie needs.
  if (ctx.config.production) app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/api', sessionMiddleware(ctx));

  app.use('/api', healthRouter());

  // Anything else under /api is unknown. Non-/api paths are left for the client (P1-D5).
  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}

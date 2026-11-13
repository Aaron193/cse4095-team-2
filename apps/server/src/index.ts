// Entry point: `npm run dev -w apps/server`.
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createDbFromEnv, runMigrations } from './db/knex.ts';

const port = Number(process.env.PORT ?? 3000);

// Read first, so a production server with a missing secret stops before touching the database.
const config = loadConfig(process.env);

const db = createDbFromEnv();
await runMigrations(db);

const app = createApp({ db, now: () => new Date(), config });
app.listen(port, () => {
  console.log(`Daily Delve server listening on http://localhost:${port}`);
});

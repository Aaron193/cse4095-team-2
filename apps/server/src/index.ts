// Entry point. `npm start` at the root runs it in production (task P1-D5): it migrates the
// database, then serves the API and, when apps/client/dist exists, the client, on one port.
// `npm run dev` runs it under `tsx watch` next to Vite, which serves the client instead.
import { createApp } from './app.ts';
import { findClientBuild } from './client.ts';
import { loadConfig } from './config.ts';
import { createDbFromEnv, runMigrations } from './db/knex.ts';

const port = Number(process.env.PORT ?? 3000);

// Read first, so a production server with a missing secret stops before touching the database.
const config = loadConfig(process.env);

const db = createDbFromEnv();
await runMigrations(db);

const clientDir = findClientBuild();
const app = createApp({ db, now: () => new Date(), config, clientDir });
app.listen(port, () => {
  const serving = clientDir ? 'the app and the API' : 'the API (no client build)';
  console.log(`Daily Delve is serving ${serving} on http://localhost:${port}`);
});

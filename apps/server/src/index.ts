// Entry point: `npm run dev -w apps/server`.
import { createApp } from './app.ts';
import { createDbFromEnv, runMigrations } from './db/knex.ts';

const port = Number(process.env.PORT ?? 3000);

const db = createDbFromEnv();
await runMigrations(db);

const app = createApp({ db, now: () => new Date() });
app.listen(port, () => {
  console.log(`Daily Delve server listening on http://localhost:${port}`);
});

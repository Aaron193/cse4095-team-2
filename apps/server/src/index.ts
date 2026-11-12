// Entry point: `npm run dev -w apps/server`.
import { createApp } from './app.ts';

const port = Number(process.env.PORT ?? 3000);
const app = createApp({ db: null, now: () => new Date() });

app.listen(port, () => {
  console.log(`Daily Delve server listening on http://localhost:${port}`);
});

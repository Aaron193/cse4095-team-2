import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // Against Postgres every test file shares one database, so files run one at a time.
    // In-memory SQLite gives each test its own database and can run in parallel.
    fileParallelism: !process.env.DATABASE_URL,
  },
});

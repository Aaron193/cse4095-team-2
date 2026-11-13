import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The API runs as its own process in development (TODO.md, Reference R1).
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    // jsdom, with Node's AbortSignal and the other classes Node's fetch accepts.
    environment: './src/test/jsdom-environment.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    css: false,
  },
});

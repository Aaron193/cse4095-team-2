// The test environment: Vitest's jsdom, but with Node's own AbortController, AbortSignal,
// Headers, URL, and URLSearchParams kept (vite.config.ts points `test.environment` here).
//
// jsdom has no fetch, so tests use Node's, through the mock API (src/mocks). Vitest 3's jsdom
// environment swaps in jsdom's versions of the classes above, and Node 24's fetch accepts only
// its own AbortSignal: every request made with a signal failed, and GET /api/me read as logged
// out (vitest-dev/vitest#8374). Vitest 4 keeps Node's versions itself (vitest-dev/vitest#8390),
// so this file can go once the client is on Vitest 4.
import { builtinEnvironments } from 'vitest/environments';
import type { Environment } from 'vitest/environments';

const NODE_FETCH_GLOBALS = [
  'AbortController',
  'AbortSignal',
  'Headers',
  'URL',
  'URLSearchParams',
] as const;

const jsdom = builtinEnvironments.jsdom;

const environment: Environment = {
  name: 'jsdom-node-fetch',
  transformMode: jsdom.transformMode,
  async setup(global: typeof globalThis, options) {
    const kept = Object.fromEntries(NODE_FETCH_GLOBALS.map((name) => [name, global[name]]));
    const teardown = await jsdom.setup(global, options);
    Object.assign(global, kept);
    return teardown;
  },
};

export default environment;

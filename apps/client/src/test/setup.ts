import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetMockData } from '../mocks/data.ts';
import { server } from '../mocks/server.ts';

// jsdom has no canvas, and its getContext logs "Not implemented" on every call. Return null
// quietly instead, as a browser does for a context it cannot make; screens that draw on a
// canvas (the dungeon map) skip drawing then, and their renderers are tested on their own.
HTMLCanvasElement.prototype.getContext = (() => null) as HTMLCanvasElement['getContext'];

// Every test file talks to the mock API (src/mocks). A request it has no answer for fails the
// test instead of going to the network.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockData();
});

afterAll(() => {
  server.close();
});

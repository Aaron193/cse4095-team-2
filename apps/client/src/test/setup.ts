import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetMockData } from '../mocks/data.ts';
import { server } from '../mocks/server.ts';

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

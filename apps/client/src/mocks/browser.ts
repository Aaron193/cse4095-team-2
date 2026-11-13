// The mock API in the browser (task P1-D2). main.tsx starts it in development when
// VITE_USE_MOCKS=1, so the client runs with no server: `VITE_USE_MOCKS=1 npm run dev -w apps/client`.
import { setupWorker } from 'msw/browser';
import { loadMockData, mockData, utcDay } from './data.ts';
import type { MockData } from './data.ts';
import { handlers } from './handlers.ts';

export const worker = setupWorker(...handlers);

// The mock data lives in memory, so a reload would forget new accounts and end the session.
// A copy in sessionStorage keeps both across reloads in this tab, as the real cookie would.
const STORAGE_KEY = 'dd.mocks.v1';

function restore(): void {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as MockData | null;
    // Data seeded on an earlier day has no runs for today, so start over instead.
    if (saved && saved.seededDay === utcDay(new Date()) && Array.isArray(saved.users)) {
      loadMockData(saved);
    }
  } catch {
    // Unreadable: keep the freshly seeded data.
  }
}

function save(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mockData()));
  } catch {
    // Storage is full or blocked: the data just won't survive a reload.
  }
}

export async function startMockApi(): Promise<void> {
  restore();
  worker.events.on('response:mocked', save);
  await worker.start({
    // Vite's own requests (modules, fonts, hot reload) go through untouched and unlogged.
    onUnhandledRequest(request, print) {
      if (new URL(request.url).pathname.startsWith('/api/')) print.warning();
    },
  });
}

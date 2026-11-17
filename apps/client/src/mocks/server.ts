// The mock API in Node, for tests (task P1-D2). src/test/setup.ts starts it for every test file
// and resets the data between tests. A test can change one answer with `server.use(...)`.
import { setupServer } from 'msw/node';
import { handlers } from './handlers.ts';

export const server = setupServer(...handlers);

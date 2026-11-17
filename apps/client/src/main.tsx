import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App.tsx';
import './styles/app.css';

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

// With VITE_USE_MOCKS=1 in development, the API is answered in the browser by src/mocks, so
// the client runs without the server. The import is dynamic and behind `DEV`, so a production
// build contains no mock code.
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === '1') {
  import('./mocks/browser.ts')
    .then(({ startMockApi }) => startMockApi())
    .catch((error: unknown) => console.error('The mock API did not start:', error))
    .then(render);
} else {
  render();
}

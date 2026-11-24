// Today's dungeon (task P2-C8), against the mock API (src/mocks).
import { ENGINE_VERSION } from '@daily-delve/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { submitRun } from '../api/client.ts';
import { AuthProvider } from '../auth/AuthContext.tsx';
import { fixtureDungeon } from '../game/fixtures/index.ts';
import { DEMO_USERNAME, logInAs, utcDay } from '../mocks/data.ts';
import { server } from '../mocks/server.ts';
import { HomeScreen } from './HomeScreen.tsx';

/** Where /play was sent, and with what location state. */
function PlayProbe() {
  const location = useLocation();
  return <pre data-testid="play-state">{JSON.stringify(location.state)}</pre>;
}

function renderToday(
  preview: (seed: string) => ReturnType<typeof fixtureDungeon> = fixtureDungeon,
) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeScreen preview={preview} />} />
          <Route path="/play" element={<PlayProbe />} />
          <Route path="/login" element={<h1>Log in</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const officialButton = () => screen.queryByRole('button', { name: 'Official run' });

describe("Today's dungeon", () => {
  it("shows today's date and the map preview", async () => {
    logInAs(DEMO_USERNAME);
    renderToday();
    expect(await screen.findByText(utcDay(new Date()))).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: 'Map preview' })).toHaveTextContent('10 sites');
  });

  it('before the official run: offers Official run and Practice run', async () => {
    logInAs(DEMO_USERNAME);
    renderToday();
    expect(await screen.findByRole('button', { name: 'Official run' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Practice run' })).toBeEnabled();
    expect(screen.queryByRole('region', { name: 'Your official run' })).not.toBeInTheDocument();
  });

  it('after the official run: shows its result in place of the Official button', async () => {
    logInAs(DEMO_USERNAME);
    await submitRun({
      date: utcDay(new Date()),
      official: true,
      engineVersion: ENGINE_VERSION,
      actions: [{ type: 'endTurn' }],
      claimed: { outcome: 'lost', nodesCleared: 6, score: 740, turns: 38 },
    });
    renderToday();
    const result = await screen.findByRole('region', { name: 'Your official run' });
    expect(result).toHaveTextContent('Cleared 6 sites');
    expect(result).toHaveTextContent('Score740');
    expect(result).toHaveTextContent('Turns38');
    expect(result).toHaveTextContent('Verified');
    expect(officialButton()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Practice run' })).toBeEnabled();
  });

  it('starts a run on the returned seed', async () => {
    const user = userEvent.setup();
    logInAs(DEMO_USERNAME);
    let seed = '';
    server.events.on('response:mocked', async ({ request, response }) => {
      if (new URL(request.url).pathname === '/api/dungeons/today') {
        seed = ((await response.clone().json()) as { seed: string }).seed;
      }
    });
    renderToday();
    await user.click(await screen.findByRole('button', { name: 'Practice run' }));
    expect(JSON.parse(screen.getByTestId('play-state').textContent!)).toEqual({
      seed,
      date: utcDay(new Date()),
      mode: 'practice',
    });
    server.events.removeAllListeners();
  });

  it('logged out: both buttons lead to the login screen', async () => {
    renderToday();
    const official = await screen.findByRole('link', { name: 'Official run' });
    expect(official).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Practice run' })).toHaveAttribute('href', '/login');
  });

  it('says so when the preview cannot be generated', async () => {
    logInAs(DEMO_USERNAME);
    renderToday(() => {
      throw new Error('not implemented: generateDungeon (task P2-A2)');
    });
    expect(await screen.findByText('The map preview is not available yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Practice run' })).toBeEnabled();
  });

  it('offers a retry when the request fails', async () => {
    const user = userEvent.setup();
    logInAs(DEMO_USERNAME);
    server.use(http.get('/api/dungeons/today', () => HttpResponse.error(), { once: true }));
    renderToday();
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: 'Official run' })).toBeInTheDocument();
  });
});

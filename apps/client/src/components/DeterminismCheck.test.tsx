import { render, screen } from '@testing-library/react';
import { ENGINE_VERSION } from '@daily-delve/shared';
import type { Health } from '@daily-delve/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserRngCheck } from '../game/selfcheck.ts';
import { DeterminismCheck } from './DeterminismCheck.tsx';

// The committed known answers for createRng('selfcheck', 'health'). The server's health test
// (apps/server/test/app.test.ts) asserts that /api/health returns exactly these, so this is
// what a real server sends.
const SERVER_NUMBERS = [444, 394, 59, 197, 499];

function mockHealth(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browserRngCheck', () => {
  it('computes the same five numbers in the browser as the server sends', () => {
    expect(browserRngCheck()).toEqual(SERVER_NUMBERS);
  });
});

describe('DeterminismCheck', () => {
  it('shows both lists and that they are equal', async () => {
    const health: Health = { ok: true, engineVersion: ENGINE_VERSION, rngCheck: SERVER_NUMBERS };
    mockHealth(health);
    render(<DeterminismCheck />);

    expect(await screen.findByText(/Match\./)).toBeInTheDocument();
    const browser = screen.getByLabelText('Browser numbers').textContent;
    const server = screen.getByLabelText('Server numbers').textContent;
    expect(browser).toBe('444, 394, 59, 197, 499');
    expect(server).toBe(browser);
    expect(fetch).toHaveBeenCalledWith('/api/health', expect.anything());
  });

  it('reports a mismatch when the server draws different numbers', async () => {
    mockHealth({ ok: true, engineVersion: ENGINE_VERSION, rngCheck: [1, 2, 3, 4, 5] });
    render(<DeterminismCheck />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Mismatch');
    expect(screen.getByLabelText('Server numbers')).toHaveTextContent('1, 2, 3, 4, 5');
    expect(screen.queryByText(/Match\./)).toBeNull();
  });

  it('reports a different engine version even when the numbers match', async () => {
    mockHealth({ ok: true, engineVersion: '9.9.9', rngCheck: SERVER_NUMBERS });
    render(<DeterminismCheck />);
    expect(await screen.findByRole('alert')).toHaveTextContent('engine versions differ');
  });

  it('says so when the server answers with an error', async () => {
    mockHealth({ error: { code: 'INTERNAL', message: 'x' } }, 500);
    render(<DeterminismCheck />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server (500 INTERNAL)',
    );
    expect(screen.getByLabelText('Browser numbers')).toHaveTextContent('444, 394, 59, 197, 499');
  });

  it('says so when the server cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    render(<DeterminismCheck />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server (no answer)',
    );
  });
});

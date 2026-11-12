import { Router } from 'express';
import { createRng, ENGINE_VERSION, nextInt } from '@daily-delve/shared';
import type { Health } from '@daily-delve/shared';

/**
 * Five numbers from the shared random generator (TODO.md, Reference R5). The client computes
 * the same five in the browser; if the two lists ever differ, the engine is not deterministic
 * across the two environments and run verification cannot work.
 */
function rngCheck(): number[] {
  const rng = createRng('selfcheck', 'health');
  const values: number[] = [];
  for (let i = 0; i < 5; i++) values.push(nextInt(rng, 1000));
  return values;
}

export function healthRouter(): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    const body: Health = { ok: true, engineVersion: ENGINE_VERSION, rngCheck: rngCheck() };
    res.json(body);
  });
  return router;
}

// Today's dungeon (TODO.md, Reference R5): GET /dungeons/today (task P1-B6). No login needed.
import { Router } from 'express';
import { ENGINE_VERSION } from '@daily-delve/shared';
import type { TodayResponse } from '@daily-delve/shared';
import type { AppContext } from '../context.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { getOrCreateDungeon, utcDate } from '../services/dungeons.ts';

export function dungeonsRouter(ctx: AppContext): Router {
  const router = Router();

  router.get(
    '/dungeons/today',
    asyncHandler(async (_req, res) => {
      const dungeon = await getOrCreateDungeon(ctx, utcDate(ctx.now()));
      const body: TodayResponse = {
        date: dungeon.date,
        seed: dungeon.seed,
        engineVersion: ENGINE_VERSION,
        // The caller's official run for the day comes with task P2-B4.
        officialRun: null,
      };
      res.json(body);
    }),
  );

  return router;
}

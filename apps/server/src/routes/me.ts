// The logged-in user (TODO.md, Reference R5): GET /me (task P1-B4).
import { Router } from 'express';
import type { UserResponse } from '@daily-delve/shared';
import type { AppContext } from '../context.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { endSession, requireAuth, sessionUserId, unauthenticated } from '../middleware/session.ts';
import { findUserById } from '../services/users.ts';

export function meRouter(ctx: AppContext): Router {
  const router = Router();

  router.get(
    '/me',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await findUserById(ctx, sessionUserId(req));
      if (!user) {
        // The account no longer exists, so neither should its session.
        await endSession(req, res, ctx.config);
        throw unauthenticated();
      }
      const body: UserResponse = { user };
      res.json(body);
    }),
  );

  return router;
}

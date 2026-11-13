// Accounts and sessions (TODO.md, Reference R5): POST /auth/register (task P1-B2).
import { Router } from 'express';
import { z } from 'zod';
import type { UserResponse } from '@daily-delve/shared';
import type { AppContext } from '../context.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { startSession } from '../middleware/session.ts';
import { validateBody } from '../middleware/validate.ts';
import { createUser } from '../services/users.ts';

// The R5 limits, shared by every route that takes these fields.

/** 3 to 20 of a-z, 0-9, and _. Any letter case is accepted; the users service lowercases it. */
export const usernameField = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[A-Za-z0-9_]*$/, 'Username may contain only letters, digits, and _');

export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

/** 1 to 24 characters after trimming. */
export const displayNameField = z
  .string()
  .trim()
  .min(1, 'Display name must not be empty')
  .max(24, 'Display name must be at most 24 characters');

const registerBody = z.strictObject({
  username: usernameField,
  password: passwordField,
  displayName: displayNameField.optional(),
});

export function authRouter(ctx: AppContext): Router {
  const router = Router();

  router.post(
    '/auth/register',
    validateBody(registerBody),
    asyncHandler(async (req, res) => {
      const user = await createUser(ctx, req.body as z.infer<typeof registerBody>);
      await startSession(req, user.id);
      const body: UserResponse = { user };
      res.status(201).json(body);
    }),
  );

  return router;
}

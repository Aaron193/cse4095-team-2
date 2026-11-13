// Accounts (TODO.md, Reference R5 and R6). Passwords are kept only as bcrypt hashes, and a
// hash never leaves this module: everything it returns is the public User.
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { User } from '@daily-delve/shared';
import type { AppContext } from '../context.ts';
import { isUniqueViolation } from '../db/errors.ts';
import { mapUser } from '../db/rows.ts';
import type { UserRow } from '../db/rows.ts';
import { ApiError } from '../errors.ts';

export interface NewUser {
  /** In any letter case: usernames are compared without regard to case and stored lowercase. */
  username: string;
  password: string;
  /** Defaults to the username as typed. */
  displayName?: string | undefined;
}

function usernameTaken(): ApiError {
  return new ApiError(409, 'USERNAME_TAKEN', 'That username is taken');
}

/**
 * Creates an account (task P1-B2). Throws 409 USERNAME_TAKEN when the username is already
 * in use in any letter case. The input must already meet the R5 limits.
 */
export async function createUser({ db, now, config }: AppContext, input: NewUser): Promise<User> {
  const username = input.username.toLowerCase();
  // Checked first so a taken name costs no hashing. The insert below still catches a
  // registration that takes the name in between.
  if (await db('users').where({ username }).first('id')) throw usernameTaken();

  const row: UserRow = {
    id: randomUUID(),
    username,
    password_hash: await bcrypt.hash(input.password, config.bcryptCost),
    display_name: input.displayName ?? input.username,
    created_at: now().toISOString(),
  };
  try {
    await db('users').insert(row);
  } catch (err) {
    if (isUniqueViolation(err)) throw usernameTaken();
    throw err;
  }
  return mapUser(row);
}

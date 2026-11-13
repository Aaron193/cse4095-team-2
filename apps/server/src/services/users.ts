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

// A hash of a password nobody has, one per bcrypt cost, made the first time it is needed.
const dummyHashes = new Map<number, Promise<string>>();

function dummyHash(cost: number): Promise<string> {
  let hash = dummyHashes.get(cost);
  if (!hash) {
    hash = bcrypt.hash('no account has this password', cost);
    hash.catch(() => dummyHashes.delete(cost));
    dummyHashes.set(cost, hash);
  }
  return hash;
}

/**
 * The user with this username (in any letter case) and password, or null (task P1-B3).
 * An unknown username still costs one bcrypt comparison, against a dummy hash, so that it
 * takes about as long as a wrong password and the timing does not reveal which it was.
 */
export async function verifyCredentials(
  { db, config }: AppContext,
  username: string,
  password: string,
): Promise<User | null> {
  const row = await db<UserRow>('users').where({ username: username.toLowerCase() }).first();
  if (!row) {
    await bcrypt.compare(password, await dummyHash(config.bcryptCost));
    return null;
  }
  return (await bcrypt.compare(password, row.password_hash)) ? mapUser(row) : null;
}

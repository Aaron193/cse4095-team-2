// Sessions (task P1-B1; TODO.md, Reference R5): express-session with the cookie dd.sid and
// the database store in src/db/sessionStore.ts, plus requireAuth for routes that need a
// logged-in user.
import session from 'express-session';
import type { Request, RequestHandler, Response } from 'express';
import type { AppConfig } from '../config.ts';
import type { AppContext } from '../context.ts';
import { KnexSessionStore } from '../db/sessionStore.ts';
import { ApiError } from '../errors.ts';

declare module 'express-session' {
  interface SessionData {
    /** The logged-in user. Set only by startSession. */
    userId: string;
  }
}

export const SESSION_COOKIE = 'dd.sid';
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** The cookie's attributes, for the cookie that starts a session and the one that clears it. */
export function sessionCookieOptions(config: AppConfig) {
  return { path: '/', httpOnly: true, sameSite: 'lax', secure: config.production } as const;
}

export function sessionMiddleware({ db, now, config }: AppContext): RequestHandler {
  return session({
    name: SESSION_COOKIE,
    secret: config.sessionSecret,
    store: new KnexSessionStore({ db, now, ttlMs: SESSION_MAX_AGE_MS }),
    resave: false,
    saveUninitialized: false,
    cookie: { ...sessionCookieOptions(config), maxAge: SESSION_MAX_AGE_MS },
  });
}

function unauthenticated(): ApiError {
  return new ApiError(401, 'UNAUTHENTICATED', 'You must be logged in');
}

/** Lets the request through only when its session belongs to a logged-in user. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  if (typeof req.session.userId === 'string') next();
  else next(unauthenticated());
};

/**
 * Logs the request in as `userId`. The session gets a new ID first, so an ID planted before
 * login is worthless after it (session fixation), and it is saved before the response.
 */
export async function startSession(req: Request, userId: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err: unknown) => (err ? reject(err) : resolve()));
  });
  req.session.userId = userId;
  await new Promise<void>((resolve, reject) => {
    req.session.save((err: unknown) => (err ? reject(err) : resolve()));
  });
}

/** Logs the request out: the session is deleted from the store and the cookie cleared. */
export async function endSession(req: Request, res: Response, config: AppConfig): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((err: unknown) => (err ? reject(err) : resolve()));
  });
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions(config));
}

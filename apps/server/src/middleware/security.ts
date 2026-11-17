// Security middleware (task P1-B5; TODO.md, Reference R5): security headers, the 100 KB
// body limit, and the rate limit on /api/auth/*.
import express from 'express';
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { ApiError } from '../errors.ts';

/**
 * Helmet's default headers, including its Content-Security-Policy. The defaults fit: in
 * production the client is served from this same origin, with its own scripts, styles,
 * fonts, and images.
 */
export function securityHeaders(): RequestHandler {
  return helmet();
}

/** R5, "Body at most 100 KB". A bigger body gets the error middleware's 413 answer. */
export const JSON_BODY_LIMIT = '100kb';

export function jsonBody(): RequestHandler {
  return express.json({ limit: JSON_BODY_LIMIT });
}

export const AUTH_RATE_WINDOW_MS = 60 * 1000;

/**
 * At most `limit` requests a minute from one client address; the rest get 429 RATE_LIMITED
 * with a Retry-After header. The address is req.ip, which in production comes from the
 * proxy's X-Forwarded-For (createApp sets trust proxy).
 */
export function authRateLimit(limit: number): RequestHandler {
  return rateLimit({
    windowMs: AUTH_RATE_WINDOW_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new ApiError(429, 'RATE_LIMITED', 'Too many requests. Try again in a minute.'));
    },
  });
}

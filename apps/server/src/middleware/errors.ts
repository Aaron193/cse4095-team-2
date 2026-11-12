// The 404 handler and the error middleware. Every error leaves the server in the R5 shape:
// { error: { code, message, details? } }. Stack traces and internal messages never do.
import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiError as ApiErrorBody, ErrorCode } from '@daily-delve/shared';
import { ApiError } from '../errors.ts';

export function errorBody(code: ErrorCode, message: string, details?: unknown): ApiErrorBody {
  return details === undefined
    ? { error: { code, message } }
    : { error: { code, message, details } };
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(errorBody('NOT_FOUND', `No route for ${req.method} ${req.originalUrl}`));
};

/** The status that body-parsing and similar library errors carry, if any. */
function libraryStatus(err: unknown): number | null {
  if (typeof err !== 'object' || err === null) return null;
  const { status, statusCode } = err as { status?: unknown; statusCode?: unknown };
  const value = typeof status === 'number' ? status : statusCode;
  return typeof value === 'number' && value >= 400 && value < 500 ? value : null;
}

// Express recognizes error middleware by its four parameters, so `_next` must stay.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json(errorBody(err.code, err.message, err.details));
    return;
  }
  const status = libraryStatus(err);
  if (status !== null) {
    // Raised by Express itself for a request it could not read: malformed JSON (400),
    // a body over the size limit (413), and so on.
    const message = status === 413 ? 'Request body is too large' : 'Request could not be read';
    res.status(status).json(errorBody('VALIDATION', message));
    return;
  }
  console.error(err);
  res.status(500).json(errorBody('INTERNAL', 'Internal server error'));
};

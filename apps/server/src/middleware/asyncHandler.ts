import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => unknown;

/**
 * Wraps a route so that anything it throws, or any promise it rejects, reaches the error
 * middleware. Every async route is registered through this.
 */
export function asyncHandler(route: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    new Promise((resolve) => resolve(route(req, res, next))).catch(next);
  };
}

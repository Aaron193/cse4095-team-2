// Request validation with zod (task P0-B4). A schema failure becomes a 400 VALIDATION
// error whose `details.fields` names each bad field:
//   { error: { code: 'VALIDATION', message, details: { fields: [{ path, message }] } } }
import type { RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../errors.ts';

export interface FieldError {
  /** Dotted path of the field, for example "claimed.score" or "actions.3.type". */
  path: string;
  message: string;
}

export interface ValidationDetails {
  fields: FieldError[];
}

function parse<T>(schema: ZodType<T>, value: unknown, where: 'body' | 'query'): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const fields: FieldError[] = result.error.issues.map((issue) => ({
    path: issue.path.map(String).join('.') || `(${where})`,
    message: issue.message,
  }));
  const names = [...new Set(fields.map((field) => field.path))].join(', ');
  const details: ValidationDetails = { fields };
  throw new ApiError(400, 'VALIDATION', `Invalid request ${where}: ${names}`, details);
}

/** Checks `req.body` against the schema and replaces it with the parsed value. */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    req.body = parse(schema, req.body ?? {}, 'body');
    next();
  };
}

/**
 * Checks `req.query` against the schema. The parsed value (with defaults and number
 * conversions applied) is read back with `validatedQuery(res)`.
 */
export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    res.locals.validatedQuery = parse(schema, req.query, 'query');
    next();
  };
}

export function validatedQuery<T>(res: Response): T {
  return res.locals.validatedQuery as T;
}

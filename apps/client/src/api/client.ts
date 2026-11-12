// The typed API client (task P1-D1): one function per endpoint in TODO.md, Reference R5.
// Screens reach the server only through these functions (Docs/screens.md).
//
// Every function sends and reads JSON, sends the session cookie, and takes an optional last
// argument `{ signal }`. A failed call throws an `ApiClientError`; aborting a call rejects
// it with the signal's own AbortError instead, so callers can tell the two apart.
import { ERROR_CODES } from '@daily-delve/shared';
import type {
  ApiError,
  DeleteMeRequest,
  ErrorCode,
  Health,
  LeaderboardResponse,
  LoginRequest,
  RegisterRequest,
  RunListResponse,
  SubmitRunRequest,
  SubmitRunResponse,
  TodayResponse,
  UpdateMeRequest,
  UserResponse,
} from '@daily-delve/shared';

/** Every path below is relative to this. The server and the Vite dev proxy are same-origin. */
export const API_BASE = '/api';

/** The optional last argument of every function. */
export interface RequestOptions {
  signal?: AbortSignal;
}

/** Paging for `GET /me/runs`. The server's defaults apply to anything left out. */
export interface RunListQuery {
  limit?: number;
  offset?: number;
}

/** `GET /leaderboard`. `date` is a UTC day, "YYYY-MM-DD"; the server defaults it to today. */
export interface LeaderboardQuery {
  date?: string;
  limit?: number;
  offset?: number;
}

/** The R5 error codes, plus one for a request that never got an answer. */
export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR';

/**
 * Thrown by every function on failure.
 * - An R5 error body keeps the server's `code`, `message`, and `details`.
 * - No response at all (offline, server down): `status` 0 and code `NETWORK_ERROR`.
 * - A response that is not an R5 error (an HTML error page, unreadable JSON): code `INTERNAL`.
 */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ClientErrorCode;
  readonly details: unknown;

  constructor(
    status: number,
    code: ClientErrorCode,
    message: string,
    details?: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const KNOWN_CODES: ReadonlySet<string> = new Set(ERROR_CODES);

function isApiErrorBody(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) return false;
  const { error } = value as { error?: unknown };
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return typeof code === 'string' && KNOWN_CODES.has(code) && typeof message === 'string';
}

function networkError(cause: unknown): ApiClientError {
  return new ApiClientError(0, 'NETWORK_ERROR', "Can't reach the server.", undefined, { cause });
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Sends one request and returns the parsed JSON body, or `undefined` for a 204. */
async function request<T>(
  method: Method,
  path: string,
  body: unknown,
  { signal }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const init: RequestInit = { method, headers, credentials: 'same-origin' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  if (signal) init.signal = signal;

  let response: Response;
  let text: string;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
    text = await response.text();
  } catch (error) {
    if (signal?.aborted) throw error;
    throw networkError(error);
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown;
  let readable = text !== '';
  try {
    payload = readable ? JSON.parse(text) : undefined;
  } catch {
    readable = false;
  }

  if (response.ok) {
    if (!readable) {
      throw new ApiClientError(response.status, 'INTERNAL', 'The server sent an unreadable reply.');
    }
    return payload as T;
  }
  if (isApiErrorBody(payload)) {
    const { code, message, details } = payload.error;
    throw new ApiClientError(response.status, code, message, details);
  }
  throw new ApiClientError(
    response.status,
    'INTERNAL',
    `The server answered ${response.status} without an error body.`,
  );
}

/** Adds the parameters that are set as a query string. */
function withQuery(path: string, query: RunListQuery | LeaderboardQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query) as [string, string | number | undefined][]) {
    if (value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return search === '' ? path : `${path}?${search}`;
}

/** `GET /health`: the engine version and the five-number determinism check. */
export function getHealth(options?: RequestOptions): Promise<Health> {
  return request('GET', '/health', undefined, options);
}

/** `POST /auth/register`: creates the account and starts a session. */
export function register(body: RegisterRequest, options?: RequestOptions): Promise<UserResponse> {
  return request('POST', '/auth/register', body, options);
}

/** `POST /auth/login`: starts a session. */
export function login(body: LoginRequest, options?: RequestOptions): Promise<UserResponse> {
  return request('POST', '/auth/login', body, options);
}

/** `POST /auth/logout`: ends the session. */
export function logout(options?: RequestOptions): Promise<void> {
  return request('POST', '/auth/logout', undefined, options);
}

/** `GET /me`: the logged-in user. 401 `UNAUTHENTICATED` when there is no session. */
export function getMe(options?: RequestOptions): Promise<UserResponse> {
  return request('GET', '/me', undefined, options);
}

/** `PATCH /me`: a new display name, or a new password with the current one. */
export function updateMe(body: UpdateMeRequest, options?: RequestOptions): Promise<UserResponse> {
  return request('PATCH', '/me', body, options);
}

/** `DELETE /me`: deletes the account and all its runs. */
export function deleteMe(body: DeleteMeRequest, options?: RequestOptions): Promise<void> {
  return request('DELETE', '/me', body, options);
}

/** `GET /dungeons/today`: today's date and seed, and the caller's official run if any. */
export function getToday(options?: RequestOptions): Promise<TodayResponse> {
  return request('GET', '/dungeons/today', undefined, options);
}

/** `POST /runs`: submits a finished run for the server to verify. */
export function submitRun(
  body: SubmitRunRequest,
  options?: RequestOptions,
): Promise<SubmitRunResponse> {
  return request('POST', '/runs', body, options);
}

/** `GET /me/runs`: the caller's run history, one page at a time. */
export function getMyRuns(
  query: RunListQuery = {},
  options?: RequestOptions,
): Promise<RunListResponse> {
  return request('GET', withQuery('/me/runs', query), undefined, options);
}

/** `DELETE /runs/:id`: deletes one of the caller's runs (not a verified official one). */
export function deleteRun(id: string, options?: RequestOptions): Promise<void> {
  return request('DELETE', `/runs/${encodeURIComponent(id)}`, undefined, options);
}

/** `GET /leaderboard`: one page of a day's official, verified runs, in the server's order. */
export function getLeaderboard(
  query: LeaderboardQuery = {},
  options?: RequestOptions,
): Promise<LeaderboardResponse> {
  return request('GET', withQuery('/leaderboard', query), undefined, options);
}

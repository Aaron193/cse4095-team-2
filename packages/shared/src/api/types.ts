// The REST API contract (TODO.md, Reference R5), shared by the server and the client.
// Base path /api. JSON in and out. Days are UTC dates "YYYY-MM-DD"; times are ISO 8601 UTC.
import type { Action, RunResult } from '../engine/index.ts';

/** Every error code the API can return. */
export const ERROR_CODES = [
  'VALIDATION',
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'NOT_FOUND',
  'USERNAME_TAKEN',
  'ENGINE_VERSION_MISMATCH',
  'DATE_CLOSED',
  'OFFICIAL_ALREADY_SUBMITTED',
  'CANNOT_DELETE_OFFICIAL',
  'RUN_REJECTED',
  'RATE_LIMITED',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** The body of every error response. */
export interface ApiError {
  error: { code: ErrorCode; message: string; details?: unknown };
}

/** `GET /health`. rngCheck = five values of nextInt(createRng('selfcheck', 'health'), 1000). */
export interface Health {
  ok: true;
  engineVersion: string;
  rngCheck: number[];
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  joinedAt: string;
}

/** The `{ user: User }` body returned by register, login, `GET /me`, and `PATCH /me`. */
export interface UserResponse {
  user: User;
}

export interface RegisterRequest {
  username: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UpdateMeRequest {
  displayName?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface DeleteMeRequest {
  password: string;
}

export interface RunSummary {
  id: string;
  date: string;
  official: boolean;
  verified: boolean;
  rejectReason: string | null;
  /** null when rejected */
  outcome: 'won' | 'lost' | null;
  nodesCleared: number;
  score: number;
  turns: number;
  submittedAt: string;
}

export interface TodayResponse {
  date: string;
  seed: string;
  engineVersion: string;
  /** null when logged out or not yet submitted */
  officialRun: RunSummary | null;
}

export interface SubmitRunRequest {
  date: string;
  official: boolean;
  engineVersion: string;
  actions: Action[];
  /** what the browser computed */
  claimed: RunResult;
}

export interface SubmitRunResponse {
  run: RunSummary;
  /** rank for official runs, otherwise null */
  rank: number | null;
}

/** The `details` of a 422 RUN_REJECTED error. */
export interface RunRejectedDetails {
  runId: string;
  reason: 'ILLEGAL_ACTION' | 'RUN_INCOMPLETE' | 'RESULT_MISMATCH';
  atIndex?: number;
}

export interface RunListResponse {
  runs: RunSummary[];
  total: number;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  outcome: 'won' | 'lost';
  nodesCleared: number;
  score: number;
  turns: number;
  submittedAt: string;
  isMe: boolean;
}

export interface LeaderboardResponse {
  date: string;
  total: number;
  entries: LeaderboardEntry[];
  /** caller's row, even when off this page */
  me: LeaderboardEntry | null;
}

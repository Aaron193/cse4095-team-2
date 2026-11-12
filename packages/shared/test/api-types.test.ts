// Imports every R5 name from the package (task P0-B3). The sample values fail to compile
// (`npm run typecheck`) if a type drifts from TODO.md, Reference R5.
import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION, ERROR_CODES } from '@daily-delve/shared';
import type {
  ApiError,
  DeleteMeRequest,
  ErrorCode,
  Health,
  LeaderboardEntry,
  LeaderboardResponse,
  LoginRequest,
  RegisterRequest,
  RunListResponse,
  RunRejectedDetails,
  RunSummary,
  SubmitRunRequest,
  SubmitRunResponse,
  TodayResponse,
  UpdateMeRequest,
  User,
  UserResponse,
} from '@daily-delve/shared';

const code: ErrorCode = 'RUN_REJECTED';
const rejected: RunRejectedDetails = { runId: 'r1', reason: 'ILLEGAL_ACTION', atIndex: 3 };
const error: ApiError = { error: { code, message: 'Run rejected', details: rejected } };
const health: Health = { ok: true, engineVersion: ENGINE_VERSION, rngCheck: [1, 2, 3, 4, 5] };
const user: User = {
  id: 'u1',
  username: 'tyler',
  displayName: 'Tyler',
  joinedAt: '2026-11-12T00:00:00.000Z',
};
const userResponse: UserResponse = { user };
const register: RegisterRequest[] = [
  { username: 'tyler', password: 'password1' },
  { username: 'tyler', password: 'password1', displayName: 'Tyler' },
];
const login: LoginRequest = { username: 'tyler', password: 'password1' };
const updates: UpdateMeRequest[] = [
  {},
  { displayName: 'T' },
  { currentPassword: 'password1', newPassword: 'password2' },
];
const deleteMe: DeleteMeRequest = { password: 'password1' };
const run: RunSummary = {
  id: 'r1',
  date: '2026-11-12',
  official: true,
  verified: true,
  rejectReason: null,
  outcome: 'won',
  nodesCleared: 8,
  score: 1200,
  turns: 40,
  submittedAt: '2026-11-12T01:00:00.000Z',
};
const rejectedRun: RunSummary = { ...run, verified: false, rejectReason: 'x', outcome: null };
const today: TodayResponse[] = [
  {
    date: '2026-11-12',
    seed: 'a3f9c2d4e5b60718',
    engineVersion: ENGINE_VERSION,
    officialRun: null,
  },
  { date: '2026-11-12', seed: 'a3f9c2d4e5b60718', engineVersion: ENGINE_VERSION, officialRun: run },
];
const submit: SubmitRunRequest = {
  date: '2026-11-12',
  official: true,
  engineVersion: ENGINE_VERSION,
  actions: [{ type: 'move', dir: 'N' }, { type: 'endTurn' }],
  claimed: { outcome: 'lost', nodesCleared: 0, score: 0, turns: 1 },
};
const submitted: SubmitRunResponse[] = [
  { run, rank: 1 },
  { run: { ...run, official: false }, rank: null },
];
const list: RunListResponse = { runs: [run, rejectedRun], total: 2 };
const entry: LeaderboardEntry = {
  rank: 1,
  displayName: 'Tyler',
  outcome: 'won',
  nodesCleared: 8,
  score: 1200,
  turns: 40,
  submittedAt: '2026-11-12T01:00:00.000Z',
  isMe: true,
};
const board: LeaderboardResponse[] = [
  { date: '2026-11-12', total: 1, entries: [entry], me: entry },
  { date: '2026-11-12', total: 0, entries: [], me: null },
];

describe('API contract (R5)', () => {
  it('lists exactly the R5 error codes', () => {
    expect([...ERROR_CODES]).toEqual([
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
    ]);
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });

  it('accepts a sample of every R5 type as plain JSON', () => {
    const samples = {
      error,
      health,
      userResponse,
      register,
      login,
      updates,
      deleteMe,
      today,
      submit,
      submitted,
      list,
      board,
    };
    expect(JSON.parse(JSON.stringify(samples))).toEqual(samples);
  });
});

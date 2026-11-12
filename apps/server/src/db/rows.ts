// Row types and one row-mapping function per table (TODO.md, Reference R6).
// SQLite returns booleans as 0 and 1 and Postgres as true and false, so rows are always
// read through these functions and never used raw.
import type { Action, RunSummary, User } from '@daily-delve/shared';

type DbBoolean = boolean | 0 | 1;

function toBoolean(value: DbBoolean): boolean {
  return value === true || value === 1;
}

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  created_at: string;
}

/** The public view of a user. The password hash never leaves the server. */
export function mapUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    joinedAt: row.created_at,
  };
}

export interface DailyDungeonRow {
  date: string;
  seed: string;
  created_at: string;
}

export interface DailyDungeon {
  date: string;
  seed: string;
  createdAt: string;
}

export function mapDailyDungeon(row: DailyDungeonRow): DailyDungeon {
  return { date: row.date, seed: row.seed, createdAt: row.created_at };
}

export interface RunRow {
  id: string;
  user_id: string;
  date: string;
  official: DbBoolean;
  official_slot: string | null;
  engine_version: string;
  actions: string;
  outcome: 'won' | 'lost' | null;
  nodes_cleared: number;
  score: number;
  turns: number;
  verified: DbBoolean;
  reject_reason: string | null;
  submitted_at: string;
}

/** A stored run: its R5 summary plus the fields only the server uses. */
export interface StoredRun extends RunSummary {
  userId: string;
  officialSlot: string | null;
  engineVersion: string;
  actions: Action[];
}

export function mapRun(row: RunRow): StoredRun {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    official: toBoolean(row.official),
    officialSlot: row.official_slot,
    engineVersion: row.engine_version,
    actions: JSON.parse(row.actions) as Action[],
    verified: toBoolean(row.verified),
    rejectReason: row.reject_reason,
    outcome: row.outcome,
    nodesCleared: row.nodes_cleared,
    score: row.score,
    turns: row.turns,
    submittedAt: row.submitted_at,
  };
}

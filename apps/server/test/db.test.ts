import type { Knex } from 'knex';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rollbackAllMigrations, runMigrations } from '../src/db/knex.ts';
import { mapDailyDungeon, mapRun, mapUser } from '../src/db/rows.ts';
import type { DailyDungeonRow, RunRow, UserRow } from '../src/db/rows.ts';
import { createTestDb } from './helpers.ts';

const NOW = '2026-11-12T12:00:00.000Z';

const user: UserRow = {
  id: '11111111-1111-4111-8111-111111111111',
  username: 'tyler',
  password_hash: '$2a$04$notarealhashnotarealhashnotarealhashnotarealhashnotare',
  display_name: 'Tyler',
  created_at: NOW,
};
const dungeon: DailyDungeonRow = { date: '2026-11-12', seed: 'a3f9c2d4e5b60718', created_at: NOW };

function runRow(overrides: Partial<Record<keyof RunRow, unknown>> = {}): Record<string, unknown> {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    user_id: user.id,
    date: dungeon.date,
    official: true,
    official_slot: `${user.id}:${dungeon.date}`,
    engine_version: '0.1.0',
    actions: JSON.stringify([{ type: 'move', dir: 'N' }, { type: 'endTurn' }]),
    outcome: 'won',
    nodes_cleared: 8,
    score: 1234,
    turns: 41,
    verified: true,
    reject_reason: null,
    submitted_at: NOW,
    ...overrides,
  };
}

let db: Knex;

beforeEach(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await db.destroy();
});

describe('001_init migration', () => {
  it('creates the R6 tables', async () => {
    for (const table of ['users', 'daily_dungeons', 'runs']) {
      expect(await db.schema.hasTable(table), table).toBe(true);
    }
  });

  it('is safe to run again on startup', async () => {
    await runMigrations(db);
    await runMigrations(db);
    expect(await db.schema.hasTable('runs')).toBe(true);
  });

  it('can be rolled back and re-applied', async () => {
    await rollbackAllMigrations(db);
    expect(await db.schema.hasTable('users')).toBe(false);
    await runMigrations(db);
    expect(await db.schema.hasTable('users')).toBe(true);
  });
});

describe('one row per table', () => {
  it('writes and reads a user', async () => {
    await db('users').insert(user);
    const row = await db<UserRow>('users').where({ id: user.id }).first();
    expect(row).toEqual(user);
    expect(mapUser(row!)).toEqual({
      id: user.id,
      username: 'tyler',
      displayName: 'Tyler',
      joinedAt: NOW,
    });
    expect(JSON.stringify(mapUser(row!))).not.toContain('hash');
  });

  it('writes and reads a daily dungeon', async () => {
    await db('daily_dungeons').insert(dungeon);
    const row = await db<DailyDungeonRow>('daily_dungeons').where({ date: dungeon.date }).first();
    expect(mapDailyDungeon(row!)).toEqual({
      date: '2026-11-12',
      seed: 'a3f9c2d4e5b60718',
      createdAt: NOW,
    });
  });

  it('writes and reads a run, with real booleans and parsed actions', async () => {
    await db('users').insert(user);
    await db('daily_dungeons').insert(dungeon);
    await db('runs').insert(runRow());

    const row = await db<RunRow>('runs').first();
    expect(mapRun(row!)).toEqual({
      id: '22222222-2222-4222-8222-222222222222',
      userId: user.id,
      date: '2026-11-12',
      official: true,
      officialSlot: `${user.id}:2026-11-12`,
      engineVersion: '0.1.0',
      actions: [{ type: 'move', dir: 'N' }, { type: 'endTurn' }],
      verified: true,
      rejectReason: null,
      outcome: 'won',
      nodesCleared: 8,
      score: 1234,
      turns: 41,
      submittedAt: NOW,
    });
  });

  it('applies the R6 defaults to a newly submitted run', async () => {
    await db('users').insert(user);
    await db('daily_dungeons').insert(dungeon);
    await db('runs').insert({
      id: 'r-defaults',
      user_id: user.id,
      date: dungeon.date,
      official: false,
      engine_version: '0.1.0',
      actions: '[]',
      submitted_at: NOW,
    });

    const run = mapRun((await db<RunRow>('runs').where({ id: 'r-defaults' }).first())!);
    expect(run).toMatchObject({
      official: false,
      officialSlot: null,
      verified: false,
      outcome: null,
      rejectReason: null,
      nodesCleared: 0,
      score: 0,
      turns: 0,
    });
  });
});

describe('constraints', () => {
  beforeEach(async () => {
    await db('users').insert(user);
    await db('daily_dungeons').insert(dungeon);
  });

  it('refuses a run with an unknown user_id', async () => {
    await expect(db('runs').insert(runRow({ user_id: 'no-such-user' }))).rejects.toThrow();
    expect(await db('runs')).toEqual([]);
  });

  it('refuses a run for a date with no dungeon', async () => {
    await expect(db('runs').insert(runRow({ date: '1999-01-01' }))).rejects.toThrow();
  });

  it('refuses a second username', async () => {
    await expect(db('users').insert({ ...user, id: 'other-id' })).rejects.toThrow();
  });

  it('refuses a second run in the same official slot, but allows many empty slots', async () => {
    await db('runs').insert(runRow());
    await expect(db('runs').insert(runRow({ id: 'r2' }))).rejects.toThrow();

    await db('runs').insert(runRow({ id: 'r3', official: false, official_slot: null }));
    await db('runs').insert(runRow({ id: 'r4', official: false, official_slot: null }));
    expect(await db('runs')).toHaveLength(3);
  });

  it("deletes a user's runs with the user", async () => {
    await db('runs').insert(runRow());
    await db('users').where({ id: user.id }).delete();
    expect(await db('runs')).toEqual([]);
  });
});

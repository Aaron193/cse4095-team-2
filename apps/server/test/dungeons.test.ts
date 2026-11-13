// Task P1-B6: getOrCreateDungeon and GET /api/dungeons/today (TODO.md, Reference R5).
import type { Express } from 'express';
import type { Knex } from 'knex';
import { ENGINE_VERSION } from '@daily-delve/shared';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AppContext } from '../src/context.ts';
import type { DailyDungeonRow } from '../src/db/rows.ts';
import { dailySeed, getOrCreateDungeon, utcDate } from '../src/services/dungeons.ts';
import {
  createTestApp,
  createTestDb,
  DAY_MS,
  FIXED_NOW,
  fixedNow,
  registerUser,
  testClock,
  testConfig,
} from './helpers.ts';

// HMAC-SHA256 of each date keyed by testConfig.seedSecret ('test-seed-secret'), first 16 hex.
const SEED_2026_11_12 = '1022402c6298c71a';
const SEED_2026_11_13 = '1043d1a6789bd96c';

let db: Knex;
let app: Express;

beforeEach(async () => {
  db = await createTestDb();
  app = createTestApp(db);
});

afterEach(async () => {
  await db.destroy();
});

function getToday(to: Express = app) {
  return request(to).get('/api/dungeons/today');
}

async function dungeonRows(): Promise<DailyDungeonRow[]> {
  return db<DailyDungeonRow>('daily_dungeons').select('*').orderBy('date');
}

describe('dailySeed', () => {
  it('is the first 16 hex characters of HMAC-SHA256 of the date, keyed by the secret', () => {
    expect(dailySeed('2026-11-12', testConfig.seedSecret)).toBe(SEED_2026_11_12);
    expect(dailySeed('2026-11-13', testConfig.seedSecret)).toBe(SEED_2026_11_13);
  });

  it('depends on the secret', () => {
    expect(dailySeed('2026-11-12', 'another-secret')).toMatch(/^[0-9a-f]{16}$/);
    expect(dailySeed('2026-11-12', 'another-secret')).not.toBe(SEED_2026_11_12);
  });
});

describe('utcDate', () => {
  it('is the UTC day of the moment', () => {
    expect(utcDate(new Date('2026-11-12T00:00:00.000Z'))).toBe('2026-11-12');
    expect(utcDate(new Date('2026-11-12T23:59:59.999Z'))).toBe('2026-11-12');
    // 8 pm Eastern on Nov 12 is already Nov 13 in UTC.
    expect(utcDate(new Date('2026-11-12T20:00:00-05:00'))).toBe('2026-11-13');
  });
});

describe('GET /api/dungeons/today', () => {
  it('answers 200 with the date from the injected clock, its seed, and the engine version', async () => {
    const res = await getToday();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      date: '2026-11-12',
      seed: SEED_2026_11_12,
      engineVersion: ENGINE_VERSION,
      officialRun: null,
    });
  });

  it('needs no login, and gives a logged-in player the same answer', async () => {
    const { cookie } = await registerUser(app);
    const loggedIn = await getToday().set('Cookie', cookie);
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body).toEqual((await getToday()).body);
  });

  it('returns the same seed to every call on one day, from one stored row', async () => {
    const first = await getToday();
    const second = await getToday();
    expect(second.body).toEqual(first.body);
    expect(await dungeonRows()).toEqual([
      { date: '2026-11-12', seed: SEED_2026_11_12, created_at: FIXED_NOW.toISOString() },
    ]);
  });

  it('returns a new date and seed when the clock moves on a day', async () => {
    const clock = testClock();
    const app = createTestApp(db, { now: clock.now });
    const today = await getToday(app);
    clock.advance(DAY_MS);
    const tomorrow = await getToday(app);

    expect(today.body).toMatchObject({ date: '2026-11-12', seed: SEED_2026_11_12 });
    expect(tomorrow.body).toMatchObject({ date: '2026-11-13', seed: SEED_2026_11_13 });
    expect((await dungeonRows()).map((row) => row.date)).toEqual(['2026-11-12', '2026-11-13']);
  });

  it('changes day at midnight UTC', async () => {
    const clock = testClock(new Date('2026-11-12T23:59:59.999Z'));
    const app = createTestApp(db, { now: clock.now });
    expect((await getToday(app)).body.date).toBe('2026-11-12');
    clock.advance(1);
    expect((await getToday(app)).body.date).toBe('2026-11-13');
  });

  it('creates exactly one row when the first requests of a day arrive together', async () => {
    const responses = await Promise.all(Array.from({ length: 10 }, () => getToday()));
    expect(responses.map((res) => res.status)).toEqual(Array(10).fill(200));
    expect(new Set(responses.map((res) => res.body.seed))).toEqual(new Set([SEED_2026_11_12]));
    expect(await dungeonRows()).toHaveLength(1);
  });

  it('keeps a stored seed even if SEED_SECRET changes later', async () => {
    const before = await getToday();
    const rotated = createTestApp(db, { config: { seedSecret: 'rotated-secret' } });
    expect((await getToday(rotated)).body.seed).toBe(before.body.seed);
  });
});

describe('getOrCreateDungeon', () => {
  const ctx = (): AppContext => ({ db, now: fixedNow, config: testConfig });

  it('creates the dungeon on first use and returns the stored one after', async () => {
    const created = await getOrCreateDungeon(ctx(), '2026-11-13');
    expect(created).toEqual({
      date: '2026-11-13',
      seed: SEED_2026_11_13,
      createdAt: FIXED_NOW.toISOString(),
    });
    expect(await getOrCreateDungeon(ctx(), '2026-11-13')).toEqual(created);
  });

  it('creates exactly one row when called many times at once', async () => {
    const dungeons = await Promise.all(
      Array.from({ length: 10 }, () => getOrCreateDungeon(ctx(), '2026-11-12')),
    );
    expect(new Set(dungeons.map((dungeon) => dungeon.seed))).toEqual(new Set([SEED_2026_11_12]));
    expect(await dungeonRows()).toHaveLength(1);
  });
});

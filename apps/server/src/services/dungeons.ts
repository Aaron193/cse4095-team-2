// The daily dungeon (task P1-B6; TODO.md, Reference R5 and R6). Everyone plays the same
// dungeon on the same UTC day. Its seed is made once, from the date and SEED_SECRET, and is
// read from the daily_dungeons table from then on: the stored seed is the day's seed.
import { createHmac } from 'node:crypto';
import type { Knex } from 'knex';
import type { AppContext } from '../context.ts';
import { mapDailyDungeon } from '../db/rows.ts';
import type { DailyDungeon, DailyDungeonRow } from '../db/rows.ts';

/** The UTC day of `at` as "YYYY-MM-DD" (R5: days are UTC dates). */
export function utcDate(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/** The first 16 hex characters of HMAC-SHA256 of the date, keyed by the seed secret. */
export function dailySeed(date: string, seedSecret: string): string {
  return createHmac('sha256', seedSecret).update(date).digest('hex').slice(0, 16);
}

async function findDungeon(db: Knex, date: string): Promise<DailyDungeon | null> {
  const row = await db<DailyDungeonRow>('daily_dungeons').where({ date }).first();
  return row ? mapDailyDungeon(row) : null;
}

/**
 * The dungeon for `date` ("YYYY-MM-DD"), created by the first request for it. Safe when the
 * first requests of a day arrive together: each inserts with ON CONFLICT DO NOTHING, one
 * row wins, and every request then reads that row.
 */
export async function getOrCreateDungeon(
  { db, now, config }: AppContext,
  date: string,
): Promise<DailyDungeon> {
  const existing = await findDungeon(db, date);
  if (existing) return existing;

  const row: DailyDungeonRow = {
    date,
    seed: dailySeed(date, config.seedSecret),
    created_at: now().toISOString(),
  };
  await db('daily_dungeons').insert(row).onConflict('date').ignore();

  const created = await findDungeon(db, date);
  if (!created) throw new Error(`daily_dungeons has no row for ${date} after inserting it`);
  return created;
}

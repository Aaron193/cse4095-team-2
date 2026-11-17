// The session store (task P1-B1): express-session's Store kept in the `sessions` table
// (migration 002_sessions), so a login survives a server restart, on SQLite and Postgres.
//
// Expiry is decided by the injected clock. Expired rows are pruned whenever a session is
// saved, never by a timer, so the store holds nothing open that would keep a process alive.
import session from 'express-session';
import type { SessionData } from 'express-session';
import type { Knex } from 'knex';

interface SessionRow {
  sid: string;
  sess: string;
  user_id: string | null;
  expires_at: string;
}

export interface KnexSessionStoreOptions {
  db: Knex;
  now: () => Date;
  /** How long a session lasts after it was last saved or touched: the cookie's maxAge. */
  ttlMs: number;
}

/** Runs `work` and reports its outcome to a Node-style callback, exactly once. */
function settle<T>(work: PromiseLike<T>, callback?: (err: unknown, value?: T) => void): void {
  work.then(
    (value) => callback?.(null, value),
    (err: unknown) => callback?.(err),
  );
}

export class KnexSessionStore extends session.Store {
  private readonly db: Knex;
  private readonly now: () => Date;
  private readonly ttlMs: number;

  constructor(options: KnexSessionStoreOptions) {
    super();
    this.db = options.db;
    this.now = options.now;
    this.ttlMs = options.ttlMs;
  }

  /** The session, or null when there is none or it has expired. */
  override get(sid: string, callback: (err: unknown, session?: SessionData | null) => void): void {
    settle(this.read(sid), callback);
  }

  override set(sid: string, sess: SessionData, callback?: (err?: unknown) => void): void {
    settle(this.write(sid, sess), callback);
  }

  override destroy(sid: string, callback?: (err?: unknown) => void): void {
    settle(this.db('sessions').where({ sid }).delete(), callback);
  }

  /** Called by express-session after each request that did not change the session. */
  override touch(sid: string, _sess: SessionData, callback?: (err?: unknown) => void): void {
    const expiresAt = this.expiresAt(this.now());
    settle(this.db('sessions').where({ sid }).update({ expires_at: expiresAt }), callback);
  }

  private async read(sid: string): Promise<SessionData | null> {
    const row = await this.db<SessionRow>('sessions')
      .where({ sid })
      .andWhere('expires_at', '>', this.now().toISOString())
      .first();
    return row ? (JSON.parse(row.sess) as SessionData) : null;
  }

  private async write(sid: string, sess: SessionData): Promise<void> {
    const now = this.now();
    await this.db('sessions').where('expires_at', '<=', now.toISOString()).delete();

    const { userId } = sess as Partial<SessionData>;
    const row: SessionRow = {
      sid,
      sess: JSON.stringify(sess),
      user_id: typeof userId === 'string' ? userId : null,
      expires_at: this.expiresAt(now),
    };
    await this.db('sessions')
      .insert(row)
      .onConflict('sid')
      .merge(['sess', 'user_id', 'expires_at']);
  }

  private expiresAt(now: Date): string {
    return new Date(now.getTime() + this.ttlMs).toISOString();
  }
}

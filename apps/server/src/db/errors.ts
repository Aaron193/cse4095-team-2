// Database errors that routes turn into API errors, recognized the same way on SQLite and
// Postgres (TODO.md, Reference R6).

/**
 * True when a write broke a unique or primary-key constraint: Postgres code 23505, or
 * better-sqlite3's SQLITE_CONSTRAINT_UNIQUE and SQLITE_CONSTRAINT_PRIMARYKEY.
 */
export function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const { code } = err as { code?: unknown };
  return (
    code === '23505' ||
    code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
  );
}

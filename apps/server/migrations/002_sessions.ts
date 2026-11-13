// The sessions table (task P1-B1). TODO.md, Reference R6 leaves it to the session store,
// src/db/sessionStore.ts, which is the only code that reads or writes it. Runs on SQLite
// and Postgres. Times are ISO 8601 UTC strings, like every other table.
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sessions', (table) => {
    table.text('sid').primary(); // the session ID inside the signed dd.sid cookie
    table.text('sess').notNullable(); // the session data as JSON
    // The logged-in user, copied out of `sess` so a user's sessions can be found
    // without parsing JSON (changing a password or deleting an account ends them).
    table.text('user_id').nullable();
    table.text('expires_at').notNullable();

    table.index(['expires_at']);
    table.index(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sessions');
}

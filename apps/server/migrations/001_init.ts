// The first migration: the tables in TODO.md, Reference R6. Runs on SQLite and Postgres.
// IDs are UUID strings made in application code. Times are ISO 8601 UTC strings.
// The `sessions` table is created and managed by the session store (task P1-B1).
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.text('id').primary();
    table.text('username').notNullable().unique(); // stored lowercase
    table.text('password_hash').notNullable(); // bcrypt
    table.text('display_name').notNullable();
    table.text('created_at').notNullable(); // join date
  });

  await knex.schema.createTable('daily_dungeons', (table) => {
    table.text('date').primary(); // YYYY-MM-DD
    table.text('seed').notNullable();
    table.text('created_at').notNullable();
  });

  await knex.schema.createTable('runs', (table) => {
    table.text('id').primary();
    table.text('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('date').notNullable().references('date').inTable('daily_dungeons');
    table.boolean('official').notNullable();
    // "<userId>:<date>" for a verified official run, otherwise null.
    // Its uniqueness is what enforces one official run a day.
    table.text('official_slot').nullable().unique();
    table.text('engine_version').notNullable();
    table.text('actions').notNullable(); // JSON array of actions
    table.text('outcome').nullable(); // 'won', 'lost', or null
    table.integer('nodes_cleared').notNullable().defaultTo(0); // server-computed
    table.integer('score').notNullable().defaultTo(0); // server-computed
    table.integer('turns').notNullable().defaultTo(0); // server-computed
    table.boolean('verified').notNullable().defaultTo(false);
    table.text('reject_reason').nullable();
    table.text('submitted_at').notNullable();

    table.index(['date', 'official', 'verified']);
    table.index(['user_id', 'submitted_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('runs');
  await knex.schema.dropTableIfExists('daily_dungeons');
  await knex.schema.dropTableIfExists('users');
}

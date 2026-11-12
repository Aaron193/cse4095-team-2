// Every migration, in the order it runs. Add new ones to the end; never edit or reorder
// one that has been merged.
//
// Migrations are listed in code instead of being discovered on disk, so they load the same
// way under tsx, under Vitest, and in production, with no dependence on the working directory.
import type { Knex } from 'knex';
import * as init from './001_init.ts';

export interface Migration {
  name: string;
  up: (knex: Knex) => Promise<void>;
  down: (knex: Knex) => Promise<void>;
}

export const MIGRATIONS: Migration[] = [{ name: '001_init', up: init.up, down: init.down }];

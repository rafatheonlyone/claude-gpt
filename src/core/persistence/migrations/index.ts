import type { Migration } from '../types';
import { migration001 } from './001_initial_schema';

/**
 * All migrations, in order.
 *
 * Append only. Never edit a released migration — add a new one. See the
 * checksum note in `../types.ts` for why.
 */
export const MIGRATIONS: readonly Migration[] = [migration001];

/** The schema version this build of the application expects. */
export const TARGET_SCHEMA_VERSION = MIGRATIONS.reduce(
  (max, migration) => Math.max(max, migration.version),
  0,
);

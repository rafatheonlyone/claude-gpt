import type { StorageAdapter } from '../platform/storage';
import type { ClockAdapter } from '../platform/clock';
import { type Migration, type AppliedMigration, MigrationError, checksum } from './types';
import { MIGRATIONS, TARGET_SCHEMA_VERSION } from './migrations';

const NAME_PATTERN = /^[a-z0-9_]+$/;

/**
 * Quote an application-authored identifier for inline use in DDL.
 *
 * Migration names and checksums are compile-time constants, never user input,
 * but the pattern check makes that guarantee enforced rather than assumed — so
 * a future edit cannot quietly introduce an injection point here.
 */
function literal(value: string): string {
  if (!NAME_PATTERN.test(value)) {
    throw new MigrationError(`unsafe migration identifier: ${value}`, -1);
  }
  return `'${value}'`;
}

export interface MigrationReport {
  readonly from: number;
  readonly to: number;
  readonly applied: readonly number[];
}

export class Migrator {
  constructor(
    private readonly storage: StorageAdapter,
    private readonly clock: ClockAdapter,
    private readonly migrations: readonly Migration[] = MIGRATIONS,
  ) {}

  private async ensureTable(): Promise<void> {
    await this.storage.executeBatch(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     INTEGER PRIMARY KEY,
        name        TEXT NOT NULL,
        checksum    TEXT NOT NULL,
        applied_at  TEXT NOT NULL
      );
    `);
  }

  async applied(): Promise<AppliedMigration[]> {
    await this.ensureTable();
    const rows = await this.storage.query(
      'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version',
    );
    return rows.map((row) => ({
      version: Number(row['version']),
      name: String(row['name']),
      checksum: String(row['checksum']),
      appliedAt: String(row['applied_at']),
    }));
  }

  async currentVersion(): Promise<number> {
    const applied = await this.applied();
    return applied.reduce((max, m) => Math.max(max, m.version), 0);
  }

  /**
   * Apply every pending migration.
   *
   * Refuses to proceed on a checksum mismatch or on a database written by a
   * newer build. Both cases mean this process cannot reason correctly about
   * what is on disk, and continuing would risk damaging irreplaceable data.
   * Failing loudly is the safe outcome.
   */
  async migrate(): Promise<MigrationReport> {
    const applied = await this.applied();
    const appliedByVersion = new Map(applied.map((m) => [m.version, m]));
    const from = applied.reduce((max, m) => Math.max(max, m.version), 0);

    if (from > TARGET_SCHEMA_VERSION) {
      throw new MigrationError(
        `Database schema version ${from} is newer than this build supports ` +
          `(${TARGET_SCHEMA_VERSION}). Update SYSTEM rather than continuing, ` +
          `which would risk damaging data written by the newer version.`,
        from,
      );
    }

    for (const migration of this.migrations) {
      const previous = appliedByVersion.get(migration.version);
      if (!previous) continue;
      const expected = checksum(migration.up);
      if (previous.checksum !== expected) {
        throw new MigrationError(
          `Migration ${migration.version} (${migration.name}) has changed since it was ` +
            `applied. A released migration must never be edited — add a new one instead.`,
          migration.version,
        );
      }
    }

    const pending = this.migrations
      .filter((m) => !appliedByVersion.has(m.version))
      .sort((a, b) => a.version - b.version);

    const appliedNow: number[] = [];

    for (const migration of pending) {
      const sum = checksum(migration.up);
      const now = this.clock.now().toISOString();

      // SQLite applies DDL transactionally, so a failure part-way through
      // leaves the schema untouched rather than half-migrated.
      const script = [
        'BEGIN;',
        migration.up,
        `INSERT INTO schema_migrations (version, name, checksum, applied_at)
           VALUES (${migration.version}, ${literal(migration.name)}, ${literal(sum)}, '${now}');`,
        'COMMIT;',
      ].join('\n');

      try {
        await this.storage.executeBatch(script);
      } catch (error) {
        await this.storage.executeBatch('ROLLBACK;').catch(() => undefined);
        throw new MigrationError(
          `Migration ${migration.version} (${migration.name}) failed and was rolled back: ` +
            `${error instanceof Error ? error.message : String(error)}`,
          migration.version,
        );
      }

      appliedNow.push(migration.version);
    }

    return { from, to: await this.currentVersion(), applied: appliedNow };
  }
}

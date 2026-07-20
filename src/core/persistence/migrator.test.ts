import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NodeSqliteAdapter } from '../../platform/test/sqlite-adapter';
import { FixedClock } from '../platform/clock';
import { Migrator } from './migrator';
import { MigrationError, checksum } from './types';
import type { Migration } from './types';
import { MIGRATIONS, TARGET_SCHEMA_VERSION } from './migrations';

let storage: NodeSqliteAdapter;
let clock: FixedClock;

beforeEach(() => {
  storage = new NodeSqliteAdapter(':memory:');
  clock = new FixedClock(new Date('2026-07-19T12:00:00Z'));
});

afterEach(async () => {
  await storage.close();
});

describe('Migrator', () => {
  it('starts an empty database at version 0', async () => {
    const migrator = new Migrator(storage, clock);
    expect(await migrator.currentVersion()).toBe(0);
  });

  it('applies every migration and reaches the target version', async () => {
    const migrator = new Migrator(storage, clock);
    const report = await migrator.migrate();

    expect(report.from).toBe(0);
    expect(report.to).toBe(TARGET_SCHEMA_VERSION);
    expect(report.applied).toEqual(MIGRATIONS.map((m) => m.version));
  });

  it('is idempotent — running twice applies nothing the second time', async () => {
    const migrator = new Migrator(storage, clock);
    await migrator.migrate();
    const second = await migrator.migrate();

    expect(second.applied).toEqual([]);
    expect(second.to).toBe(TARGET_SCHEMA_VERSION);
  });

  it('creates the tables the application depends on', async () => {
    await new Migrator(storage, clock).migrate();

    const rows = await storage.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    const tables = rows.map((r) => String(r['name']));

    for (const expected of [
      'users',
      'profiles',
      'preferences',
      'onboarding_state',
      'events',
      'profile_state',
      'domain_state',
      'domain_daily_xp',
      'skills',
      'skill_state',
      'attributes',
      'attribute_state',
      'quests',
      'quest_steps',
      'achievements',
      'achievement_unlocks',
      'evidence',
      'audit_log',
      'integrity_flags',
    ]) {
      expect(tables).toContain(expected);
    }
  });

  it('enforces foreign keys, so orphaned rows cannot be written', async () => {
    await new Migrator(storage, clock).migrate();

    await expect(
      storage.execute(
        `INSERT INTO profiles (user_id, display_name, timezone, locale, created_at, updated_at)
         VALUES ('does-not-exist', 'Ghost', 'UTC', 'en', '2026-07-19', '2026-07-19')`,
      ),
    ).rejects.toThrow();
  });

  it('refuses to run when a released migration has been edited', async () => {
    await new Migrator(storage, clock).migrate();

    // Simulate an edited migration by corrupting the stored checksum.
    await storage.execute('UPDATE schema_migrations SET checksum = ? WHERE version = 1', [
      'tampered',
    ]);

    await expect(new Migrator(storage, clock).migrate()).rejects.toThrow(MigrationError);
  });

  it('refuses to run against a database from a newer build', async () => {
    await new Migrator(storage, clock).migrate();
    await storage.execute(
      `INSERT INTO schema_migrations (version, name, checksum, applied_at)
       VALUES (?, 'from_the_future', 'x', ?)`,
      [TARGET_SCHEMA_VERSION + 5, clock.now().toISOString()],
    );

    // Continuing here could damage data written by a newer version, so the
    // only safe behaviour is to stop.
    await expect(new Migrator(storage, clock).migrate()).rejects.toThrow(/newer than this build/);
  });

  it('rolls back completely when a migration fails', async () => {
    const broken: Migration = {
      version: 99,
      name: 'broken_migration',
      up: `
        CREATE TABLE should_not_survive (id TEXT PRIMARY KEY);
        THIS IS NOT VALID SQL;
      `,
      down: 'DROP TABLE IF EXISTS should_not_survive;',
    };

    const migrator = new Migrator(storage, clock, [broken]);
    await expect(migrator.migrate()).rejects.toThrow(MigrationError);

    // The first statement must not have survived the failure of the second.
    const rows = await storage.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'should_not_survive'",
    );
    expect(rows).toHaveLength(0);
    expect(await migrator.currentVersion()).toBe(0);
  });

  it('records what was applied and when', async () => {
    await new Migrator(storage, clock).migrate();
    const applied = await new Migrator(storage, clock).applied();

    expect(applied).toHaveLength(MIGRATIONS.length);
    expect(applied[0]?.name).toBe('initial_schema');
    expect(applied[0]?.appliedAt).toBe('2026-07-19T12:00:00.000Z');
  });

  it('reports a healthy database after migrating', async () => {
    await new Migrator(storage, clock).migrate();
    expect(await storage.integrityCheck()).toBe('ok');
  });
});

describe('checksum', () => {
  it('is stable across insignificant whitespace changes', () => {
    expect(checksum('CREATE  TABLE a (id TEXT);')).toBe(checksum('CREATE TABLE a (id TEXT);'));
  });

  it('changes when the SQL meaningfully changes', () => {
    expect(checksum('CREATE TABLE a (id TEXT);')).not.toBe(checksum('CREATE TABLE b (id TEXT);'));
  });
});

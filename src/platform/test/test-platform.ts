import type {
  Platform,
  NotificationAdapter,
  NotificationRequest,
  SecretAdapter,
  PlatformInfo,
  AppPaths,
} from '../../core/platform';
import { FixedClock } from '../../core/platform/clock';
import { NodeSqliteAdapter } from './sqlite-adapter';

export class RecordingNotifications implements NotificationAdapter {
  readonly sent: NotificationRequest[] = [];
  private permitted = true;

  async isPermitted(): Promise<boolean> {
    return this.permitted;
  }

  async requestPermission(): Promise<boolean> {
    this.permitted = true;
    return true;
  }

  async notify(request: NotificationRequest): Promise<void> {
    this.sent.push(request);
  }
}

export class InMemorySecrets implements SecretAdapter {
  private readonly store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class TestPlatformInfo implements PlatformInfo {
  async paths(): Promise<AppPaths> {
    return { dataDir: ':memory:', backupDir: ':memory:', database: ':memory:' };
  }

  async ready(): Promise<void> {
    // No window to reveal in tests.
  }
}

export interface TestPlatform extends Platform {
  readonly storage: NodeSqliteAdapter;
  readonly clock: FixedClock;
  readonly notifications: RecordingNotifications;
}

/**
 * A complete platform backed by real SQLite and a controllable clock.
 *
 * Passing a shared `storage` lets a test simulate an application restart:
 * construct a new service over the same database and assert that state was
 * genuinely persisted rather than merely held in memory.
 */
export function createTestPlatform(
  options: {
    storage?: NodeSqliteAdapter;
    now?: Date;
    timezone?: string;
  } = {},
): TestPlatform {
  return {
    storage: options.storage ?? new NodeSqliteAdapter(':memory:'),
    clock: new FixedClock(
      options.now ?? new Date('2026-07-19T12:00:00Z'),
      options.timezone ?? 'UTC',
    ),
    notifications: new RecordingNotifications(),
    secrets: new InMemorySecrets(),
    info: new TestPlatformInfo(),
  };
}

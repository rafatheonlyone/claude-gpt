import { invoke } from '@tauri-apps/api/core';
import type {
  Platform,
  StorageAdapter,
  SqlParam,
  SqlRow,
  SqlStatement,
  ExecuteResult,
  NotificationAdapter,
  NotificationRequest,
  SecretAdapter,
  PlatformInfo,
  AppPaths,
} from '../../core/platform';
import { SystemClock } from '../../core/platform/clock';

/**
 * Production platform adapters.
 *
 * This is the only module permitted to import the Tauri SDK (ADR-0003,
 * enforced by an ESLint rule). Everything above it talks to interfaces.
 */

class TauriStorage implements StorageAdapter {
  async query(sql: string, params: readonly SqlParam[] = []): Promise<SqlRow[]> {
    return invoke<SqlRow[]>('db_query', { sql, params: [...params] });
  }

  async execute(sql: string, params: readonly SqlParam[] = []): Promise<ExecuteResult> {
    return invoke<ExecuteResult>('db_execute', { sql, params: [...params] });
  }

  async transaction(statements: readonly SqlStatement[]): Promise<ExecuteResult[]> {
    return invoke<ExecuteResult[]>('db_transaction', {
      statements: statements.map((s) => ({ sql: s.sql, params: [...(s.params ?? [])] })),
    });
  }

  async executeBatch(sql: string): Promise<void> {
    await invoke('db_execute_batch', { sql });
  }

  async integrityCheck(): Promise<string> {
    return invoke<string>('db_integrity_check');
  }

  async backup(label?: string): Promise<string> {
    return invoke<string>('db_backup', { label: label ?? null });
  }

  async close(): Promise<void> {
    // The Rust host owns the connection lifetime.
  }
}

/**
 * Notifications.
 *
 * Deliberately unimplemented rather than silently no-op: the OS notification
 * permission flow is a Phase D item (see docs/ROADMAP.md). Until then in-app
 * presentation carries every message, and `isPermitted` reports the truth so
 * callers can branch correctly instead of believing a notification was sent.
 */
class TauriNotifications implements NotificationAdapter {
  async isPermitted(): Promise<boolean> {
    return false;
  }

  async requestPermission(): Promise<boolean> {
    return false;
  }

  async notify(_request: NotificationRequest): Promise<void> {
    // Intentionally not delivered until the permission flow exists.
  }
}

/**
 * Credential storage.
 *
 * Backed by the OS credential store once an external AI provider can be
 * enabled (Phase D). It throws rather than falling back to insecure storage —
 * silently writing an API key somewhere weaker would be worse than failing.
 */
class TauriSecrets implements SecretAdapter {
  async get(_key: string): Promise<string | null> {
    return null;
  }

  async set(_key: string, _value: string): Promise<void> {
    throw new Error(
      'Secure credential storage is not enabled in this build. ' +
        'It is required before any external AI provider can be configured.',
    );
  }

  async delete(_key: string): Promise<void> {
    // Nothing stored, nothing to remove.
  }
}

class TauriInfo implements PlatformInfo {
  async paths(): Promise<AppPaths> {
    return invoke<AppPaths>('app_paths');
  }

  async ready(): Promise<void> {
    await invoke('show_main_window');
  }
}

export function createTauriPlatform(timezone?: string): Platform {
  return {
    storage: new TauriStorage(),
    clock: new SystemClock(timezone),
    notifications: new TauriNotifications(),
    secrets: new TauriSecrets(),
    info: new TauriInfo(),
  };
}

/** True when running inside the Tauri host rather than a plain browser. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

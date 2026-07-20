/**
 * Platform ports (ADR-0003).
 *
 * Interfaces only — never implementations. Implementations live in
 * `src/platform/tauri` (production), `src/platform/test` (tests) and
 * `src/platform/web` (browser dev server).
 */

import type { StorageAdapter } from './storage';
import type { ClockAdapter } from './clock';

export type { StorageAdapter, SqlParam, SqlRow, SqlStatement, ExecuteResult } from './storage';

export type { ClockAdapter } from './clock';
export { SystemClock, FixedClock, toLocalDateString, daysBetween, addDays } from './clock';

/** Severity of a delivered notification. Maps to presentation, not to urgency theatre. */
export type NotificationLevel = 'info' | 'achievement' | 'advisory';

export interface NotificationRequest {
  readonly title: string;
  readonly body: string;
  readonly level: NotificationLevel;
}

export interface NotificationAdapter {
  /** Whether the user has granted OS notification permission. */
  isPermitted(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  notify(request: NotificationRequest): Promise<void>;
}

/**
 * Secure credential storage, backed by the OS credential store.
 *
 * API keys never touch SQLite, config files, or logs. Not required until an
 * external AI provider is enabled, which is off by default.
 */
export interface SecretAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface AppPaths {
  readonly dataDir: string;
  readonly backupDir: string;
  readonly database: string;
}

export interface PlatformInfo {
  paths(): Promise<AppPaths>;
  /** Reveal the main window once the first frame is ready. */
  ready(): Promise<void>;
}

/** Everything the core needs from the outside world, in one bundle. */
export interface Platform {
  readonly storage: StorageAdapter;
  readonly clock: ClockAdapter;
  readonly notifications: NotificationAdapter;
  readonly secrets: SecretAdapter;
  readonly info: PlatformInfo;
}

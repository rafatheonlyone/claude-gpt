/**
 * Storage port (ADR-0003).
 *
 * The core never knows whether it is talking to Tauri/rusqlite or to
 * `node:sqlite` in a test. Both satisfy this interface, so the migrations and
 * repositories exercised by the test suite are byte-for-byte the ones that run
 * in production.
 */

/** Values that may be bound as SQL parameters. */
export type SqlParam = string | number | boolean | null;

/** A raw row as returned by the driver, before schema validation. */
export type SqlRow = Record<string, unknown>;

export interface SqlStatement {
  readonly sql: string;
  readonly params?: readonly SqlParam[];
}

export interface ExecuteResult {
  readonly changes: number;
  readonly lastInsertRowid: number;
}

export interface StorageAdapter {
  /**
   * Run a read query.
   *
   * `sql` must always be an application-authored constant. User input,
   * imported files and AI responses belong in `params` and nowhere else.
   */
  query(sql: string, params?: readonly SqlParam[]): Promise<SqlRow[]>;

  /** Run a single write statement. */
  execute(sql: string, params?: readonly SqlParam[]): Promise<ExecuteResult>;

  /**
   * Run several statements atomically. Any write that would otherwise leave the
   * event log and its projections disagreeing must go through here.
   */
  transaction(statements: readonly SqlStatement[]): Promise<ExecuteResult[]>;

  /** Run a multi-statement script (schema DDL, VACUUM). Not parameterised. */
  executeBatch(sql: string): Promise<void>;

  /** `PRAGMA integrity_check`. Returns `"ok"` on a healthy database. */
  integrityCheck(): Promise<string>;

  /** Snapshot the database to a timestamped file. Returns the path written. */
  backup(label?: string): Promise<string>;

  /** Release resources. Safe to call more than once. */
  close(): Promise<void>;
}

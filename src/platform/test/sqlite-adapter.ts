import { DatabaseSync } from 'node:sqlite';
import type {
  StorageAdapter,
  SqlParam,
  SqlRow,
  SqlStatement,
  ExecuteResult,
} from '../../core/platform/storage';

/**
 * `StorageAdapter` backed by Node's built-in SQLite.
 *
 * This exists so migrations and repositories are tested against a real SQLite
 * engine rather than a mock. The alternative — mocking the database — would
 * verify that our code calls the functions we expect while proving nothing
 * about whether the SQL is correct, which is precisely where the risk lives.
 *
 * `node:sqlite` is used instead of `better-sqlite3` to avoid a native build
 * dependency on every developer machine and in CI.
 */
export class NodeSqliteAdapter implements StorageAdapter {
  private readonly db: DatabaseSync;
  private closed = false;

  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  private assertOpen(): void {
    if (this.closed) throw new Error('storage adapter is closed');
  }

  // Every method is `async` so that a driver error surfaces as a *rejected
  // promise*, exactly as it does through Tauri IPC. A synchronous throw from a
  // Promise-returning method would slip past `.catch()` and would make this
  // adapter behave differently from the production one — which would defeat
  // the entire purpose of testing against it.

  async query(sql: string, params: readonly SqlParam[] = []): Promise<SqlRow[]> {
    this.assertOpen();
    const stmt = this.db.prepare(sql);
    return stmt.all(...normalise(params)) as SqlRow[];
  }

  async execute(sql: string, params: readonly SqlParam[] = []): Promise<ExecuteResult> {
    this.assertOpen();
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...normalise(params));
    return {
      changes: Number(result.changes),
      lastInsertRowid: Number(result.lastInsertRowid),
    };
  }

  async transaction(statements: readonly SqlStatement[]): Promise<ExecuteResult[]> {
    this.assertOpen();
    const results: ExecuteResult[] = [];
    this.db.exec('BEGIN');
    try {
      for (const statement of statements) {
        const stmt = this.db.prepare(statement.sql);
        const result = stmt.run(...normalise(statement.params ?? []));
        results.push({
          changes: Number(result.changes),
          lastInsertRowid: Number(result.lastInsertRowid),
        });
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return results;
  }

  async executeBatch(sql: string): Promise<void> {
    this.assertOpen();
    this.db.exec(sql);
  }

  async integrityCheck(): Promise<string> {
    this.assertOpen();
    const rows = this.db.prepare('PRAGMA integrity_check').all() as Array<Record<string, unknown>>;
    return String(rows[0]?.['integrity_check'] ?? 'unknown');
  }

  async backup(): Promise<string> {
    // Backups are a production concern; in tests the database is disposable.
    return ':memory:';
  }

  async close(): Promise<void> {
    if (!this.closed) {
      this.db.close();
      this.closed = true;
    }
  }
}

/** `node:sqlite` binds booleans as integers only when converted explicitly. */
function normalise(params: readonly SqlParam[]): Array<string | number | null> {
  return params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
}

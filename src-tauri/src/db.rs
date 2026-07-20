//! SQLite access for SYSTEM.
//!
//! Per ADR-0002 the *schema, migrations and repositories live in TypeScript*.
//! This module deliberately exposes only a narrow, parameterised execution
//! surface plus maintenance operations.
//!
//! Security invariant: the `sql` argument always originates from compiled-in
//! application code. User input, imported files and AI responses reach the
//! database exclusively through the bound `params` vector, never through string
//! interpolation. `rusqlite`'s single-statement APIs reject trailing statements,
//! so classic statement-chaining injection fails closed even if that invariant
//! were ever violated upstream.

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::types::{Value as SqlValue, ValueRef};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::{Map as JsonMap, Number, Value as Json};
use tauri::{AppHandle, Manager, State};

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("filesystem error: {0}")]
    Io(#[from] std::io::Error),
    #[error("unsupported parameter type at index {0}")]
    UnsupportedParam(usize),
    #[error("database lock poisoned")]
    LockPoisoned,
    #[error("{0}")]
    Other(String),
}

// Tauri commands must return a serialisable error.
impl Serialize for DbError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

type DbResult<T> = Result<T, DbError>;

pub struct DbState {
    conn: Mutex<Connection>,
    path: PathBuf,
}

impl DbState {
    fn lock(&self) -> DbResult<std::sync::MutexGuard<'_, Connection>> {
        self.conn.lock().map_err(|_| DbError::LockPoisoned)
    }
}

/// Open (or create) the database and apply the pragmas SYSTEM relies on.
pub fn init(app: &AppHandle) -> DbResult<DbState> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| DbError::Other(format!("cannot resolve app data dir: {e}")))?;
    fs::create_dir_all(&dir)?;
    fs::create_dir_all(dir.join("backups"))?;

    let path = dir.join("system.db");
    let conn = Connection::open(&path)?;

    // WAL allows reads to proceed during writes; NORMAL synchronous is the
    // standard safe pairing with WAL. Foreign keys are enforced, not advisory.
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.busy_timeout(std::time::Duration::from_secs(5))?;

    Ok(DbState {
        conn: Mutex::new(conn),
        path,
    })
}

// ---------------------------------------------------------------------------
// JSON <-> SQLite value conversion
// ---------------------------------------------------------------------------

fn json_to_sql(value: &Json, index: usize) -> DbResult<SqlValue> {
    Ok(match value {
        Json::Null => SqlValue::Null,
        Json::Bool(b) => SqlValue::Integer(i64::from(*b)),
        Json::String(s) => SqlValue::Text(s.clone()),
        Json::Number(n) => {
            if let Some(i) = n.as_i64() {
                SqlValue::Integer(i)
            } else if let Some(f) = n.as_f64() {
                SqlValue::Real(f)
            } else {
                return Err(DbError::UnsupportedParam(index));
            }
        }
        // Objects and arrays are stored as JSON text. The TypeScript layer owns
        // the decision of which columns are JSON and parses them back.
        Json::Object(_) | Json::Array(_) => SqlValue::Text(value.to_string()),
    })
}

fn sql_to_json(value: ValueRef<'_>) -> Json {
    match value {
        ValueRef::Null => Json::Null,
        ValueRef::Integer(i) => Json::Number(Number::from(i)),
        ValueRef::Real(f) => Number::from_f64(f).map_or(Json::Null, Json::Number),
        ValueRef::Text(t) => Json::String(String::from_utf8_lossy(t).into_owned()),
        // BLOBs are not used by the current schema; surfaced as a length marker
        // rather than silently corrupting data through a lossy conversion.
        ValueRef::Blob(b) => Json::String(format!("<blob:{}>", b.len())),
    }
}

fn bind_params(stmt: &mut rusqlite::Statement<'_>, params: &[Json]) -> DbResult<()> {
    for (i, p) in params.iter().enumerate() {
        stmt.raw_bind_parameter(i + 1, json_to_sql(p, i)?)?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteResult {
    pub changes: usize,
    pub last_insert_rowid: i64,
}

#[derive(Debug, Deserialize)]
pub struct Statement {
    pub sql: String,
    #[serde(default)]
    pub params: Vec<Json>,
}

#[tauri::command]
pub fn db_query(
    state: State<'_, DbState>,
    sql: String,
    params: Vec<Json>,
) -> DbResult<Vec<JsonMap<String, Json>>> {
    let conn = state.lock()?;
    let mut stmt = conn.prepare(&sql)?;
    let columns: Vec<String> = stmt.column_names().into_iter().map(str::to_owned).collect();

    bind_params(&mut stmt, &params)?;

    let mut rows = stmt.raw_query();
    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        let mut obj = JsonMap::with_capacity(columns.len());
        for (i, name) in columns.iter().enumerate() {
            obj.insert(name.clone(), sql_to_json(row.get_ref(i)?));
        }
        out.push(obj);
    }
    Ok(out)
}

#[tauri::command]
pub fn db_execute(
    state: State<'_, DbState>,
    sql: String,
    params: Vec<Json>,
) -> DbResult<ExecuteResult> {
    let conn = state.lock()?;
    let mut stmt = conn.prepare(&sql)?;
    bind_params(&mut stmt, &params)?;
    let changes = stmt.raw_execute()?;
    Ok(ExecuteResult {
        changes,
        last_insert_rowid: conn.last_insert_rowid(),
    })
}

/// Run several statements atomically. Used by migrations and by any write that
/// must not leave the projections inconsistent with the event log.
#[tauri::command]
pub fn db_transaction(
    state: State<'_, DbState>,
    statements: Vec<Statement>,
) -> DbResult<Vec<ExecuteResult>> {
    let mut conn = state.lock()?;
    let tx = conn.transaction()?;
    let mut results = Vec::with_capacity(statements.len());

    for statement in &statements {
        let mut stmt = tx.prepare(&statement.sql)?;
        bind_params(&mut stmt, &statement.params)?;
        let changes = stmt.raw_execute()?;
        drop(stmt);
        results.push(ExecuteResult {
            changes,
            last_insert_rowid: tx.last_insert_rowid(),
        });
    }

    tx.commit()?;
    Ok(results)
}

/// Statements that cannot run inside a transaction (VACUUM, some PRAGMAs).
#[tauri::command]
pub fn db_execute_batch(state: State<'_, DbState>, sql: String) -> DbResult<()> {
    let conn = state.lock()?;
    conn.execute_batch(&sql)?;
    Ok(())
}

#[tauri::command]
pub fn db_integrity_check(state: State<'_, DbState>) -> DbResult<String> {
    let conn = state.lock()?;
    let result: String =
        conn.query_row("PRAGMA integrity_check", [], |row| row.get(0))?;
    Ok(result)
}

/// Copy the live database to a timestamped file using SQLite's online backup
/// API, which is safe while the connection is open — unlike copying the file.
#[tauri::command]
pub fn db_backup(
    app: AppHandle,
    state: State<'_, DbState>,
    label: Option<String>,
) -> DbResult<String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| DbError::Other(format!("cannot resolve app data dir: {e}")))?
        .join("backups");
    fs::create_dir_all(&dir)?;

    let stamp = chrono::Utc::now().format("%Y%m%dT%H%M%SZ");
    let suffix = label
        .map(|l| {
            let cleaned: String = l
                .chars()
                .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
                .take(40)
                .collect();
            if cleaned.is_empty() {
                String::new()
            } else {
                format!("-{cleaned}")
            }
        })
        .unwrap_or_default();

    let target = dir.join(format!("system-{stamp}{suffix}.db"));

    let conn = state.lock()?;
    let mut dest = Connection::open(&target)?;
    let backup = rusqlite::backup::Backup::new(&conn, &mut dest)?;
    backup.run_to_completion(100, std::time::Duration::from_millis(50), None)?;

    Ok(target.to_string_lossy().into_owned())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPaths {
    pub data_dir: String,
    pub backup_dir: String,
    pub database: String,
}

#[tauri::command]
pub fn app_paths(app: AppHandle, state: State<'_, DbState>) -> DbResult<AppPaths> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| DbError::Other(format!("cannot resolve app data dir: {e}")))?;
    Ok(AppPaths {
        data_dir: dir.to_string_lossy().into_owned(),
        backup_dir: dir.join("backups").to_string_lossy().into_owned(),
        database: state.path.to_string_lossy().into_owned(),
    })
}

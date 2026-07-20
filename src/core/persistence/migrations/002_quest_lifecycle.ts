import type { Migration } from '../types';

/**
 * Extends the quest lifecycle for the navigation-shell milestone
 * (`docs/DECISIONS.md` ADR-0008).
 *
 * Adds two states to `quests.status`:
 *
 *  - `detected`  — generated but not yet shown to the user. The cinematic
 *    encounter presents these one at a time; presenting one flips it to
 *    `offered` and stamps `presented_at`. This is what prevents a quest from
 *    being re-shown after a restart: the transition is persisted immediately,
 *    not inferred from session state.
 *  - `postponed` — the user asked to decide later. Removed from today's
 *    active view but retained in history, unlike a silent deletion.
 *
 * Also adds `reflection_note` and `evidence_note` — free-text captured at
 * completion time. This is deliberately *not* the full structured evidence
 * system from `docs/DATA_MODEL.md` (hash-verified artefacts, duplicate
 * detection); that belongs to the mastery milestone (D-1/D-2). These columns
 * are honest about their scope: a short note, nothing more.
 *
 * SQLite cannot widen a `CHECK` constraint with `ALTER TABLE`, so this
 * migration follows SQLite's documented 12-step procedure: build a new table
 * with the wider constraint, copy every row across explicitly (never
 * `SELECT *`, so a future column addition can't silently reorder values),
 * drop the old table, and rename. It runs inside the migrator's transaction,
 * so a failure at any step leaves the original table untouched.
 */
export const migration002: Migration = {
  version: 2,
  name: 'quest_lifecycle',

  up: `
    CREATE TABLE quests_new (
      id                    TEXT PRIMARY KEY,
      user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title                 TEXT NOT NULL,
      description           TEXT NOT NULL,
      purpose               TEXT,
      quest_type            TEXT NOT NULL,
      domain                TEXT NOT NULL,
      skill_id              TEXT REFERENCES skills(id),
      difficulty            TEXT NOT NULL,
      estimated_minutes     INTEGER,
      status                TEXT NOT NULL CHECK (status IN
                              ('detected','offered','accepted','completed','skipped',
                               'expired','rejected','postponed')),
      due_date              TEXT,
      generation_rationale  TEXT,
      source                TEXT NOT NULL CHECK (source IN ('user','rules','ai')),
      evidence_level        TEXT NOT NULL DEFAULT 'self_reported',
      awarded_xp            INTEGER,
      -- When the cinematic encounter presented this quest to the user.
      -- NULL means it is still queued and has never been shown.
      presented_at          TEXT,
      postponed_at          TEXT,
      -- Free-text captured at completion. Deliberately not the full
      -- structured evidence system — see the migration header.
      reflection_note       TEXT,
      evidence_note         TEXT,
      created_at            TEXT NOT NULL,
      updated_at            TEXT NOT NULL,
      completed_at          TEXT
    );

    INSERT INTO quests_new (
      id, user_id, title, description, purpose, quest_type, domain, skill_id,
      difficulty, estimated_minutes, status, due_date, generation_rationale,
      source, evidence_level, awarded_xp, created_at, updated_at, completed_at
    )
    SELECT
      id, user_id, title, description, purpose, quest_type, domain, skill_id,
      difficulty, estimated_minutes, status, due_date, generation_rationale,
      source, evidence_level, awarded_xp, created_at, updated_at, completed_at
    FROM quests;

    DROP TABLE quests;
    ALTER TABLE quests_new RENAME TO quests;

    CREATE INDEX idx_quests_user_status ON quests(user_id, status, due_date);
    CREATE INDEX idx_quests_user_created ON quests(user_id, created_at);
    CREATE INDEX idx_quests_user_presented ON quests(user_id, presented_at);
  `,

  down: `
    CREATE TABLE quests_old (
      id                    TEXT PRIMARY KEY,
      user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title                 TEXT NOT NULL,
      description           TEXT NOT NULL,
      purpose               TEXT,
      quest_type            TEXT NOT NULL,
      domain                TEXT NOT NULL,
      skill_id              TEXT REFERENCES skills(id),
      difficulty            TEXT NOT NULL,
      estimated_minutes     INTEGER,
      status                TEXT NOT NULL CHECK (status IN
                              ('offered','accepted','completed','skipped','expired','rejected')),
      due_date              TEXT,
      generation_rationale  TEXT,
      source                TEXT NOT NULL CHECK (source IN ('user','rules','ai')),
      evidence_level        TEXT NOT NULL DEFAULT 'self_reported',
      awarded_xp            INTEGER,
      created_at            TEXT NOT NULL,
      updated_at            TEXT NOT NULL,
      completed_at          TEXT
    );

    INSERT INTO quests_old (
      id, user_id, title, description, purpose, quest_type, domain, skill_id,
      difficulty, estimated_minutes, status, due_date, generation_rationale,
      source, evidence_level, awarded_xp, created_at, updated_at, completed_at
    )
    SELECT
      id, user_id, title, description, purpose, quest_type, domain, skill_id,
      difficulty, estimated_minutes, status, due_date, generation_rationale,
      source, evidence_level, awarded_xp, created_at, updated_at, completed_at
    FROM quests;

    DROP TABLE quests;
    ALTER TABLE quests_old RENAME TO quests;

    CREATE INDEX idx_quests_user_status ON quests(user_id, status, due_date);
    CREATE INDEX idx_quests_user_created ON quests(user_id, created_at);
  `,
};

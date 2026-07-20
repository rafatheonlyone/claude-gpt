import type { Migration } from '../types';

/**
 * Initial schema.
 *
 * Two categories of table, and the distinction is load-bearing (see
 * `docs/DATA_MODEL.md` §1):
 *
 *  - Append-only truth: `events`, `evidence`, `audit_log`. Never updated,
 *    never deleted by application logic. A correction is a new compensating
 *    event, not an edit.
 *  - Derived projections: `profile_state`, `domain_state`, `skill_state`,
 *    `attribute_state`. Fully rebuildable from the log, and discarded and
 *    rebuilt whenever a formula changes.
 *
 * This is what makes a decade of history survivable: fixing a formula bug fixes
 * the past without ever falsifying what actually happened.
 */
export const migration001: Migration = {
  version: 1,
  name: 'initial_schema',

  up: `
    -- ---------------------------------------------------------------
    -- Identity and configuration
    -- ---------------------------------------------------------------

    CREATE TABLE users (
      id            TEXT PRIMARY KEY,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );

    CREATE TABLE profiles (
      user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      display_name  TEXT NOT NULL,
      birth_date    TEXT,
      country       TEXT,
      timezone      TEXT NOT NULL DEFAULT 'UTC',
      locale        TEXT NOT NULL DEFAULT 'en',
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );

    -- Facts about a person change. Nothing is ever permanently assumed true.
    CREATE TABLE profile_history (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      field         TEXT NOT NULL,
      value         TEXT,
      recorded_at   TEXT NOT NULL
    );
    CREATE INDEX idx_profile_history_user ON profile_history(user_id, field, recorded_at);

    CREATE TABLE preferences (
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      namespace     TEXT NOT NULL,
      key           TEXT NOT NULL,
      value         TEXT NOT NULL,          -- JSON-encoded
      updated_at    TEXT NOT NULL,
      PRIMARY KEY (user_id, namespace, key)
    );

    -- Onboarding is a resumable, versioned questionnaire, not a fixed sequence.
    CREATE TABLE onboarding_state (
      user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      schema_version  INTEGER NOT NULL,
      current_step    TEXT NOT NULL,
      completed       INTEGER NOT NULL DEFAULT 0,
      started_at      TEXT NOT NULL,
      completed_at    TEXT,
      updated_at      TEXT NOT NULL
    );

    CREATE TABLE onboarding_responses (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id   TEXT NOT NULL,
      value         TEXT,                   -- JSON-encoded; NULL = declined
      declined      INTEGER NOT NULL DEFAULT 0,
      recorded_at   TEXT NOT NULL
    );
    CREATE INDEX idx_onboarding_responses_user ON onboarding_responses(user_id, question_id);

    -- ---------------------------------------------------------------
    -- Append-only truth
    -- ---------------------------------------------------------------

    CREATE TABLE events (
      id              TEXT PRIMARY KEY,     -- UUIDv7: sorts chronologically
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type            TEXT NOT NULL,
      payload         TEXT NOT NULL,        -- JSON
      -- When it happened in the real world vs when it was recorded. Separate,
      -- so backdated entries stay honest.
      occurred_at     TEXT NOT NULL,
      recorded_at     TEXT NOT NULL,
      occurred_date   TEXT NOT NULL,        -- YYYY-MM-DD, user's timezone
      formula_version INTEGER NOT NULL,
      source          TEXT NOT NULL CHECK (source IN ('user', 'rules', 'ai', 'system')),
      correction_of   TEXT REFERENCES events(id)
    );
    CREATE INDEX idx_events_user_time ON events(user_id, occurred_at);
    CREATE INDEX idx_events_user_date ON events(user_id, occurred_date);
    CREATE INDEX idx_events_type ON events(user_id, type, occurred_at);

    CREATE TABLE evidence (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind          TEXT NOT NULL,
      content       TEXT,
      file_path     TEXT,
      -- Content hash: how duplicate-evidence detection works without the
      -- integrity engine having to re-read files.
      hash          TEXT,
      entity_type   TEXT,
      entity_id     TEXT,
      recorded_at   TEXT NOT NULL
    );
    CREATE INDEX idx_evidence_hash ON evidence(user_id, hash);
    CREATE INDEX idx_evidence_entity ON evidence(entity_type, entity_id);

    CREATE TABLE audit_log (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action        TEXT NOT NULL,
      entity_type   TEXT,
      entity_id     TEXT,
      detail        TEXT,                   -- JSON
      recorded_at   TEXT NOT NULL
    );
    CREATE INDEX idx_audit_user_time ON audit_log(user_id, recorded_at);

    -- ---------------------------------------------------------------
    -- Derived projections — rebuildable from the events table
    -- ---------------------------------------------------------------

    CREATE TABLE profile_state (
      user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      total_xp        INTEGER NOT NULL DEFAULT 0,
      level           INTEGER NOT NULL DEFAULT 1,
      rank            TEXT NOT NULL DEFAULT 'dormant',
      rank_tier       INTEGER NOT NULL DEFAULT 0,
      primary_class   TEXT,
      secondary_class TEXT,
      formula_version INTEGER NOT NULL,
      updated_at      TEXT NOT NULL
    );

    CREATE TABLE domain_state (
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      domain        TEXT NOT NULL,
      total_xp      INTEGER NOT NULL DEFAULT 0,
      level         INTEGER NOT NULL DEFAULT 1,
      consistency   REAL NOT NULL DEFAULT 0,
      momentum      REAL NOT NULL DEFAULT 0,
      last_active   TEXT,
      updated_at    TEXT NOT NULL,
      PRIMARY KEY (user_id, domain)
    );

    -- Per-domain, per-day XP ledger. Backs diminishing returns without having
    -- to re-aggregate the whole event log on every award.
    CREATE TABLE domain_daily_xp (
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      domain        TEXT NOT NULL,
      date          TEXT NOT NULL,          -- YYYY-MM-DD
      raw_xp        INTEGER NOT NULL DEFAULT 0,
      credited_xp   INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, domain, date)
    );

    -- ---------------------------------------------------------------
    -- Skills and attributes
    -- ---------------------------------------------------------------

    CREATE TABLE skills (
      id            TEXT PRIMARY KEY,
      domain        TEXT NOT NULL,
      name          TEXT NOT NULL,
      description   TEXT,
      parent_id     TEXT REFERENCES skills(id),
      user_created  INTEGER NOT NULL DEFAULT 0,
      version       INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX idx_skills_domain ON skills(domain);

    CREATE TABLE skill_state (
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill_id        TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      mastery         REAL NOT NULL DEFAULT 0,
      -- Peak is permanent. Current mastery may decay with disuse, but a
      -- demonstrated achievement is never erased (docs/GAME_SYSTEMS.md §4).
      peak_mastery    REAL NOT NULL DEFAULT 0,
      tier            TEXT NOT NULL DEFAULT 'novice',
      last_practised  TEXT,
      updated_at      TEXT NOT NULL,
      PRIMARY KEY (user_id, skill_id)
    );

    CREATE TABLE attributes (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      description   TEXT,
      user_created  INTEGER NOT NULL DEFAULT 0
    );

    -- Attributes are DERIVED, never awarded (ADR-0005). Nothing writes to
    -- attribute_state except a recomputation from skills, XP and consistency.
    CREATE TABLE attribute_state (
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      attribute_id    TEXT NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
      score           REAL NOT NULL DEFAULT 0,
      level           INTEGER NOT NULL DEFAULT 1,
      -- The contributing terms, so any value can be explained to the user by
      -- naming exactly what produced it.
      contributions   TEXT NOT NULL DEFAULT '[]',
      formula_version INTEGER NOT NULL,
      updated_at      TEXT NOT NULL,
      PRIMARY KEY (user_id, attribute_id)
    );

    CREATE TABLE attribute_skill_weights (
      attribute_id  TEXT NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
      skill_id      TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      weight        REAL NOT NULL,
      PRIMARY KEY (attribute_id, skill_id)
    );

    -- ---------------------------------------------------------------
    -- Quests
    -- ---------------------------------------------------------------

    CREATE TABLE quests (
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
      -- Stored, not reconstructed: "why was this generated?" is answered from
      -- the actual decision inputs, not a plausible story invented afterwards.
      generation_rationale  TEXT,
      source                TEXT NOT NULL CHECK (source IN ('user','rules','ai')),
      evidence_level        TEXT NOT NULL DEFAULT 'self_reported',
      awarded_xp            INTEGER,
      created_at            TEXT NOT NULL,
      updated_at            TEXT NOT NULL,
      completed_at          TEXT
    );
    CREATE INDEX idx_quests_user_status ON quests(user_id, status, due_date);
    CREATE INDEX idx_quests_user_created ON quests(user_id, created_at);

    CREATE TABLE quest_steps (
      id            TEXT PRIMARY KEY,
      quest_id      TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
      position      INTEGER NOT NULL,
      description   TEXT NOT NULL,
      optional      INTEGER NOT NULL DEFAULT 0,
      completed     INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX idx_quest_steps_quest ON quest_steps(quest_id, position);

    -- Feeds difficulty calibration and relevance scoring.
    CREATE TABLE quest_feedback (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quest_id      TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
      action        TEXT NOT NULL,
      reason        TEXT,
      recorded_at   TEXT NOT NULL
    );
    CREATE INDEX idx_quest_feedback_user ON quest_feedback(user_id, recorded_at);

    -- ---------------------------------------------------------------
    -- Achievements
    -- ---------------------------------------------------------------

    CREATE TABLE achievements (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      description   TEXT NOT NULL,
      category      TEXT NOT NULL,
      rarity        TEXT NOT NULL CHECK (rarity IN ('standard','rare','legendary')),
      secret        INTEGER NOT NULL DEFAULT 0,
      icon          TEXT NOT NULL,
      version       INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE achievement_unlocks (
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id  TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
      unlocked_at     TEXT NOT NULL,
      context         TEXT,
      user_note       TEXT,
      acknowledged    INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, achievement_id)
    );
    CREATE INDEX idx_unlocks_user_time ON achievement_unlocks(user_id, unlocked_at);

    -- ---------------------------------------------------------------
    -- Integrity
    -- ---------------------------------------------------------------

    CREATE TABLE integrity_flags (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      entity_type   TEXT NOT NULL,
      entity_id     TEXT NOT NULL,
      verdict       TEXT NOT NULL CHECK (verdict IN ('accept','recalibrate','review')),
      reason        TEXT NOT NULL,
      factor        REAL NOT NULL DEFAULT 1,
      user_override INTEGER NOT NULL DEFAULT 0,
      recorded_at   TEXT NOT NULL
    );
    CREATE INDEX idx_integrity_user ON integrity_flags(user_id, recorded_at);
  `,

  down: `
    DROP TABLE IF EXISTS integrity_flags;
    DROP TABLE IF EXISTS achievement_unlocks;
    DROP TABLE IF EXISTS achievements;
    DROP TABLE IF EXISTS quest_feedback;
    DROP TABLE IF EXISTS quest_steps;
    DROP TABLE IF EXISTS quests;
    DROP TABLE IF EXISTS attribute_skill_weights;
    DROP TABLE IF EXISTS attribute_state;
    DROP TABLE IF EXISTS attributes;
    DROP TABLE IF EXISTS skill_state;
    DROP TABLE IF EXISTS skills;
    DROP TABLE IF EXISTS domain_daily_xp;
    DROP TABLE IF EXISTS domain_state;
    DROP TABLE IF EXISTS profile_state;
    DROP TABLE IF EXISTS audit_log;
    DROP TABLE IF EXISTS evidence;
    DROP TABLE IF EXISTS events;
    DROP TABLE IF EXISTS onboarding_responses;
    DROP TABLE IF EXISTS onboarding_state;
    DROP TABLE IF EXISTS preferences;
    DROP TABLE IF EXISTS profile_history;
    DROP TABLE IF EXISTS profiles;
    DROP TABLE IF EXISTS users;
  `,
};

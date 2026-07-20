import type { Migration } from '../types';

/**
 * Adds `archived` to `quests.status` (ADR-0010).
 *
 * The duplicate-quest repair flow (`SystemService.repairDuplicateQuests`)
 * needs somewhere honest to put a redundant generated quest that is neither
 * a user decision (`rejected`, which the user did not make) nor a silent
 * deletion (which `CLAUDE.md` forbids — "never delete files or tests merely
 * to silence an error" applies just as much to a user's quest history).
 * `archived` records plainly that the system removed this copy from view
 * because an equivalent quest already existed, while keeping the row and
 * its full history intact and excluded from every browsable list by
 * default. It is also the eighth grouping bucket on the redesigned
 * Missions page.
 *
 * SQLite cannot widen a `CHECK` constraint with `ALTER TABLE`, so this
 * repeats the twelve-step rebuild procedure from migration 002: build a new
 * table with the wider constraint, copy every row explicitly (never
 * `SELECT *`), drop the old table, rename, and recreate the indexes —
 * including `template_id`, added by migration 003 as a plain column and
 * therefore otherwise lost in a naive rebuild.
 */
export const migration004: Migration = {
  version: 4,
  name: 'quest_archiving',

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
                               'expired','rejected','postponed','archived')),
      due_date              TEXT,
      generation_rationale  TEXT,
      source                TEXT NOT NULL CHECK (source IN ('user','rules','ai')),
      evidence_level        TEXT NOT NULL DEFAULT 'self_reported',
      awarded_xp            INTEGER,
      presented_at          TEXT,
      postponed_at          TEXT,
      reflection_note       TEXT,
      evidence_note         TEXT,
      template_id           TEXT,
      created_at            TEXT NOT NULL,
      updated_at            TEXT NOT NULL,
      completed_at          TEXT
    );

    INSERT INTO quests_new (
      id, user_id, title, description, purpose, quest_type, domain, skill_id,
      difficulty, estimated_minutes, status, due_date, generation_rationale,
      source, evidence_level, awarded_xp, presented_at, postponed_at,
      reflection_note, evidence_note, template_id, created_at, updated_at, completed_at
    )
    SELECT
      id, user_id, title, description, purpose, quest_type, domain, skill_id,
      difficulty, estimated_minutes, status, due_date, generation_rationale,
      source, evidence_level, awarded_xp, presented_at, postponed_at,
      reflection_note, evidence_note, template_id, created_at, updated_at, completed_at
    FROM quests;

    DROP TABLE quests;
    ALTER TABLE quests_new RENAME TO quests;

    CREATE INDEX idx_quests_user_status ON quests(user_id, status, due_date);
    CREATE INDEX idx_quests_user_created ON quests(user_id, created_at);
    CREATE INDEX idx_quests_user_presented ON quests(user_id, presented_at);
    CREATE INDEX idx_quests_user_template ON quests(user_id, template_id, status);
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
                              ('detected','offered','accepted','completed','skipped',
                               'expired','rejected','postponed')),
      due_date              TEXT,
      generation_rationale  TEXT,
      source                TEXT NOT NULL CHECK (source IN ('user','rules','ai')),
      evidence_level        TEXT NOT NULL DEFAULT 'self_reported',
      awarded_xp            INTEGER,
      presented_at          TEXT,
      postponed_at          TEXT,
      reflection_note       TEXT,
      evidence_note         TEXT,
      template_id           TEXT,
      created_at            TEXT NOT NULL,
      updated_at            TEXT NOT NULL,
      completed_at          TEXT
    );

    INSERT INTO quests_old (
      id, user_id, title, description, purpose, quest_type, domain, skill_id,
      difficulty, estimated_minutes, status, due_date, generation_rationale,
      source, evidence_level, awarded_xp, presented_at, postponed_at,
      reflection_note, evidence_note, template_id, created_at, updated_at, completed_at
    )
    SELECT
      id, user_id, title, description, purpose, quest_type, domain, skill_id,
      difficulty, estimated_minutes, status, due_date, generation_rationale,
      source, evidence_level, awarded_xp, presented_at, postponed_at,
      reflection_note, evidence_note, template_id, created_at, updated_at, completed_at
    FROM quests;

    DROP TABLE quests;
    ALTER TABLE quests_old RENAME TO quests;

    CREATE INDEX idx_quests_user_status ON quests(user_id, status, due_date);
    CREATE INDEX idx_quests_user_created ON quests(user_id, created_at);
    CREATE INDEX idx_quests_user_presented ON quests(user_id, presented_at);
    CREATE INDEX idx_quests_user_template ON quests(user_id, template_id, status);
  `,
};

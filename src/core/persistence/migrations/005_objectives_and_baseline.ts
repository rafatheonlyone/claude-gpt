import type { Migration } from '../types';

/**
 * Adds first-class quest objectives and an editable physical baseline
 * (`docs/GAME_SYSTEMS.md` §9, ADR-0012).
 *
 * `quest_objectives` is deliberately generic — attachable to any quest, not
 * only a Daily Protocol — rather than a `daily_protocols` table of its own.
 * A Daily Protocol is simply a quest (`quest_type = 'daily_protocol'`) whose
 * objectives happen to be its whole content; the existing quest lifecycle
 * (accept/complete/persist/restore), XP award and history already apply to
 * it unchanged. Introducing a parallel entity would duplicate all of that
 * for no behavioural gain. See `src/core/quests/objectives.ts` for why the
 * kind enum is smaller than the milestone brief's twelve types.
 *
 * `physical_baseline` is one row per user, editable at any time from
 * Settings — never a one-time onboarding fact. Values are self-reported
 * *comfortable* capacity, not a maximum or a test result: objective targets
 * are calibrated to 80% of this figure (`calibratedTarget`), which is what
 * keeps a generated Daily Protocol sustainable rather than a fixed extreme
 * benchmark. A `NULL` value means "not set", and generation falls back to a
 * conservative default rather than refusing to propose a physical objective
 * at all.
 */
export const migration005: Migration = {
  version: 5,
  name: 'objectives_and_baseline',

  up: `
    CREATE TABLE quest_objectives (
      id             TEXT PRIMARY KEY,
      quest_id       TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
      position       INTEGER NOT NULL,
      kind           TEXT NOT NULL CHECK (kind IN
                        ('repetitions','duration_seconds','distance_meters','quantity',
                         'checklist','numeric_score','percentage','binary')),
      label          TEXT NOT NULL,
      -- NULL for checklist/binary — completion is 0/1, not a count.
      target_value   REAL,
      current_value  REAL NOT NULL DEFAULT 0,
      unit           TEXT,
      optional       INTEGER NOT NULL DEFAULT 0,
      notes          TEXT,
      completed_at   TEXT,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    );

    CREATE INDEX idx_quest_objectives_quest ON quest_objectives(quest_id, position);

    CREATE TABLE physical_baseline (
      user_id                      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      pushups_comfortable          INTEGER,
      squats_comfortable           INTEGER,
      plank_seconds                INTEGER,
      training_frequency_per_week  INTEGER,
      updated_at                   TEXT NOT NULL
    );
  `,

  down: `
    DROP TABLE physical_baseline;
    DROP INDEX idx_quest_objectives_quest;
    DROP TABLE quest_objectives;
  `,
};

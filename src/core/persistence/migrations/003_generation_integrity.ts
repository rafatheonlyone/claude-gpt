import type { Migration } from '../types';

/**
 * Fixes the generation pipeline's two structural defects found by inspecting a
 * real development database (`docs/DECISIONS.md` ADR-0009):
 *
 *  - **No idempotency lock.** `ensureTodayQuests` was a plain
 *    check-then-generate: read `getQuestsForDate`, and if empty, generate.
 *    Because that is two separate async steps, several callers that each
 *    mount independently (the shell's encounter queue, Home, Today) could
 *    all read "empty" before any of them finished inserting, and each would
 *    then generate its own batch. A real database inspected for this
 *    migration had **21 quests inserted across 7 batches within 22
 *    milliseconds** — a textbook time-of-check-to-time-of-use race, not a
 *    workload-tuning problem. `daily_generation_locks` gives every caller a
 *    single row to race for (`INSERT OR IGNORE`); only the caller that
 *    actually inserts the row proceeds to generate.
 *  - **No record of what a generation decided and why**, beyond the
 *    per-quest `generation_rationale` string. `daily_generation_plans`
 *    stores the budget breakdown itself — available/planned/remaining
 *    minutes, mandatory vs optional counts, whether the day was clamped —
 *    so the Architect can explain a day's plan even after restart, and so
 *    `recalibrateToday` can read what already exists instead of blindly
 *    adding a fixed count on top of it.
 *
 * Also adds `quests.template_id`. It was never persisted on the row itself,
 * only inside the JSON payload of the `QuestGenerated` event, which made
 * "is this template already active today" a matter of parsing event history
 * rather than a plain indexed column. Because generation is entirely
 * template-based (no freeform AI content yet), `template_id` doubles as the
 * deterministic duplicate fingerprint: two quests with the same
 * `template_id` are the same generated content by construction, so no
 * separate similarity/hashing strategy is needed.
 */
export const migration003: Migration = {
  version: 3,
  name: 'generation_integrity',

  up: `
    ALTER TABLE quests ADD COLUMN template_id TEXT;

    CREATE INDEX idx_quests_user_template ON quests(user_id, template_id, status);

    -- One row per user per date. The row's existence *is* the lock: whichever
    -- caller's INSERT OR IGNORE actually inserts it (changes = 1) owns
    -- generation for that date; everyone else backs off and re-reads.
    CREATE TABLE daily_generation_locks (
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date          TEXT NOT NULL,
      created_at    TEXT NOT NULL,
      PRIMARY KEY (user_id, date)
    );

    -- The workload-budget decision behind a date's plan, kept distinct from
    -- the quests themselves so it survives recalibration and is explainable
    -- after a restart, not just at the moment of generation.
    CREATE TABLE daily_generation_plans (
      user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date                TEXT NOT NULL,
      available_minutes   INTEGER NOT NULL,
      budget_minutes      INTEGER NOT NULL,
      planned_minutes     INTEGER NOT NULL,
      mandatory_count     INTEGER NOT NULL,
      optional_count      INTEGER NOT NULL,
      overloaded          INTEGER NOT NULL DEFAULT 0,
      breakdown           TEXT NOT NULL,   -- JSON: ordered list of {label, detail}
      updated_at          TEXT NOT NULL,
      PRIMARY KEY (user_id, date)
    );
  `,

  down: `
    DROP TABLE daily_generation_plans;
    DROP TABLE daily_generation_locks;
    DROP INDEX idx_quests_user_template;
    ALTER TABLE quests DROP COLUMN template_id;
  `,
};

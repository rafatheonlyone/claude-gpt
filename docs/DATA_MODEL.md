# SYSTEM — Data Model

SQLite, local-first. Schema and migrations are owned by TypeScript (ADR-0002) in
`src/core/persistence/`. All timestamps are ISO-8601 UTC strings; all IDs are UUIDv7 so they sort
chronologically and remain stable across export/import.

## 1. Core principle: log plus projections

Two categories of table, and the distinction matters:

- **Append-only truth** — `events`, `evidence`, `audit_log`, `snapshots`. Never updated, never
  deleted by application logic. A correction is a _new compensating event_, not an edit.
- **Derived projections** — `profile_state`, `skill_state`, `attribute_state`, `streak_state`,
  analytics rollups. Fully rebuildable from the log at any time.

If a projection is ever wrong, it is discarded and rebuilt. This is what makes a decade of history
survivable through formula changes and bug fixes: fixing the code fixes the past, without ever
falsifying what actually happened.

## 2. Entities

### Identity and configuration

| Table                 | Purpose                                             | Notes                                                   |
| --------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| `user`                | One row per user                                    | Generalised for multi-user later; `id` is FK everywhere |
| `profile`             | Display name, birth date, country, timezone, locale | Birth date drives age-sensitive safety rules            |
| `profile_history`     | Versioned profile snapshots                         | Records that facts change over time                     |
| `preferences`         | Namespaced key/value with typed schema              | Animation, sound, notifications, privacy, AI            |
| `onboarding_state`    | Resumable questionnaire progress                    | `schema_version`, per-section answers, completion       |
| `onboarding_response` | Individual answers with revision history            | Editable later; prior values retained                   |

### Progression

| Table             | Purpose                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events`          | Append-only log. `id`, `type`, `payload` (JSON), `occurred_at`, `recorded_at`, `formula_version`, `source` (`user`/`rules`/`ai`), `correction_of` |
| `profile_state`   | Projection: global XP, level, rank, sub-tier, primary/secondary class                                                                             |
| `domain_state`    | Projection: per-domain XP, level, consistency, momentum                                                                                           |
| `skill`           | Skill registry: id, domain, name, description, parents, user-created flag, version                                                                |
| `skill_state`     | Projection: current mastery, peak mastery, tier, last-practised, decay state                                                                      |
| `attribute`       | Attribute registry with contribution weights (data, not code)                                                                                     |
| `attribute_state` | Projection: derived score and level, with contribution breakdown                                                                                  |
| `rank_progress`   | Per-criterion progress toward the next rank; trial status                                                                                         |
| `class_history`   | Class changes over time with the evidence that triggered each                                                                                     |

`occurred_at` and `recorded_at` are separate so backdated entries stay honest — the timeline shows
when something happened, the audit shows when it was recorded.

### Quests

| Table                     | Purpose                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `quest_template`          | Reusable definitions, including user-created and recurrence rules                                           |
| `quest` (`quests`)        | An instance: status, difficulty, domain, skills, due date, steps, rewards, `generation_rationale`, `source` |
| `quest_step`              | Ordered steps, optional flag, completion state                                                              |
| `quest_objective`         | Ordered, independently-progressable objectives on any quest — a Daily Protocol's actual content (ADR-0012)  |
| `quest_chain`             | Chains and campaigns; ordering and unlock conditions                                                        |
| `quest_feedback`          | Accept / reject / reroll / edit / postpone / report, with reason. Feeds calibration                         |
| `daily_generation_lock`   | Idempotency primitive for a date's generation — the row's existence is the lock (ADR-0009)                  |
| `daily_generation_plan`   | The workload-budget decision behind a date's plan, explainable after a restart (ADR-0009)                   |
| `physical_baseline`       | Editable, self-reported comfortable capacity used to calibrate Daily Protocol objective targets (ADR-0012)  |

`generation_rationale` is stored, not regenerated, so "why was this quest created?" is answered from
the actual decision inputs rather than a plausible reconstruction after the fact.

As implemented (migration 002, ADR-0008; migration 004, ADR-0010), `quests.status` is
`detected | offered | accepted | completed | skipped | expired | rejected | postponed | archived`.
`detected` means the rules engine generated the quest but the cinematic encounter has not yet shown
it to the user — this is a persisted state, not client-side session state, so a restart can never
cause a quest to be re-presented as new. `presented_at` is stamped exactly once, the first time the
quest is shown, whichever path shows it (the encounter or opening its detail view directly).
`postponed` is distinct from `rejected`: the quest is retained, not discarded, recording that the
user meant to decide later. `archived` is distinct from both: it marks a redundant generated
duplicate found by the repair flow below, retained (never deleted) but excluded from the default
browsable list. `reflection_note` and `evidence_note` are free-text columns captured at completion —
a deliberately small subset of the full structured evidence system described above, scoped to the
mastery milestone (D-1/D-2) where evidence becomes load-bearing rather than optional colour.
`template_id` (migration 003) records which template generated the quest; because generation is
entirely template-based, this doubles as a deterministic duplicate fingerprint (ADR-0010) — no
similarity heuristic is needed.

**Generation integrity (migration 003, ADR-0009).** `daily_generation_locks` (`user_id`, `date`) is a
pure concurrency primitive: its row's existence is the lock itself, claimed with `INSERT OR IGNORE`
so exactly one of several racing callers proceeds to generate for a given date — see ADR-0009 for the
real-database evidence that motivated it. `daily_generation_plans` persists the workload-budget
decision behind a date's plan (available/budget/planned minutes, mandatory/optional counts, an
overload flag, and a machine-readable reason breakdown) so the Architect can explain a day's plan
after a restart, not only at the moment of generation.

**Quest objectives and physical baseline (migration 005, ADR-0012).** `quest_objectives` attaches
ordered, independently-progressable objectives to any quest — most commonly a Daily Protocol
(`quest_type = 'daily_protocol'`) — rather than introducing a separate `daily_protocols` entity; the
existing quest lifecycle, XP award and history apply to it unchanged. Each row has a `kind` (one of
`repetitions`, `duration_seconds`, `distance_meters`, `quantity`, `checklist`, `numeric_score`,
`percentage`, `binary` — see `src/core/quests/objectives.ts` for why this is smaller than a naive
one-kind-per-milestone-example enumeration), a `target_value` (`NULL` for the zero/one
checklist/binary kinds), a `current_value`, and an `optional` flag — an undone optional objective
never blocks the protocol's overall completion. `physical_baseline` is one row per user, editable at
any time from Settings, holding self-reported *comfortable* capacity (push-ups, squats, plank
seconds, training days per week). Objective targets for baseline-linked objectives are calibrated to
80% of the relevant baseline value at generation time — sustainable, never a fixed extreme
benchmark — falling back to a conservative default when no baseline is set.

### Challenges and rewards

| Table                | Purpose                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| `boss`               | User-defined challenge plus Architect enhancement; type, date, importance, outcome |
| `boss_component`     | Weighted preparation components driving progress                                   |
| `boss_phase`         | Phases, unlock thresholds, weaknesses, narrative                                   |
| `boss_review`        | Post-battle outcome, lessons, mastery deltas, rematch seed                         |
| `achievement`        | Registry: condition, rarity, secret flag, icon, version                            |
| `achievement_unlock` | Unlock timestamp, context, user note                                               |
| `inventory_item`     | Books, courses, certificates, tools, projects, awards, artefacts                   |
| `life_arc`           | Arc definition, activation conditions, status, dates                               |

### Evidence, integrity, history

| Table            | Purpose                                                                                |
| ---------------- | -------------------------------------------------------------------------------------- |
| `evidence`       | Type, content or file reference, hash, linked entity. Hash enables duplicate detection |
| `integrity_flag` | Verdict, reason, applied factor, user override, resolution                             |
| `audit_log`      | Every correction, override, manual adjustment, import, deletion                        |
| `snapshot`       | Full derived state at a meaningful boundary, with `formula_version`                    |
| `focus_session`  | Intention, start/end, pauses, distraction notes, output, reflection                    |

### System and AI

| Table                  | Purpose                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `schema_migration`     | Applied migrations, checksums, timestamps                                                 |
| `ai_request_log`       | Provider, model, token counts, cost, latency, outcome. Content only if explicitly enabled |
| `architect_decision`   | What was generated, from which inputs, by which layer, and whether accepted               |
| `notification_history` | Delivered notifications, dismissal, postponement                                          |

## 3. Key relationships

```
user 1─┬─1 profile ──* profile_history
       ├─1 profile_state          (projection)
       ├─* domain_state           (projection)
       ├─* events                 (append-only truth)
       ├─* skill_state ──* skill
       ├─* attribute_state ──* attribute
       ├─* quest ──* quest_step
       │      └──* quest_feedback
       │      └──? quest_chain
       ├─* boss ──* boss_component
       │      └──* boss_phase
       │      └──? boss_review
       ├─* achievement_unlock ──* achievement
       ├─* evidence ──? quest | boss | focus_session
       ├─* snapshot
       └─* audit_log
```

## 4. Migrations

Sequential, numbered, forward-only in production, each with an explicit `down` used only in
development.

```
src/core/persistence/migrations/
  001_initial_schema.ts
  002_...
```

Each migration exports `version`, `name`, `up(db)`, `down(db)`, and `checksum`.

Rules:

1. An automatic backup is taken before any migration runs.
2. Migrations run in a transaction; failure rolls back completely.
3. Checksum mismatch on an already-applied migration halts startup with a clear error. A silently
   altered migration is a corruption risk, not a warning.
4. The app refuses to start against a schema version _newer_ than it understands, rather than
   damaging data written by a later version.
5. Every migration has a test proving it applies to the prior version and preserves existing data.

## 5. Backup, export, deletion

**Automatic backups:** on launch (if the last is >24 h old) and before every migration. Rolling
retention — 7 daily, 4 weekly, 12 monthly. Stored under the app data directory.

**Manual backup / restore:** user-triggered, with `PRAGMA integrity_check` verification before a
restore is accepted.

**Export:**

- Full JSON archive — everything, restorable, machine-readable.
- Human-readable Markdown — timeline, achievements, milestones, reflections. This is the format that
  matters in ten years, when the app may no longer exist. Data the user cannot read without our
  software is not truly theirs.
- CSV per table for analysis.

**Deletion:** any entity, any date range, or everything. Deletion is real deletion — `VACUUM` runs
afterwards so data is not merely unlinked. The user is told exactly what will be removed and what
becomes unrecoverable before confirming.

**Encryption:** optional, off by default, opt-in at rest via SQLCipher. Deferred to a later phase and
tracked in the roadmap. API credentials are _never_ stored in SQLite — they go to the Windows
Credential Manager via `SecretAdapter`.

## 6. Integrity and performance

- Foreign keys enforced (`PRAGMA foreign_keys = ON`).
- WAL journal mode for concurrent read during write.
- `PRAGMA integrity_check` on launch, weekly deep check, and before every restore.
- Indexes on every foreign key, on `events(occurred_at)`, `quest(status, due_date)`, and
  `evidence(hash)` for duplicate detection.
- Projection rebuilds start from the latest snapshot, so replay cost stays bounded as the log grows
  across years.

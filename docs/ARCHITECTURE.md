# SYSTEM — Architecture

## 1. Shape of the system

```
┌──────────────────────────────────────────────────────────────────┐
│  WebView2 (Chromium)                                             │
│                                                                  │
│   React 19 UI  ──────────────────────────────────────────────┐   │
│    features/   design system   motion   audio   i18n         │   │
│         │                                                    │   │
│         │  reads state, dispatches intents                   │   │
│         ▼                                                    │   │
│   Application services  (src/core/app)                       │   │
│    orchestration, use-cases, transactions, event emission    │   │
│         │                                                    │   │
│         ▼                                                    │   │
│   Domain  (src/core/domain, progression, quests, architect)  │   │
│    pure logic, no I/O, no framework                          │   │
│         │                                                    │   │
│         ▼                                                    │   │
│   Ports  (src/core/platform)  ← interfaces only              │   │
└─────────┼────────────────────────────────────────────────────┴───┘
          │ implemented by
   ┌──────┴───────────────┬──────────────────────────┐
   │ src/platform/tauri   │ src/platform/test        │
   │  real adapters       │  in-memory / node:sqlite │
   └──────┬───────────────┴──────────────────────────┘
          │ Tauri IPC (typed, parameterised only)
          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Rust host process                                               │
│   rusqlite · file I/O · OS notifications · secure credentials    │
│   backup · integrity check · window lifecycle                    │
└──────────────────────────────────────────────────────────────────┘
```

The critical property: **dependencies point inward.** The UI knows about services; services know about
domain; domain knows about ports; nothing in the core knows about React, Tauri, or SQLite specifics.

## 2. Directory layout

```
src/
  core/                       # portable, framework-free, 100% unit-testable
    domain/                   # entities and value objects
      profile/  quest/  skill/  attribute/  boss/  achievement/
      class/  rank/  arc/  inventory/  evidence/
    progression/              # ALL formulas: xp, level, mastery, attributes,
                              # consistency, momentum, rank gates. Pure + versioned.
    quests/                   # quest engine: generation, scheduling, lifecycle
    architect/                # rules engine, providers, prompts, safety filter
      rules/  providers/  safety/  schemas/
    integrity/                # anti-farming, diminishing returns, audit
    persistence/              # schema, migrations, repositories, backup logic
    platform/                 # PORT INTERFACES ONLY — no implementations
    events/                   # domain event definitions + event log
    app/                      # application services / use-cases

  platform/
    tauri/                    # real adapters (only place importing @tauri-apps/*)
    test/                     # node:sqlite + in-memory adapters for tests
    web/                      # browser-only adapters for `npm run dev`

  ui/                         # design system primitives (Panel, Glyph, Meter, ...)
  features/                   # screen-level composition per product area
  styles/                     # design tokens, themes, motion definitions
  audio/                      # procedural sound synthesis + sound registry
  i18n/                       # typed message catalogues
  app/                        # React shell: providers, routing, error boundaries

src-tauri/                    # Rust host
docs/                         # permanent project memory
tests/                        # integration + e2e
```

## 3. Data flow: one quest completion

This is the reference path every similar interaction follows.

1. UI dispatches `completeQuest(questId, evidence?)`.
2. `QuestService` opens a transaction through `StorageAdapter`.
3. `IntegrityEngine` inspects recent activity: is this a duplicate, a fragmented trivial task, an
   implausible volume? It returns an `IntegrityVerdict` — `accept`, `recalibrate(factor, reason)`, or
   `flagForReview(reason)`. It never blocks the user and never accuses.
4. `ProgressionEngine` computes the XP award as a pure function of quest difficulty, evidence quality,
   the integrity verdict, and the domain's diminishing-returns state for the current day.
5. Domain events are emitted: `QuestCompleted`, `XpAwarded`, and conditionally `LevelGained`,
   `SkillAdvanced`, `MasteryChanged`, `AchievementUnlocked`, `RankTrialAvailable`.
6. Events are appended to the immutable event log; projections (profile totals, attribute values,
   streak state) are updated within the same transaction.
7. The transaction commits. Only then does the UI receive the event stream.
8. The presentation layer queues resulting notifications and cinematics, respecting focus mode,
   reduced motion, mute, and the interruption budget.

**Attributes are never written in step 6.** They are recomputed from mastery, XP, and consistency —
see ADR-0005.

## 4. Event sourcing, applied narrowly

A full event-sourced architecture would be over-engineering here. A pure mutable-state model would
lose the history that makes a ten-year product meaningful. SYSTEM takes a middle path:

- **The event log is the append-only source of truth** for everything that awards progression.
- **Projections are derived, disposable caches** — profile totals, attribute values, skill mastery,
  streaks, analytics rollups. Any projection can be rebuilt from the log.
- **Snapshots** are taken at meaningful boundaries (age change, school year, arc transition, annual
  retrospective) and bound to a formula version, so history is never retroactively rewritten when a
  formula is recalibrated.

This gives auditability, honest correction (an amendment is a new event, not a silent overwrite), and
the ability to fix a formula bug without destroying the user's past.

**Bounded replay:** projection rebuilds start from the most recent snapshot, so replay cost stays
constant as the log grows across years.

## 5. The IPC surface

Rust exposes a small, audited command set. It is deliberately not a general-purpose bridge.

| Command                                       | Purpose                        | Constraint                                                          |
| --------------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| `db_query`                                    | Read                           | SQL from compiled application code only; values bound as parameters |
| `db_execute`                                  | Write                          | Same                                                                |
| `db_transaction`                              | Atomic batch                   | Same                                                                |
| `db_integrity_check`                          | `PRAGMA integrity_check`       | —                                                                   |
| `db_backup`                                   | Snapshot to a timestamped file | Path confined to the app data directory                             |
| `secret_set` / `secret_get` / `secret_delete` | API credentials                | OS credential store, never SQLite                                   |
| `notify`                                      | Native Windows notification    | Rate-limited host-side                                              |
| `app_paths`                                   | Resolve app directories        | —                                                                   |

The SQL string position accepts only application-authored constants. User input, imported files, and
AI responses reach the database exclusively as bound parameters. This invariant is what makes a narrow
SQL bridge acceptable, and it is tested.

## 6. State management

- **Server-of-record state** (profile, quests, skills) lives in SQLite, read through repositories,
  cached in Zustand stores keyed by projection.
- **Ephemeral UI state** (open panels, animation phase, focus session timer) lives in React state or
  local stores and is never persisted unless the user would be upset to lose it.
- **Notification and cinematic queueing** is its own store with an interruption budget, so the app
  cannot bombard the user during a focus session.

## 7. Performance posture

Targets on the reference machine (i5-8500T, 35 W):

| Metric                                          | Target   |
| ----------------------------------------------- | -------- |
| Cold start to interactive                       | < 1.5 s  |
| Idle CPU (dashboard visible, ambient motion on) | < 1.0 %  |
| Idle RAM (host + WebView2)                      | < 180 MB |
| Interaction to visual response                  | < 100 ms |
| Frame budget during cinematics                  | 16.6 ms  |

Ambient animation pauses on window blur. Particle systems are canvas-based with an explicit budget,
degrade with the animation-intensity setting, and stop entirely under reduced motion. These are
measured in `docs/TESTING.md`, not assumed.

## 8. Failure posture

- Every feature route is wrapped in an error boundary that preserves the rest of the shell.
- Storage failures surface as explicit, recoverable UI states — never a silent no-op, never data loss.
- Migration failures roll back and refuse to start with a corrupted schema, reporting the exact version
  mismatch. A backup is taken automatically before any migration runs.
- AI provider failure degrades to the rules engine and records the degradation.
- Structured logging with levels; no personal content in logs by default.

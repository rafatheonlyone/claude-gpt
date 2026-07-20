# Architecture Decision Records

Each ADR records a decision, the context that forced it, the alternatives considered, and the
consequences accepted. ADRs are append-only: to reverse a decision, add a superseding ADR rather
than editing history.

---

## ADR-0001 — Desktop shell: Tauri 2

**Status:** Accepted — 2026-07-19
**Context:** SYSTEM must be an installable Windows desktop application with rich animation, low idle
resource usage, and a ten-year maintenance horizon. The target machine is an Intel i5-8500T — a 35 W
six-core desktop part with 31.8 GB RAM. Low CPU headroom matters more than memory headroom here.

**Decision:** Tauri 2 with a React 19 + TypeScript + Vite frontend and a Rust host process.

**Alternatives considered:**

| Option               | Why not                                                                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Electron             | ~200 MB installer, ~10× idle RAM, a full Chromium per app. Materially worse on a 35 W CPU. Its main advantage — no toolchain install — evaporated once Rust was verified working.         |
| Flutter              | Excellent animation, but a second language ecosystem, weaker desktop-Windows maturity, and worse fit for a web-technology-fluent user who wants to grow front-end skill via this project. |
| .NET / WPF / WinUI   | Best-in-class native Windows integration, but effectively Windows-permanent and a poor match for the declared cross-platform-optional goal and the user's JS/TS skill growth.             |
| Kotlin Multiplatform | Immature desktop story for this use case; large toolchain burden for no offsetting benefit.                                                                                               |

**Evidence gathered before accepting:** The WebView2 runtime was already present on the target machine
(150.0.4078.83), removing Tauri's principal deployment risk. Rust 1.97.1 and MSVC Build Tools 17.14 with
Windows SDK 10.0.26100 were installed and a release binary was compiled, linked, and executed
successfully. The decision was not accepted until the toolchain demonstrably worked.

**Consequences:**

- Accepted: a one-time multi-gigabyte toolchain install, and Rust as a second language in the codebase.
- Accepted: WebView2 rendering differences from Chromium must be tested, not assumed.
- Mitigated: shell lock-in is contained by ADR-0003. Replacing Tauri with Electron would mean
  reimplementing the platform adapters only, not the product.

---

## ADR-0002 — Persistence: SQLite, with SQL owned by TypeScript

**Status:** Accepted — 2026-07-19
**Context:** Data must be local-first, durable across a decade, migratable, backup-able, exportable,
integrity-checkable, and optionally encryptable. It must also be _testable_, because a silent bug in
persistence quietly corrupts years of irreplaceable personal history.

**Decision:** SQLite as the store. Schema definitions, migrations, and repositories are written in
TypeScript inside the portable core. Rust exposes a deliberately narrow, **parameterised-only** command
surface (`db_query`, `db_execute`, `db_transaction`, plus backup/integrity/vacuum operations) backed by
`rusqlite`. In tests the identical migration and repository code runs against Node 24's built-in
`node:sqlite` module.

**Alternatives considered:**

- _All persistence logic in Rust:_ strong type safety, but every entity change requires Rust
  boilerplate, and the data layer becomes untestable without spinning up Tauri. Rejected on
  iteration speed and testability.
- _`tauri-plugin-sql`:_ convenient, but its migration model is too limited for versioned rollback,
  and it constrains a decade-long schema evolution path.
- _A document store or plain JSON files:_ no transactions, no integrity guarantees, poor query
  ergonomics for the analytics requirements. Rejected outright.

**Consequences:**

- The exact same migration and repository code is exercised by the test suite and by production.
- Accepted risk: a narrow SQL-execution IPC surface could become an injection vector. Mitigated by
  accepting bound parameters only and never accepting SQL strings from anything but compiled-in
  application code. No user input, imported file, or AI response ever reaches the SQL string position.
- `node:sqlite` avoids a native `better-sqlite3` build dependency in CI and on developer machines.

---

## ADR-0003 — Portable core with platform adapters

**Status:** Accepted — 2026-07-19
**Context:** The user chose "Windows-first with a portable core." Independently, the highest-value and
highest-risk logic in SYSTEM — progression math, quest generation, integrity checks, the Architect's
rules engine — is exactly the logic that should never depend on a UI framework or a desktop shell.

**Decision:** `src/core/**` is framework-agnostic TypeScript with no React, Tauri, DOM, or browser
globals. All platform capability is reached through interfaces in `src/core/platform/`:
`StorageAdapter`, `FileAdapter`, `NotificationAdapter`, `SecretAdapter`, `ClockAdapter`,
`AudioAdapter`. Implementations live in `src/platform/tauri/**` and `src/platform/test/**`.
An ESLint boundary rule enforces the import direction.

**Consequences:**

- Domain logic is unit-testable in milliseconds with no desktop shell and no browser.
- A `ClockAdapter` makes time-dependent behaviour — streaks, decay, daily generation, recovery
  windows — deterministically testable instead of dependent on the wall clock.
- Cost: one indirection layer. Accepted deliberately and cheaply.
- A future Electron, web, or mobile target reimplements adapters, not the product.

---

## ADR-0004 — Architect: deterministic rules engine first, AI providers optional

**Status:** Accepted — 2026-07-19
**Context:** The Architect must feel intelligent and must work offline, with no API key, forever.
External AI is an enhancement the user may never enable, and personal data must never leave the
machine without explicit consent.

**Decision:** A three-layer design. (1) A deterministic local rules engine that is the sole guaranteed
path and is always sufficient for a complete experience. (2) A provider abstraction
(`ArchitectProvider`) with mock, local-rules, and pluggable external implementations. (3) A safety and
schema-validation layer that every generated artefact passes through regardless of origin.

**Consequences:**

- AI can be fully disabled with no loss of core function; this is the default state at first launch.
- Every AI-originated artefact is persisted with provenance so the user always knows what was machine-
  generated, and generated content is never silently indistinguishable from their own.
- External provider failures degrade to the rules engine rather than to an error state.
- Cost: the rules engine must be genuinely good, not a stub. This is treated as a first-class feature.

---

## ADR-0005 — Progression is multi-dimensional and derived, not awarded

**Status:** Accepted — 2026-07-19
**Context:** A single XP number cannot honestly represent a person. Running a timer must not make
someone a "master programmer," and one poor exam result must not erase months of genuine preparation.

**Decision:** Effort (XP), Mastery, Knowledge, Performance, Consistency, Momentum, Recovery, and Impact
are stored as separate dimensions with separate rules. **Attributes are derived, never directly
awarded** — an attribute value is a pure function of contributing skill mastery, domain XP, and
consistency, recomputed from the event log.

**Consequences:**

- Attributes cannot be farmed directly, because nothing writes to them.
- Any attribute value can be explained to the user by naming its contributing terms — which satisfies
  the transparency requirement structurally rather than by adding explanation text after the fact.
- Recomputation must stay fast; the event log is snapshotted periodically so replay is bounded.
- Formula changes are versioned, and historical snapshots record which formula version produced them,
  so a recalibration never silently rewrites the past.

---

## ADR-0006 — English-only strings behind an i18n layer from day one

**Status:** Superseded by ADR-0007 — 2026-07-19
**Context:** The product ships in English. The primary user is Brazilian and will likely want
Portuguese eventually. Retrofitting i18n across a large UI is expensive and error-prone.

**Decision:** All user-facing copy lives in typed message catalogues from the first commit, accessed
through a `t()` function. Only `en` exists initially. Generated content (quests, Architect messages)
carries an explicit locale field so it is never mistaken for a translatable static string.

**Consequences:** Small ongoing discipline cost; avoids a large and risky refactor later.

## ADR-0007 — Brazilian Portuguese as the default locale

**Status:** Accepted — 2026-07-20
**Context:** The primary and initial user is Brazilian. Shipping with English as the default asked
them to read their own lifelong record in a second language from the very first launch, which
contradicted the product's intent to feel personal rather than imported. ADR-0006 already put every
string behind `t()`, so the catalogue mechanism was ready; only the default and the second catalogue
were missing.

**Decision:** `pt-BR` is the default `Locale` (`src/i18n/index.ts`) and the default `ContentLocale`
for generated content such as quest templates and achievements (`src/core/content-locale.ts`).
English remains fully supported and selectable from Settings at any time; the choice persists as an
app preference. The two UI catalogues (`en.ts`, `pt-BR.ts`) are required to carry identical key
shapes, enforced by a test (`src/i18n/index.test.ts`) rather than by convention alone. Quest and
achievement content carries parallel English and Portuguese fields (`title`/`titlePt`, and so on)
resolved through `localizeTemplate`/`localizeAchievement`, kept independent of the UI catalogue
per ADR-0003 so the portable core never imports from `src/i18n`.

**Consequences:** Every future UI or content string must be authored in both languages before it can
land — the parity test fails the build otherwise. This is accepted as a small, permanent discipline
cost in exchange for the product reading naturally in the primary user's own language from day one.

## ADR-0008 — Quest lifecycle gains `detected` and `postponed` states

**Status:** Accepted — 2026-07-20
**Context:** The cinematic quest encounter (docs/GAME_SYSTEMS.md §9) needs to distinguish a quest the
rules engine has generated from one the user has actually been shown, so that restarting the app
never re-presents something already seen and decided on implicitly. The original schema
(migration 001) only distinguished `offered` onward — there was no way to record "generated but not
yet surfaced" independently of session state, so duplicate-presentation prevention would have had to
live in the React layer and would not have survived a restart. Postponing a quest also had no
distinct state from rejecting one, which quietly discarded the user's intent to decide later.

**Decision:** Migration 002 widens `quests.status` to include `detected` (generated, never yet shown
— the cinematic queue's source) and `postponed` (explicitly deferred, retained rather than deleted).
Presenting a quest is a persisted transition (`detected` → `offered`, stamping `presented_at`) rather
than a client-side flag, so the guarantee holds across restarts. SQLite cannot widen a `CHECK`
constraint in place, so the migration rebuilds the table via the documented twelve-step procedure
inside the migrator's existing transaction. Two free-text columns, `reflection_note` and
`evidence_note`, are added for optional completion-time notes — deliberately not the full structured
evidence system in `docs/DATA_MODEL.md`, which remains scoped to the mastery milestone (D-1/D-2).

**Consequences:** The quest state machine now has eight states instead of six; every consumer of
`quests.status` (repositories, dashboard queries, the Architect snapshot) must account for `detected`
being excluded from user-facing lists until presented. Migration tests cover the rebuild against a
populated migration-001 database to confirm no row is lost or reordered.

## ADR-0009 — Generation integrity: idempotent locking and a persisted workload budget

**Status:** Accepted — 2026-07-20
**Context:** A real development database, inspected while investigating a report of a "21 quests /
1,190 minutes" day, showed 21 quest rows inserted across **seven near-identical batches within 22
milliseconds**. The cause was `ensureTodayQuests`: a plain "read `getQuestsForDate`, and if empty,
generate" sequence. Because that is two separate `await` boundaries, several UI components mounting
at once — the shell's cinematic-encounter queue, Home, and Today all call into it independently on
mount — could each observe "no quests yet" before any of them finished inserting, and each then
generated its own batch. This was a correctness bug, not a workload-tuning problem: no amount of
adjusting how many quests a single generation call proposes fixes a race that calls generation
multiple times for the same day. Separately, neither `generateForDate` nor `recalibrateToday` ever
accounted for quests already committed to a day (accepted, postponed, completed) — a manual
recalibration, or in principle any second legitimate generation call, could keep adding a fixed count
on top of whatever already existed, with no ceiling.

**Decision:** `daily_generation_locks` (migration 003) gives every caller of `ensureTodayQuests` one
row to race for via `INSERT OR IGNORE`; only the caller whose insert actually lands (`changes = 1`)
proceeds to generate, and every other caller polls briefly for that quest to land rather than
generating an independent batch or flashing an empty day. `src/core/quests/workload-budget.ts`
introduces `computeDailyWorkloadBudget`, a single pure function used both by the generator (to cap
what it proposes) and by `generateForDate`/`recalibrateToday` (which now query
`getCommittedWorkload` first and feed it in) — so the ceiling on a day's total effort is a real
function of what already exists, not a number handed to `generateQuests` blindly. The budget also
caps primary quests at 3–5 and demanding/severe quests at one per day by default, calibrated
defaults rather than claimed universal truths. `daily_generation_plans` persists the budget breakdown
itself (available/planned/remaining minutes, mandatory/optional counts, overload flag) so it survives
recalibration and is explainable after a restart, not only at the moment of generation.

**Consequences:** `GenerationContext` gained optional `committedMinutes`/`committedPrimaryCount`/
`committedDemandingOrAbove` fields, defaulting to zero so every existing test and caller is
unaffected. A regression test (`tests/vertical-slice.test.ts`, "never generates duplicate batches
when several callers race on first load") reproduces the exact concurrency shape and was verified to
fail without the lock before the fix landed. The lock only guards *implicit* generation
(`ensureTodayQuests`); `recalibrateToday` is a deliberate user action and does not additionally
acquire it, which is an accepted residual gap — a double-click race there is far less likely and far
less severe than the automatic-mount race this ADR fixes.

## ADR-0010 — Duplicate and repetition control: template id as a deterministic fingerprint

**Status:** Accepted — 2026-07-20
**Context:** The same database that revealed the concurrency race (ADR-0009) also showed the same
handful of templates repeated many times — "Entregue uma Funcionalidade" seven times, "Circuito de
Manejo de Bola" four times — because nothing stopped the same template from being regenerated while
an earlier copy was still sitting undecided. The generator's existing `recentTemplateIds` scoring
only *penalises* recent reuse; with a small template pool for a given domain and strong goal
alignment, the penalty was not always enough to prevent an outright repeat within the same day.
Separately, `quests.template_id` was never persisted on the row itself — only inside the JSON
payload of the `QuestGenerated` event — so "is this template already active" was a matter of parsing
event history rather than an indexed column.

**Decision:** Migration 003 adds `quests.template_id` as a plain, indexed column. Because generation
is entirely template-based (no freeform AI content yet), a template id is already a deterministic
content fingerprint by construction — two quests sharing one are the same generated content, full
stop, with no similarity heuristic or hashing needed. `Repositories.getActiveTemplateIds` returns
every template id the user currently has `detected`/`offered`/`accepted`/`postponed` (i.e. not yet
finally decided), and `generateForDate` passes this to the generator as a new hard filter
(`excludedTemplateIds`) — a template already live is removed from the candidate pool entirely, not
merely down-ranked, consistent with how schedule feasibility and safety already work as hard filters
rather than scores. For pre-existing duplicates (including rows from before `template_id` existed),
`findDuplicateGeneratedQuests` groups by `(template_id, due_date)` — falling back to `(title,
due_date)` when `template_id` is `NULL` — among only `detected`/`offered`/`postponed` rows, keeps the
most recent copy, and reports the rest as redundant. `repairDuplicateQuests` archives them (migration
004 adds an `archived` status) rather than deleting them, and `SystemService` exposes both a
preview-only call and the applying call separately so the UI always shows what will change before
anything does, per `CLAUDE.md`'s prohibition on silently altering a user's history. Accepted,
completed, rejected, expired and user-created (`source = 'user'`) quests are never candidates for
either the hard filter or the repair.

**Consequences:** `getAllQuests` now excludes `archived` by default alongside the existing
`detected` exclusion, with an explicit status filter still able to reach it (the Missions "Archived"
grouping does this). A repeated template legitimately recurring across different days — the normal
case for a `repeatable` template — is unaffected, since the fingerprint includes the date. The
one-off maintenance run against the real development database (documented in `docs/CHANGELOG.md`)
archived 15 of 27 accumulated duplicate rows, leaving 6 genuinely distinct quests.

## ADR-0011 — Cinematic presentation budget: one modal per session

**Status:** Accepted — 2026-07-20
**Context:** `useQuestEncounterQueue` queued every `detected` quest behind its own modal encounter,
so a day with several newly generated quests — most visibly the batch right after onboarding —
could present multiple full-screen dialogs back to back. `docs/DESIGN_SYSTEM.md` §10 already
specified "at most one cinematic interruption per session unless the user opts into more," but
nothing enforced it; the previous session's `CURRENT_STATE.md` recorded this honestly as a known gap.

**Decision:** The hook now tracks whether the session's one modal slot has been spent
(`sessionBudgetSpent`, a ref so it survives re-renders without re-triggering effects). The first
`detected` quest of a session is shown as the modal encounter — full or compact variant, by
significance, unchanged from before. Every other quest, whether present at that moment or detected
later in the same session, is presented silently (marked `offered`, so it is immediately visible on
Today/Missions) and counted in a `preparedCount` surfaced as a one-line dismissible banner in the
shell ("N missões adicionais foram preparadas") linking to Missões for review, rather than becoming a
second dialog. `questEncounterMode = 'off'` (Settings' "Silent" option) is unchanged: everything is
presented immediately with no modal at all.

**Consequences:** `QuestEncounterQueueState` gained `preparedCount` and `dismissPreparedSummary`.
This is the first React hook in the codebase covered by an automated test
(`useQuestEncounterQueue.test.tsx`, using `@testing-library/react` and a jsdom environment enabled
per-file via `@vitest-environment jsdom`) rather than only by manual verification — a small step
against the "no end-to-end UI tests" gap recorded in `docs/TESTING.md`.

## ADR-0012 — Daily Protocol as a quest with first-class objectives, calibrated to a physical baseline

**Status:** Accepted — 2026-07-20
**Context:** The milestone brief asked for "Daily Protocol" as a first-class concept: one daily
mission with several measurable objectives (push-ups, squats, focused study minutes, and so on)
instead of many single-purpose quests, explicitly modelled on the satisfying clarity of a
progression-fantasy daily mission without copying any protected work's text, layout or assets. It
also required that any prescribed physical quantity come from the user's own baseline, never a fixed
extreme benchmark ("never automatically prescribe 100 push-ups, 100 squats, a 10 km run").

**Decision:** A Daily Protocol is not a new entity — it is a quest (`quest_type = 'daily_protocol'`,
added to `QUEST_TYPES`) whose content is several `quest_objectives` rows (migration 005) instead of
free-text steps. This deliberately reuses the entire existing quest lifecycle (accept, complete,
persist, restart-restore, XP award, history) rather than building a parallel entity and duplicating
all of that. The objective kind enum
(`repetitions`/`duration_seconds`/`distance_meters`/`quantity`/`checklist`/`numeric_score`/
`percentage`/`binary`) is deliberately smaller than the milestone's twelve enumerated types — see
`src/core/quests/objectives.ts` for why several of the twelve reduce to the same progress shape.
`protocolProgress` computes completion from mandatory objectives only, so an undone optional one
never blocks or dilutes completion — the same principle already applied to optional workload
elsewhere. Physical objective targets are calibrated at generation time via `calibratedTarget`: 80%
of a self-reported *comfortable* capacity (`physical_baseline`, migration 005, editable at any time
from Settings, never a one-time onboarding fact), or a conservative default when no baseline is set.
80%, not 100%, is deliberate — a daily protocol is meant to be repeatable, not a one-off maximal
test. One template, `protocol.foundation_cycle`, ships as the concrete proof of the model; the
generator selects and calibrates it exactly like any other template, competing on the same
scoring/diversity/budget rules from ADR-0009 rather than a separate assembly step.

**Consequences:** `QuestDetail` gained an `objectives` array; `QuestDetailPanel` shows an objective
checklist with independent progress controls (`ObjectiveList`) in place of the steps list whenever
objectives are present, and `SystemService.completeQuest`'s existing `completion` fraction parameter
— unchanged — is how a protocol's partial objective completion translates into partial XP, reusing
the progression formula's existing completion factor rather than a new proportional-reward pipeline.
**Explicitly deferred, and recorded in `docs/ROADMAP.md` rather than silently dropped:** the full
weekly-routine/availability capture (school hours, training days, upcoming tests) that would let
generation reason about *when* in the week a protocol fits, a dedicated Missions-page grouping
redesign into the eight buckets the milestone specified, the user-created-quest authoring flow with
deterministic Architect enhancement, and auto-deriving a quest's completion fraction from objective
progress in the completion dialog UI (the mechanism works end-to-end today, but the user currently
still chooses "full" or "partial" manually rather than the dialog computing it from objectives).

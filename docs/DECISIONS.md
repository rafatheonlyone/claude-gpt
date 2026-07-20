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

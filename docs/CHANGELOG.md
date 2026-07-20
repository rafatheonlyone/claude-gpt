# Changelog

Meaningful completed work. A change is listed only when it is genuinely done by
the definition in `CLAUDE.md` — not when a placeholder exists.

---

## 2026-07-20 — Query-scope consistency and duplicate-detection gaps (bugfix)

A focused repair, not a new milestone: after the previous entry's duplicate
repair ran, the real relaunched application still showed 21 quests for the
day with visibly repeated entries. This entry documents why, and closes it
for real. See ADR-0013 for the full architectural account.

### Root causes (three, all downstream of the previous repair, none in it)

- **`getQuestsForDate` — the query actually feeding Home/Today
  (`getDashboard`) — had no `archived` exclusion at all.** `getAllQuests`
  (Missions) had already been fixed to exclude `archived`; Home/Today read a
  completely different, still-unfiltered query. `getRecentGeneratedQuests`
  (the Architect page) had the same gap. Three surfaces, three different
  ideas of "today's quests," none agreeing with the repair that had already
  run against the database. This alone fully explains the reported "still 21
  quests" — the row-level repair was correct; nothing downstream of it was.
- **`findDuplicateGeneratedQuests` never considered an already-`accepted`
  sibling.** A group with one `accepted` row and one `postponed` row of
  identical content presented as a "group of one" among undecided statuses
  and was silently skipped. Confirmed live: two "Problema de Olimpíada"
  cards, one in progress, one still adiada, both surviving the first repair.
- **The same query excluded `expired` entirely.** Two rows generated
  together, identical in every respect, that both lapsed without ever being
  decided were invisible to it. Confirmed live: duplicate "Ball Handling
  Circuit," "Ship One Feature," and "Competition Problem" cards in Missions.

### The fix

- `src/core/app/repositories.ts`: named status-scope constants
  (`TODAY_STATUS_EXCLUSION`, `BROWSING_STATUS_EXCLUSION`,
  `WORKLOAD_ELIGIBLE_STATUSES`, `STATUS_CINEMATIC_ELIGIBLE`,
  `TEMPLATE_ACTIVE_STATUSES`) replace inline string literals repeated per
  query. A new `getVisibleQuestsForDate` (excludes only `archived`) is what
  `ensureTodayQuests` now returns; `getRecentGeneratedQuests` gained the same
  exclusion. `findDuplicateGeneratedQuests` now cross-references
  `accepted`/`completed` rows so an undecided sibling of a decided quest is
  always reported as redundant, and its candidate-status set grew to include
  `expired`.
- `src/features/quests/QuestsPage.tsx` and both locale files: the Missions
  status filter gained an `archived` option ("Arquivada"/"Archived") — the
  previous ADR's text claimed this was already reachable; the service layer
  supported it and was tested, but the dropdown never actually listed it.
- `repairDuplicateQuests` now writes a `DuplicateQuestsRepaired` event to the
  existing append-only event log on every run that archives something — a
  real audit trail in place of the one-off development script the previous
  repair used. The Settings "Verificar/Arquivar duplicatas" action is the
  only way to invoke it going forward.
- New regression coverage in `tests/vertical-slice.test.ts`: an 11-test
  `describe` block reproducing the exact real-database shape (5 templates,
  21 rows, the accepted-sibling case, and a dedicated case for a pair that
  both expired without ever being decided), asserting archived records never
  reach Today, workload, the cinematic queue, or the notification badge; that
  Missions shows them only via the explicit filter; that the repair is
  idempotent; and that relaunch and recalibration never resurrect them.

### Real-database verification

Verified against `C:\Users\rafin\AppData\Roaming\dev.system.app\system.db`
directly (SQLite queries) and through the live, cold-relaunched application
(Windows UI Automation driving real navigation and the real Settings action —
not a script): before this fix, 27 total rows (15 archived, 6 active for the
day, 6 expired-but-duplicated elsewhere). Running the corrected repair
through the Settings UI moved this to 19 archived, 5 genuinely active for the
day (250 minutes, matching the UI), and 3 distinct (no longer duplicated)
expired rows — 27 total throughout, nothing deleted, nothing regenerated.
Re-running the check afterward reports "Nenhuma duplicata encontrada." Two
full cold restarts (killing and relaunching the whole `tauri:dev` process
tree, not relying on Vite HMR) reproduced the same corrected counts with no
stale state. Selecting the new "Arquivada" filter in Missions surfaces
exactly 19 rows, matching the database exactly.

### Validation

`npm run typecheck`, `lint` (zero warnings), `test` (259 tests across 11
files, up from 247), `build`, and `cargo build` all pass.

---

## 2026-07-20 — Adaptive quest engine, Daily Protocols, generation integrity

Triggered by inspecting the real application and its real database rather than
trusting completion labels, as instructed: the quest system was not yet usable
for daily driving. This session fixed the root causes and shipped the first
real slice of adaptive planning.

### The bugs, as found

- **21 quests generated for one day, 1,190 minutes of proposed work.** The
  real cause: `ensureTodayQuests` was a plain "check then generate" — two
  separate `await` steps — so several UI components mounting at once (the
  shell's cinematic-encounter queue, Home, Today) could each observe "no
  quests yet" before any of them finished inserting, and each generated its
  own batch. The database showed 21 rows inserted across **7 batches within
  22 milliseconds**. Not a workload-tuning problem — a concurrency bug.
- **The same templates repeated many times** ("Entregue uma Funcionalidade"
  ×7, "Circuito de Manejo de Bola" ×4) — a direct consequence of the race:
  each racing batch independently re-scored and often re-picked the same
  top-aligned templates.
- **`domain.physical`, `domain.technical`, `rank.dormant` rendered literally**
  in the shipped Portuguese and English UI. Root cause: those keys were never
  added to *either* catalogue, so the existing en/pt-BR parity test passed —
  parity only catches asymmetric coverage, not a key missing from both.
- **The cinematic queue could present many dialogs in a row** — every
  `detected` quest queued behind its own modal, contradicting
  `docs/DESIGN_SYSTEM.md` §10's stated one-cinematic-per-session budget,
  which was recorded as a known gap in the previous session's `CURRENT_STATE.md`.

### Generation integrity (ADR-0009)

- `daily_generation_locks` (migration 003): an idempotency primitive claimed
  with `INSERT OR IGNORE` so exactly one of several racing callers generates
  for a date; everyone else polls briefly for that quest to land instead of
  generating an independent batch.
- `src/core/quests/workload-budget.ts`: a real daily workload budget —
  available time × recovery-adjusted utilisation, minus whatever the day
  already committed to (accepted/postponed/completed quests) — used by both
  the generator (as a hard cap during selection, not a score) and by
  `recalibrateToday` (which now reads committed workload before adding
  anything, so repeated recalibration can no longer stack a fixed count on
  top of an already-full day). Calibrated defaults: 3–5 primary quests, at
  most one demanding/severe quest, both easily retuned constants, not claimed
  universal truths.
- `daily_generation_plans` persists the budget breakdown itself so it remains
  explainable after a restart.

### Duplicate and repetition control (ADR-0010)

- `quests.template_id` (migration 003) is now a real, indexed column —
  previously only recoverable by parsing event-log JSON. Because generation
  is entirely template-based, a template id is already a deterministic
  content fingerprint; no similarity heuristic was needed.
- The generator hard-excludes any template already `detected`/`offered`/
  `accepted`/`postponed` for the user, rather than merely down-ranking recent
  reuse via the existing `variety` score term.
- `archived` status (migration 004) plus a preview-then-repair maintenance
  flow (`previewDuplicateQuestRepair`/`repairDuplicateQuests`, surfaced in
  Settings) identifies redundant generated duplicates — grouped by
  `(template_id, due_date)`, falling back to `(title, due_date)` for rows
  from before `template_id` existed — keeps the most recent copy, and
  archives the rest. Never touches accepted, completed, rejected, expired or
  user-created quests. Nothing is ever deleted.
- Run against the real development database: 21 accumulated duplicates found,
  15 archived, leaving 6 genuinely distinct quests (1 accepted, 5 postponed) —
  down from the reported 21-quest, 1,190-minute day.

### Cinematic presentation budget (ADR-0011)

- `useQuestEncounterQueue` now shows at most one modal encounter per session
  (full or compact, by significance); every other detected quest is presented
  silently and counted in a dismissible "N missões adicionais foram
  preparadas" banner linking to Missões, instead of becoming a second dialog.
  `questEncounterMode = 'off'` (Settings' Silent option) is unchanged.
- The first automated React test in the project
  (`useQuestEncounterQueue.test.tsx`), using `@testing-library/react` and a
  per-file jsdom environment — `@testing-library/react`/jsdom were already
  installed but unwired; `vite.config.ts`'s test glob now includes `.test.tsx`.

### Daily Protocol and first-class objectives (ADR-0012)

- A Daily Protocol is a quest (`quest_type = 'daily_protocol'`) whose content
  is several independently-progressable `quest_objectives` (migration 005)
  instead of free-text steps — reusing the entire existing quest lifecycle
  rather than a parallel entity.
- `src/core/quests/objectives.ts`: numeric objectives (repetitions, duration,
  distance, quantity, score, percentage) and zero/one objectives (checklist,
  binary); a protocol's completion is driven by mandatory objectives only, so
  an undone optional one never blocks it.
- `physical_baseline` (migration 005): editable at any time from Settings,
  self-reported *comfortable* capacity (push-ups, squats, plank seconds,
  training days/week). Physical objective targets calibrate to 80% of the
  relevant baseline value — sustainable, never a fixed extreme — falling back
  to a conservative default when unset. A template-level test asserts no
  baseline-linked objective ever carries a fixed numeric target in the
  template itself, the exact failure mode the milestone forbade (100
  push-ups, 100 squats, a 10 km run as defaults).
  One template, `protocol.foundation_cycle`, ships as the concrete proof of
  the model.
- `QuestDetailPanel` shows an objective checklist (`ObjectiveList`) with
  independent progress controls in place of the steps list whenever
  objectives are present. `QuestCard` marks protocol quests with a small tag.

### Localization fix

- Added the missing `domain.*` (8 entries) and `rank.*` (8 entries) to both
  catalogues, using natural Brazilian Portuguese (Físico, Acadêmico,
  Adormecido, ...) and confirmed against a real launch of the app.
- Added a dedicated leak-prevention test that enumerates every
  dynamically-interpolated key space actually used in the UI against the real
  `Domain`/`Rank`/etc. value sets, so a key missing from *both* catalogues
  fails the build instead of shipping.

### Validation

`npm run typecheck`, `lint` (zero warnings), `test` (247 tests across 11
files, up from 140), `build`, and `cargo build` all pass. The real Tauri
desktop app was launched twice — once against a database migrated and
repaired by a one-off script (after correcting a self-inflicted checksum
mismatch from that script omitting SQL comments present in the real
migration file, which the tamper-detection system correctly caught), and
once as a from-scratch launch — and screenshotted directly (`PrintWindow`),
confirming `ACADÊMICO`/`Adormecido` render correctly and the dashboard shows
one reasonable quest instead of the previous duplicate pile.

### Known incomplete, recorded honestly

Full weekly routine/availability capture (school hours, training days,
upcoming tests), the Missions page's eight-bucket grouping redesign, the
user-created-quest authoring flow with Architect enhancement, auto-deriving a
quest's completion fraction from objective progress in the completion
dialog, and an Architect-facing plain-language rendering of the persisted
generation plan are all specified, tracked in `docs/ROADMAP.md`, and not yet
built. See ADR-0012's consequences section for the reasoning behind each.

## 2026-07-20 — Brazilian Portuguese localization and multi-page desktop shell

A prior session's work was recovered from an interrupted checkpoint (`WIP:
Portuguese UI and multi-page shell`), finished, validated, and documented.
`npm run verify` now passes cleanly and the real Tauri desktop app was launched
and screenshotted directly to confirm the rendered result.

### Localization (ADR-0007)

- `pt-BR` is now the default UI locale and the default content locale for
  generated quests and achievements; English remains fully selectable from
  Settings and persists as a preference.
- Second full message catalogue (`src/i18n/pt-BR.ts`) added alongside a
  restructured `en.ts`; a test enforces identical key shapes between the two so
  a missing translation fails the build rather than surfacing as a raw key.
- Quest templates and achievement definitions carry parallel English/Portuguese
  fields, resolved through `localizeTemplate` / `localizeAchievement`, kept
  independent of the UI catalogue so the portable core stays framework- and
  presentation-free.
- Closed a gap the recovery pass found: `Onboarding.tsx`'s focus-tag labels and
  its default-display-name fallback were still hard-coded English literals,
  left over from before the i18n catalogue existed. Both now resolve through
  `t()` with matching `en`/`pt-BR` entries.

### Multi-page desktop shell

- Replaced the single-screen dashboard with a real shell: sidebar navigation,
  top bar with live level/XP/rank and a pending-encounter badge, and seven
  routed pages (Central de Comando, Hoje, Missões, Status, Conquistas,
  Arquiteto, Configurações) plus honest "coming soon" stubs for Habilidades,
  Chefes and Linha do Tempo that state plainly what is deferred rather than
  faking content.
- Sidebar collapse state persists as an app preference; all navigation is
  keyboard-reachable with visible focus states.

### Cinematic quest encounter and lifecycle (ADR-0008)

- Migration 002 widens `quests.status` with `detected` (generated, not yet
  shown) and `postponed` (deferred, retained). Presenting a quest is a
  persisted transition, not client state, so a restart can never cause a quest
  to be cinematically re-presented as new.
- New encounter overlay ("NOVA MISSÃO DETECTADA" / "Deseja aceitar esta
  missão?") with full and compact variants by quest significance, a live
  queue counter, `Esc`-to-dismiss, full keyboard focus trapping, and reduced
  motion / muted-sound handling driven by the same settings as the rest of the
  app.
- Quest completion dialog captures an optional reflection and evidence note
  (`reflection_note`, `evidence_note` — free text, deliberately not the full
  structured evidence system reserved for the mastery milestone) and shows the
  real credited XP from the same transactional path `system-service.ts`
  already used.

### Settings

- Every visible control (language, sound on/off, four independent volume
  sliders, animation intensity, performance mode, quest-presentation
  frequency) persists through `setAppPreference` / `setProfilePreference` /
  `setLocalePreference` and was traced to confirm none are cosmetic-only.

### Recovery and validation

The WIP checkpoint had seven small integration breaks left from the session
that was interrupted by a usage limit: four implicit-`any` errors from an
under-typed `Promise.all` fallback in `App.tsx`, an `exactOptionalPropertyTypes`
violation in `QuestCompletionDialog`, two `readonly`-property mutations in
`QuestsPage`, and one `react-refresh` lint warning tripping `--max-warnings 0`.
All were genuine typos/omissions rather than design problems and are now
fixed. Also found and fixed: `useQuestActions`'s `error` state was tracked but
never rendered anywhere, so a failed accept/decline/postpone silently produced
no user-visible feedback — every page using it now surfaces
`quest.actionError`.

`npm run typecheck`, `lint`, `test` (140 tests, 8 files), `build`, and
`cargo build` all pass. The real desktop app was launched via `npm run
tauri:dev` and its window captured directly (`PrintWindow`, not a browser),
confirming the Portuguese default, live quest data, and the cinematic
encounter all render correctly against production `rusqlite`.

### Known incomplete, carried forward honestly

Full interactive click-through of the desktop app (accept/complete/restart via
real simulated mouse input) was not performed this session — the window could
not be reliably brought to the OS foreground without risking sending input to
an unrelated window on the live desktop. The 41-test vertical slice covers the
same interaction logic at the service layer. `docs/DESIGN_SYSTEM.md` §10's
"at most one cinematic interruption per session" is not literally enforced —
the encounter queue will cinematically present every `detected` quest in
sequence (compact variant for routine ones), which is most visible right after
onboarding's initial batch generation. Tracked in `ROADMAP.md`. Mastery,
attributes, ranks, classes, bosses, analytics, focus mode, AI providers,
export/deletion and integrity detection remain specified but not implemented,
as before.

## 2026-07-19 — Foundation and first vertical slice

The project went from an empty repository to a launching desktop application
with a complete, verified progression loop.

### Environment and architecture

- Verified toolchain from scratch: installed Rust 1.97.1 and MSVC Build Tools
  17.14 with Windows SDK 10.0.26100, then **compiled, linked and ran a binary
  before accepting the architecture** rather than assuming it would work.
- Confirmed WebView2 150.0.4078.83 already present, removing Tauri's main
  deployment risk.
- Recorded six ADRs (`docs/DECISIONS.md`) covering the desktop shell,
  persistence strategy, portable-core boundary, Architect layering,
  multi-dimensional progression and i18n.

### Documentation

- Created `CLAUDE.md` and 15 documents in `docs/`, including the full design
  system, game systems with published formulas, data model, Architect
  specification, security and privacy posture, and testing strategy.

### Desktop shell

- Tauri 2 + React 19 + TypeScript 5.8 + Vite 7.
- Rust host with a deliberately narrow, parameterised-only SQL bridge over
  `rusqlite`, plus backup, integrity check and app-path commands.
- Strict CSP with no remote origins; minimal webview capability set.
- Window created hidden and revealed after first paint, avoiding a white flash.

### Persistence

- Migration system with checksum tamper detection, transactional rollback and
  refusal to run against a newer schema.
- Migration 001: 24 tables split between append-only truth (`events`,
  `evidence`, `audit_log`) and rebuildable projections.

### Progression

- Level curve calibrated so level ~100 represents roughly ten years of sustained
  work, uncapped and with no history-erasing reset.
- XP awards combining difficulty, evidence, completion and integrity, with
  logarithmic per-domain daily diminishing returns that are **order-independent**
  — so splitting work into many entries can never out-earn recording it honestly.
- Partial completion floor: attempting and falling short always beats not trying.

### Quest engine

- Deterministic seeded rules engine: hard filters first (safety, injuries,
  exclusions, schedule feasibility), then relevance scoring, then diversity, then
  a workload clamp.
- 33 quest templates across all eight domains, tuned to the initial user's actual
  interests, each carrying purpose, steps and safety metadata.
- Generation is stable per user per day, so reopening the app never rerolls.

### Achievements and feedback

- 16 achievements, including hidden ones that reward honest partial reporting and
  returning after time away.
- Deliberately no achievement for a seven-day week — rewarding a perfect streak
  would be rewarding the absence of rest.
- Procedural audio engine: 10 synthesised sounds, zero asset files.

### Interface

- Cinematic six-step onboarding, dashboard, quest cards with "why this?"
  disclosure, level bar, level-up moment, rarity-scaled achievement toasts.
- Full design token system with four animation-intensity levels and a
  performance mode; OS reduced-motion preference honoured on first run.
- All copy behind a typed i18n catalogue from the first commit.

### Verification

- 90 tests passing across formulas, migrations, generation and a full
  service-layer slice including restart restoration.
- Lint-enforced architecture boundaries: `src/core` cannot import React, Tauri
  or the DOM.
- Application launched and inspected live: migrations applied through
  `rusqlite`, `integrity_check: ok`, WAL enabled, foreign keys on, 16
  achievements seeded, host process at 38.5 MB.

### Known incomplete

Recorded honestly in `docs/CURRENT_STATE.md`: mastery, attributes, ranks,
classes, bosses, analytics, focus mode, AI providers, export/deletion and the
integrity detection logic are specified but not implemented. The application
icon is still the Tauri placeholder and blocks release.

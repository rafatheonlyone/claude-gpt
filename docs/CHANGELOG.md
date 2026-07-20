# Changelog

Meaningful completed work. A change is listed only when it is genuinely done by
the definition in `CLAUDE.md` — not when a placeholder exists.

---

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

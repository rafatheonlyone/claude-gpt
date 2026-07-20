# Current State

**Updated:** 2026-07-20
**Schema version:** 5
**Tests:** 247 passing (11 files)
**Build:** ✅ typecheck, lint (zero warnings), test, `vite build`, `cargo build` all pass
**Desktop app:** ✅ launched via `npm run tauri:dev` against the real (previously
buggy, now repaired) development database; window captured directly
(`PrintWindow`) to confirm the rendered result against production `rusqlite`

This document describes what **actually works**, not what is planned. A feature
appears under "Working" only if a user can reach it and it persists correctly.

---

## Working end to end

The vertical slice, Brazilian Portuguese localization, the multi-page desktop
shell, and — new this session — an adaptive quest engine with generation
integrity, duplicate control, and Daily Protocols are all complete and verified:

**First launch → onboarding (Portuguese by default) → multi-page shell →
budget-aware quest generation → single cinematic encounter (rest prepared
silently) → accept → complete (proportional to objective progress, for a
Daily Protocol) → XP → level → achievement unlock → persistence → restart →
state restored → settings change → restart → restored.**

| Area                        | Status | Notes                                                                                          |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| Tauri 2 desktop shell         | ✅     | Compiles, launches, window revealed after first paint                                            |
| SQLite persistence            | ✅     | `rusqlite` in Rust; schema/migrations/repositories in TypeScript. Schema version 5                |
| Migration system               | ✅     | Checksum tamper detection, transactional rollback, newer-schema guard, 001→002→003→004→005 rebuilds verified |
| Level curve                    | ✅     | Uncapped, calibrated to ~level 100 at ten years. 15 tests                                         |
| XP awards                      | ✅     | Difficulty, evidence, completion, integrity factor, diminishing returns. 19 tests                 |
| Quest generation               | ✅     | Deterministic rules engine, 32 templates (English + Portuguese) including one Daily Protocol, hard safety filters. 33 tests |
| **Daily workload budget**      | ✅     | Real function of available time, recovery, and what the day already committed to — never a fixed count added blindly (ADR-0009). 11 tests |
| **Generation concurrency safety** | ✅ | `daily_generation_locks` makes `ensureTodayQuests` idempotent across racing callers — fixes a real bug that produced 21 quests/1,190 minutes for one day. Regression test verified to fail without the fix |
| **Hard duplicate exclusion**   | ✅     | Template id as a deterministic content fingerprint; a template already active is removed from candidates, not down-ranked (ADR-0010) |
| **Duplicate repair**           | ✅     | Preview-then-archive maintenance flow in Settings; never deletes, never touches accepted/completed/user quests. Fixed 21 pre-existing duplicates in the real dev database |
| **Daily Protocol + objectives** | ✅    | First-class, independently-progressable objectives on any quest; physical targets calibrated to 80% of an editable baseline, never a fixed extreme (ADR-0012) |
| **Physical baseline**          | ✅     | Editable in Settings at any time; push-ups/squats/plank/frequency, each independently optional |
| Achievements                   | ✅     | 16 definitions, evaluation engine, presentation ordering, localized                                |
| Onboarding                     | ✅     | 6 cinematic steps, fully localized (Portuguese default), keyboard accessible                       |
| **Brazilian Portuguese default** | ✅  | `pt-BR` is the default UI and content locale (ADR-0007); English fully selectable and persists    |
| **i18n catalogue parity + leak prevention** | ✅ | `en`/`pt-BR` enforced identical by test, *and* every dynamically-interpolated key space used in the UI is asserted to resolve to real copy in both locales — closes the gap that let `domain.*`/`rank.*` ship as raw keys despite passing parity |
| **Multi-page shell**           | ✅     | Sidebar + top bar + 7 routed pages; collapse state persists; fully keyboard reachable              |
| **Central de Comando (Home)**  | ✅     | Priority quest, progression, today's count, recent achievement, Architect entry point              |
| **Hoje (Today)**               | ✅     | Filterable quest list (all/active/available/completed), daily progress bar                        |
| **Missões (Quests)**           | ✅     | Search, domain/status filters, sort, master-detail with routed quest IDs, objective checklist in detail |
| **Status**                     | ✅     | Level, rank, XP, age (derived, never stored), domains breakdown                                    |
| **Conquistas (Achievements)**  | ✅     | Tabs, search, secret-achievement redaction until unlocked                                          |
| **Arquiteto (Architect)**      | ✅     | Current recommendation, recent quests, recalibrate action, offline/privacy statement (no AI wired) |
| **Configurações (Settings)**   | ✅     | Language, sound + 4 volumes, animation intensity, performance mode, quest-presentation frequency, backup, duplicate-quest maintenance, physical baseline — every control traced to real persistence |
| **Cinematic quest encounter**  | ✅     | One modal per session (full/compact by significance), everything else prepared silently with a dismissible summary banner (ADR-0011); `Esc` dismiss, focus trap, reduced-motion + mute aware |
| **Quest lifecycle persistence**| ✅     | `detected → offered → accepted/completed/rejected/postponed/archived`; presenting a quest is a DB transition, so restart never re-presents it (ADR-0008, ADR-0010) |
| Quest completion dialog        | ✅     | Optional reflection + evidence note (free text), real XP shown, transactional. For a Daily Protocol, `completion` accepts any fraction (proportional XP verified by test) — the dialog itself still offers only full/partial rather than reading objective progress automatically |
| Achievement toasts             | ✅     | Rarity-scaled presentation, queued, auto-dismiss, screen-reader announced                          |
| Level-up moment                | ✅     | Centre flash, sound, polite live-region announcement                                               |
| Procedural audio                | ✅     | 10 synthesised sounds, zero asset files, channel volumes, mute — all Settings-driven               |
| Design tokens                   | ✅     | Full token set, animation intensity, performance mode                                              |
| Reduced motion                  | ✅     | OS preference honoured on first run, four intensity levels, drives particles per DESIGN_SYSTEM §6  |
| Error boundaries                | ✅     | Per-region, state explicitly that no data was written                                              |
| Quest action error feedback     | ✅     | Accept/decline/postpone failures surface `quest.actionError` instead of failing silently            |
| Event log                       | ✅     | Append-only, formula version recorded on every awarding event                                       |

## Partially implemented

| Area             | What exists                                                                         | What is missing                                                          |
| ---------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Integrity engine | `integrityFactor` is plumbed through XP calculation; `integrity_flags` table exists | No detection logic yet — nothing currently produces a verdict              |
| Domain state     | Written on completion; `domain_daily_xp` drives diminishing returns                  | `consistency` and `momentum` columns are never populated                   |
| Ranks            | Naming, table columns, and gate design documented                                    | Gate evaluation and rank trials not implemented; every user is `dormant`   |
| Backup           | Rust `db_backup` command works, Settings has a manual "back up now" button           | No scheduling, no retention policy                                         |
| Notifications    | Adapter interface + Tauri stub                                                       | `isPermitted()` returns `false` honestly; no OS notifications delivered    |
| Secrets          | Adapter interface + Tauri stub                                                       | `set()` throws rather than falling back to insecure storage                |
| Routine calibration | Physical baseline is real, persisted, editable, and drives objective calibration | The weekly-schedule half (school hours, training days, upcoming tests, current projects) from the milestone brief is not built — generation still only knows `availableMinutes`, not *when* in the week |
| Architect explanations | The full budget breakdown (`daily_generation_plans`, ADR-0009) is persisted every generation | No screen renders it as a plain-language sentence yet ("Hoje foram planejadas quatro missões...") |
| Missions page grouping | Search/filter/sort and a real detail panel with objectives | Not yet regrouped into the eight-bucket structure (Today/Active/Protocol/Main/Optional/Upcoming/Completed/Archived) the milestone specified |

## Specified but not implemented

These are fully designed in the docs and deliberately deferred — **not abandoned.**
Each is tracked in `ROADMAP.md`.

- Mastery and skill state (schema exists, no logic)
- Derived attributes (schema exists, no computation)
- Skill trees (Habilidades page is an honest "coming soon" stub)
- Classes and class evolution (types only)
- Bosses (Chefes page is an honest "coming soon" stub; needs a future migration)
- Life arcs, campaigns, quest chains
- Analytics and timeline (Linha do Tempo page is an honest "coming soon" stub)
- Focus mode
- Inventory
- AI provider layer (rules engine works standalone, as designed; Architect page states this plainly)
- Export, import, deletion
- Optional encryption at rest
- Historical snapshots
- User-created quest authoring flow with deterministic Architect enhancement
- Progressive-overload adjustment of physical baseline targets over time (today's calibration is a
  fixed 80%-of-stated-baseline, itself a real function of the user's own numbers, not adaptive yet)

## Known issues and honest caveats

1. **The application icon is still the default Tauri artwork.** It is a
   placeholder and must be replaced with an original SYSTEM mark before any
   release. Tracked as the first Phase D task.
2. **Fonts are not bundled.** The CSS requests Inter and JetBrains Mono and
   falls back to Segoe UI Variable and Consolas on Windows. This looks correct
   on the target machine but is not yet deterministic across systems.
3. **`npm run dev` alone shows a "desktop required" screen.** The database lives
   in the Rust host, so the frontend cannot run standalone in a browser. Use
   `npm run tauri:dev`.
4. **Tests use `node:sqlite`; production uses `rusqlite`.** Both satisfy the same
   `StorageAdapter` contract and the schema is identical, but they are different
   engines. The real path was re-verified this session against the actual
   development database (see `TESTING.md`).
5. **Automated React coverage is real but small.** `useQuestEncounterQueue.test.tsx`
   is the first automated React test in the project (jsdom + `@testing-library/react`,
   wired up this session — both were installed but unused before). No component has
   render-level coverage yet, and there is still no true end-to-end click-through
   test; this remains the largest testing gap.
6. **Onboarding is not resumable across restarts.** Answers are held in component
   state until activation. The `onboarding_responses` table exists for this but
   is not yet written to.
7. **Full interactive desktop click-through was not performed this session either.**
   The app was launched twice, confirmed live and correctly rendered against the
   real (bug-fixed and repaired) database, and screenshotted directly with
   `PrintWindow`, but simulated mouse clicks were deliberately not sent because the
   window could not be reliably brought to the OS foreground without risking
   interference with other windows on the live desktop. The interaction logic
   itself is covered by the 58-test vertical slice instead, including a
   concurrency regression test verified to fail without its fix.
8. **Quest generation ignores recovery state in practice.** The generator fully
   supports it and is tested, but nothing yet tracks recovery, so it always
   passes `'unknown'`.
9. **The Daily Protocol completion fraction is not yet auto-derived in the UI.**
   `completeQuest`'s `completion` parameter already produces correctly
   proportional XP from any fraction supplied (tested), but the completion
   dialog still asks the user to choose "full" or "partial" manually rather
   than computing the fraction from actual objective progress.
10. **One template proves the Daily Protocol model, not a library of them.**
    `protocol.foundation_cycle` is real, generated, calibrated and completable
    end-to-end — but it is currently the only Daily Protocol template.

---

## Recommended next task

**Implement mastery and derived attributes (Phase D-1).**

This remains the highest-value next step because it is the load-bearing distinction in
the entire product: XP currently exists alone, which makes SYSTEM temporarily
resemble the "effort equals skill" model that `GAME_SYSTEMS.md` §1 explicitly
rejects. Until mastery exists, completing quests is the only signal, and that is
precisely the conflation the design is built to avoid. Nothing discovered while
fixing the quest engine's generation-integrity bugs changed this priority — every
bug found this session (the concurrency race, the missing workload ceiling, the
weak duplicate control, the translation-key gap) was a correctness defect in
already-specified behaviour, not evidence that a different structural priority
should come first. If anything, the new `reflection_note`/`evidence_note`
columns and the first-class objective model built this session give mastery a
noticeably stronger evidence substrate to build on than before.

Concretely:

1. Add richer `evidence` capture to quest completion (artefact, metric, or
   result) — `reflection_note`/`evidence_note` (migration 002) and, for a
   Daily Protocol, actual objective progress (migration 005) already give a
   real starting point; the structured evidence system in `DATA_MODEL.md` is
   the next layer on top, not a replacement.
2. Implement `masteryGain` from `GAME_SYSTEMS.md` §4, including peak tracking.
3. Implement decay with the 30-day grace and 60 %-of-peak floor, driven by
   `ClockAdapter` so it is testable.
4. Implement derived attribute computation (ADR-0005) with the contribution
   breakdown persisted to `attribute_state.contributions`.
5. Seed the skill and attribute registries plus their weight mappings.
6. Surface mastery on the dashboard and the Status page, distinct from level,
   with the "how was this calculated" disclosure. Status already has a
   `status.attributesSection` placeholder area waiting for this.

Tests required: mastery gain curve, decay boundaries, peak permanence, attribute
derivation determinism, and a regression test that attributes cannot be written
directly.

**Smaller, non-blocking follow-ups** (do not need to precede D-1, but should not
be forgotten — see `ROADMAP.md` cross-cutting table): the weekly routine/
availability capture, the Missions page's eight-bucket grouping redesign, the
user-created-quest authoring flow, auto-deriving completion fraction from
objective progress in the completion dialog, an Architect-facing rendering of
the persisted generation plan, replacing the placeholder app icon, bundling
fonts, and Playwright end-to-end coverage.

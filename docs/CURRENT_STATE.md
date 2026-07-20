# Current State

**Updated:** 2026-07-19
**Schema version:** 1
**Tests:** 90 passing (5 files)
**Build:** ✅ typecheck, lint, test, `vite build`, `cargo build` all pass

This document describes what **actually works**, not what is planned. A feature
appears under "Working" only if a user can reach it and it persists correctly.

---

## Working end to end

The first vertical slice is complete and verified:

**First launch → onboarding → quest generation → accept → complete → XP → level →
achievement unlock → persistence → restart → state restored.**

| Area                  | Status | Notes                                                                             |
| --------------------- | ------ | --------------------------------------------------------------------------------- |
| Tauri 2 desktop shell | ✅     | Compiles, launches, window revealed after first paint                             |
| SQLite persistence    | ✅     | `rusqlite` in Rust; schema/migrations/repositories in TypeScript                  |
| Migration system      | ✅     | Checksum tamper detection, transactional rollback, newer-schema guard             |
| Level curve           | ✅     | Uncapped, calibrated to ~level 100 at ten years. 15 tests                         |
| XP awards             | ✅     | Difficulty, evidence, completion, integrity factor, diminishing returns. 19 tests |
| Quest generation      | ✅     | Deterministic rules engine, 33 templates, hard safety filters. 24 tests           |
| Achievements          | ✅     | 16 definitions, evaluation engine, presentation ordering                          |
| Onboarding            | ✅     | 6 cinematic steps, resumable within session, keyboard accessible                  |
| Dashboard             | ✅     | Level bar, stats, quest cards, rationale disclosure                               |
| Quest lifecycle       | ✅     | Accept, decline, complete, partial complete                                       |
| Achievement toasts    | ✅     | Rarity-scaled presentation, queued, auto-dismiss, screen-reader announced         |
| Level-up moment       | ✅     | Centre flash, sound, polite live-region announcement                              |
| Procedural audio      | ✅     | 10 synthesised sounds, zero asset files, channel volumes, mute                    |
| Design tokens         | ✅     | Full token set, animation intensity, performance mode                             |
| Reduced motion        | ✅     | OS preference honoured on first run, four intensity levels                        |
| i18n scaffold         | ✅     | All copy in a typed catalogue; `en` only                                          |
| Error boundaries      | ✅     | Per-region, state explicitly that no data was written                             |
| Event log             | ✅     | Append-only, formula version recorded on every awarding event                     |

## Partially implemented

| Area             | What exists                                                                         | What is missing                                                          |
| ---------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Integrity engine | `integrityFactor` is plumbed through XP calculation; `integrity_flags` table exists | No detection logic yet — nothing currently produces a verdict            |
| Domain state     | Written on completion; `domain_daily_xp` drives diminishing returns                 | `consistency` and `momentum` columns are never populated                 |
| Ranks            | Naming, table columns, and gate design documented                                   | Gate evaluation and rank trials not implemented; every user is `dormant` |
| Backup           | Rust `db_backup` command works                                                      | No scheduling, no UI, no retention policy                                |
| Notifications    | Adapter interface + Tauri stub                                                      | `isPermitted()` returns `false` honestly; no OS notifications delivered  |
| Secrets          | Adapter interface + Tauri stub                                                      | `set()` throws rather than falling back to insecure storage              |

## Specified but not implemented

These are fully designed in the docs and deliberately deferred — **not abandoned.**
Each is tracked in `ROADMAP.md`.

- Mastery and skill state (schema exists, no logic)
- Derived attributes (schema exists, no computation)
- Skill trees
- Classes and class evolution (types only)
- Bosses (needs migration 002)
- Life arcs, campaigns, quest chains
- Analytics and timeline
- Focus mode
- Inventory
- AI provider layer (rules engine works standalone, as designed)
- Export, import, deletion
- Optional encryption at rest
- Historical snapshots

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
   engines. The real path was verified by launching the app and confirming
   migrations applied against `rusqlite`.
5. **No end-to-end UI tests yet.** The vertical slice is covered at the service
   layer; the React layer has no automated coverage. This is the largest testing
   gap and is the next testing priority.
6. **Onboarding is not resumable across restarts.** Answers are held in component
   state until activation. The `onboarding_responses` table exists for this but
   is not yet written to.
7. **Quest generation ignores recovery state in practice.** The generator fully
   supports it and is tested, but nothing yet tracks recovery, so it always
   passes `'unknown'`.

---

## Recommended next task

**Implement mastery and derived attributes (Phase D-1).**

This is the highest-value next step because it is the load-bearing distinction in
the entire product: XP currently exists alone, which makes SYSTEM temporarily
resemble the "effort equals skill" model that `GAME_SYSTEMS.md` §1 explicitly
rejects. Until mastery exists, completing quests is the only signal, and that is
precisely the conflation the design is built to avoid.

Concretely:

1. Add `evidence` capture to quest completion (artefact, metric, or result).
2. Implement `masteryGain` from `GAME_SYSTEMS.md` §4, including peak tracking.
3. Implement decay with the 30-day grace and 60 %-of-peak floor, driven by
   `ClockAdapter` so it is testable.
4. Implement derived attribute computation (ADR-0005) with the contribution
   breakdown persisted to `attribute_state.contributions`.
5. Seed the skill and attribute registries plus their weight mappings.
6. Surface mastery on the dashboard, distinct from level, with the "how was this
   calculated" disclosure.

Tests required: mastery gain curve, decay boundaries, peak permanence, attribute
derivation determinism, and a regression test that attributes cannot be written
directly.

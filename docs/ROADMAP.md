# Roadmap

Status values: ✅ complete · 🔄 in progress · ⬜ not started

Nothing in this document is optional-by-omission. Requirements deferred from the
original specification are recorded here explicitly so they are never silently
dropped.

---

## Phase A — Discovery and architecture ✅

| Item                                                                     | Status      |
| ------------------------------------------------------------------------ | ----------- |
| Inspect environment, runtimes, toolchains                                | ✅          |
| Install and **verify** Rust + MSVC toolchain (compiled and ran a binary) | ✅          |
| Evaluate shell options, choose Tauri 2 on evidence                       | ✅ ADR-0001 |
| Choose persistence strategy                                              | ✅ ADR-0002 |
| Define portable-core boundary                                            | ✅ ADR-0003 |
| Define Architect layering                                                | ✅ ADR-0004 |
| Define multi-dimensional progression                                     | ✅ ADR-0005 |
| Define i18n strategy                                                     | ✅ ADR-0006 |
| Permanent project memory (`CLAUDE.md` + `docs/`)                         | ✅          |
| Data model                                                               | ✅          |
| Design system                                                            | ✅          |
| Core progression formulas                                                | ✅          |

## Phase B — Executable foundation ✅

| Item                                                   | Status                          |
| ------------------------------------------------------ | ------------------------------- |
| Builds, launches, packages configuration               | ✅                              |
| Local SQLite persistence with migrations               | ✅                              |
| Design tokens and theming                              | ✅                              |
| Error boundaries                                       | ✅                              |
| Test infrastructure (Vitest + real SQLite)             | ✅                              |
| Development scripts (`verify` gate)                    | ✅                              |
| Lint-enforced architecture boundaries                  | ✅                              |
| Windows installer configuration (NSIS/MSI targets set) | 🔄 configured, not yet produced |

## Phase C — First vertical slice ✅

First launch → onboarding → profile → dashboard → quest → accept → complete →
XP → level → achievement → persistence → restart → restore. All 16 steps verified.

## Phase C.5 — Localization and multi-page shell ✅

Brazilian Portuguese as the default locale with English fully selectable
(ADR-0007); the single-screen dashboard replaced with a routed multi-page
shell (Central de Comando, Hoje, Missões, Status, Conquistas, Arquiteto,
Configurações); the cinematic quest encounter with a persisted `detected` →
`offered` lifecycle so restarts never re-present a quest (ADR-0008); every
Settings control genuinely wired and persisted. See `CHANGELOG.md` 2026-07-20.

## Phase D — Expansion ⬜

Ordered by dependency and value. D-1 is the current recommended task.

| #    | Module                                      | Status | Why here                                                                                                                 |
| ---- | ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| D-1  | **Mastery + derived attributes**            | ⬜     | The load-bearing distinction of the product. Until it exists, XP stands alone and effort is indistinguishable from skill |
| D-2  | Evidence capture                            | ⬜     | Prerequisite for mastery being meaningful                                                                                |
| D-3  | Skills registry + skill trees               | ⬜     | Depends on mastery                                                                                                       |
| D-4  | Integrity engine (detection logic)          | ⬜     | Needs enough history to detect patterns against                                                                          |
| D-5  | Consistency + momentum                      | ⬜     | Needs a meaningful activity history                                                                                      |
| D-6  | Ranks + rank trials                         | ⬜     | Gates depend on mastery, consistency and milestones                                                                      |
| D-7  | Classes + evolution                         | ⬜     | Inference depends on domain distribution                                                                                 |
| D-8  | Bosses (migration 002)                      | ⬜     | Large, self-contained, high user value                                                                                   |
| D-9  | Focus mode                                  | ⬜     | Self-contained                                                                                                           |
| D-10 | Analytics + timeline                        | ⬜     | Needs history to display                                                                                                 |
| D-11 | Life arcs + campaigns                       | ⬜     | Depends on classes and analytics                                                                                         |
| D-12 | Inventory                                   | ⬜     | Lower value; deliberately late                                                                                           |
| D-13 | Backup scheduling, export, import, deletion | ⬜     | Required before real long-term use                                                                                       |
| D-14 | Notifications (OS permission flow)          | ⬜     | Stub currently reports `false` honestly                                                                                  |
| D-15 | AI provider layer + secure credentials      | ⬜     | Optional by design; rules engine ships complete                                                                          |
| D-16 | Visual evolution by rank, auras, themes     | ⬜     | Depends on ranks                                                                                                         |
| D-17 | Optional encryption at rest (SQLCipher)     | ⬜     | Deferred; documented in SECURITY_AND_PRIVACY                                                                             |
| D-18 | Historical snapshots + retrospectives       | ⬜     | Depends on analytics                                                                                                     |

## Cross-cutting, always outstanding

| Item                                                           | Status                   |
| -------------------------------------------------------------- | ------------------------ |
| **Replace placeholder app icon with original SYSTEM mark**     | ⬜ blocking any release  |
| Bundle self-hosted fonts with documented licences              | ⬜                       |
| End-to-end UI tests (Playwright)                               | ⬜ largest testing gap   |
| Performance measurement against the targets in ARCHITECTURE §7 | ⬜ measured, not assumed |
| Accessibility audit with a real screen reader                  | ⬜                       |
| Onboarding persistence across restarts                         | ⬜                       |
| Colour-blind simulation validation of the palette              | ⬜                       |
| Reconcile encounter queue with DESIGN_SYSTEM §10's one-cinematic-per-session budget | ⬜ queue currently presents every `detected` quest in sequence (compact for routine ones); needs either a session cap or a documented exception for the initial post-onboarding batch |
| End-to-end interactive desktop click-through (real input, not just service-layer tests) | ⬜ not yet automated in this environment |

## Explicitly deferred

Recorded so they are never mistaken for oversights. Detail in `BACKLOG.md`.

- Multi-user support (architecture is ready; no UI)
- Cloud sync (deliberately out of scope; local-first is a product value)
- Mobile and web targets
- Calendar and GitHub integrations
- Weather integration (only ever behind explicit opt-in)
- Commercial packaging

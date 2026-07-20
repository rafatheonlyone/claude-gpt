# Changelog

Meaningful completed work. A change is listed only when it is genuinely done by
the definition in `CLAUDE.md` — not when a placeholder exists.

---

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

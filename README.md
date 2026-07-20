# SYSTEM

A lifelong personal evolution operating system.

SYSTEM converts verified real-world development — training, study, projects,
competitions, recovery — into an evolving progression record designed to remain
meaningful for ten or more years. Local-first, private by default, and built
around one rule:

> **SYSTEM rewards real-world action, never time spent inside the application.**

---

## Status

The first vertical slice, a Brazilian-Portuguese-by-default localization layer,
and a full multi-page desktop shell all work end to end:

**first launch → onboarding → quest generation → cinematic encounter → accept →
complete → XP → level → achievement → persistence → restart → state restored**

140 tests passing. See [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) for an
honest account of what works, what is partial, and what is specified but not yet
built.

## Requirements

- Windows 10/11
- Node.js ≥ 22.5 (uses the built-in `node:sqlite` for tests)
- Rust stable + MSVC Build Tools with the Windows SDK
- WebView2 runtime (pre-installed on current Windows)

## Getting started

```bash
npm install
npm run tauri:dev     # launch the desktop application
```

`npm run dev` alone serves the frontend for Tauri to consume; opening that URL in
a browser shows a "desktop required" notice, because the database lives in the
Rust host.

## Commands

| Command               | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| `npm run tauri:dev`   | Run the desktop app                                         |
| `npm run tauri:build` | Produce a Windows installer (NSIS/MSI)                      |
| `npm run test`        | Unit + integration tests                                    |
| `npm run test:watch`  | Tests in watch mode                                         |
| `npm run typecheck`   | Strict TypeScript check                                     |
| `npm run lint`        | ESLint, zero warnings tolerated                             |
| `npm run format`      | Prettier                                                    |
| **`npm run verify`**  | **typecheck + lint + test + build — run before committing** |

## Architecture

Tauri 2 · React 19 · TypeScript · SQLite

```
src/core/       framework-free portable core — domain, progression, quests,
                persistence, platform ports. No React, no Tauri, no DOM.
src/platform/   adapter implementations (tauri | test | web)
src/features/   screen-level composition
src/ui/         design system primitives
src-tauri/      Rust host: rusqlite, backup, integrity, window lifecycle
docs/           permanent project memory
```

Dependencies point inward. The boundary is enforced by ESLint, not convention —
`src/core` cannot import a framework even by accident.

## Documentation

Start with [`CLAUDE.md`](CLAUDE.md) and
[`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md).

| Document                                               | Contents                                        |
| ------------------------------------------------------ | ----------------------------------------------- |
| [`MASTER_SPEC`](docs/MASTER_SPEC.md)                   | What SYSTEM is, and what it must never become   |
| [`ARCHITECTURE`](docs/ARCHITECTURE.md)                 | Modules, boundaries, data flow, failure posture |
| [`DECISIONS`](docs/DECISIONS.md)                       | ADRs with alternatives and accepted trade-offs  |
| [`GAME_SYSTEMS`](docs/GAME_SYSTEMS.md)                 | Every formula, with calibration reasoning       |
| [`DESIGN_SYSTEM`](docs/DESIGN_SYSTEM.md)               | Colour, type, motion, sound, accessibility      |
| [`DATA_MODEL`](docs/DATA_MODEL.md)                     | Entities, migrations, backup, export            |
| [`AI_ARCHITECT`](docs/AI_ARCHITECT.md)                 | The Architect's layering, safety and privacy    |
| [`SECURITY_AND_PRIVACY`](docs/SECURITY_AND_PRIVACY.md) | Threat model and data rights                    |
| [`TESTING`](docs/TESTING.md)                           | Strategy, coverage, known gaps                  |
| [`ROADMAP`](docs/ROADMAP.md)                           | Phases and explicitly deferred work             |

## Design commitments

These constrain the code and are enforced in tests:

- Rest and recovery are progression, never its absence.
- Effort and demonstrated mastery are separate dimensions and never collapsed.
- Failure produces reflection and recalibration — never XP loss or shame.
- Every number shown can be explained to the user from its actual inputs.
- Nothing leaves the machine without explicit, per-category consent.
- No copyrighted assets. All icons, sounds and visuals are original; audio is
  synthesised at runtime.

## Licence

Personal project. Not currently licensed for redistribution.

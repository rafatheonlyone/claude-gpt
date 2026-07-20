# SYSTEM — Permanent Working Instructions

## What this is

SYSTEM is a local-first, installable Windows desktop application that converts **verified real-world
development** into a lifelong RPG-like progression layer. It is not a habit tracker, not a dashboard,
not a prototype. It is intended to remain meaningful to one person for ten or more years.

The intelligence layer inside the product is called **The Architect**.

## Required pre-work reading

At the start of every session, before substantial work, read in this order:

1. This file (`CLAUDE.md`)
2. `docs/CURRENT_STATE.md` — what actually works right now and the recommended next task
3. The relevant sections of `docs/MASTER_SPEC.md`
4. The relevant domain docs (`ARCHITECTURE`, `GAME_SYSTEMS`, `DATA_MODEL`, `DESIGN_SYSTEM`, `AI_ARCHITECT`)
5. Recent `git log` when the change touches existing behaviour

Never rely on chat history as the source of project memory. The repository is the memory.

## Non-negotiable principles

These override convenience, velocity, and cleverness.

1. **Reward real-world action, never time in the app.** No XP for opening SYSTEM, idling, scrolling, or
   leaving a timer running. If a mechanic can be satisfied without doing the real thing, it is broken.
2. **Health and safety outrank engagement.** Never reward sleep deprivation, overtraining, calorie
   restriction, skipped meals, or self-punishment. Rest and recovery are legitimate progression.
   No medical claims, no diagnosis, no authoritative body predictions. The primary user is a minor.
3. **No dark patterns.** No manufactured urgency, no loss-aversion streak pressure, no shame on failure,
   no manipulative notification loops. Missing a quest produces reflection and recalibration, never humiliation.
4. **Local-first and private by default.** Core functionality works fully offline. Personal data never
   leaves the machine without explicit, specific, per-category user consent.
5. **Honest measurement.** Effort, knowledge, demonstrated mastery, and outcomes are distinct dimensions
   and must never be collapsed. No pseudoscientific precision. Every number is explainable to the user.
6. **Originality.** No copyrighted characters, art, audio, fonts, logos, dialogue, or interface layouts
   from Solo Leveling, Minecraft, or any other protected work. Extract atmosphere, never assets.
7. **No placeholder masquerading as done.** See Definition of Done below.

## Architecture rules

- **Portable core.** Everything in `src/core/**` is framework-agnostic TypeScript: no React, no Tauri,
  no DOM, no `window`. Domain logic, progression math, quest engine, Architect rules, persistence
  schema, and repositories all live there and are unit-testable in plain Node. This is enforced by lint.
- **Platform behind adapters.** All storage, filesystem, notification, secure-credential, and audio
  access goes through interfaces in `src/core/platform/`. Tauri is one implementation; the Node/test
  implementation is another. Never import `@tauri-apps/*` outside `src/platform/tauri/**`.
- **TS owns the SQL.** Migrations and repositories are TypeScript. Rust exposes a narrow,
  parameterised-only execution surface. Never concatenate user values into SQL strings.
- **Provider-independent AI.** Never hard-code a single AI vendor. The deterministic local rules engine
  must produce a complete, good experience with AI entirely disabled.
- **No user-facing string literals in components.** All copy goes through the i18n layer so Brazilian
  Portuguese can be added later without touching the UI.

## Coding standards

- TypeScript strict. No `any` in committed code; use `unknown` plus a Zod parse at the boundary.
- Validate at every boundary: DB rows, AI responses, user input, imported files, IPC payloads.
- Small modules with clear ownership. Split files that exceed roughly 300 lines.
- No hidden global mutable state. No silent catch blocks. No hard-coded personal details in components.
- Named exports. Meaningful names over abbreviations.
- Every progression formula lives in `src/core/progression/`, is pure, is versioned, and has tests.

## Safety rules for generated content

Quests, achievements, bosses, and Architect messages — whether from the rules engine or an AI provider —
pass through `src/core/architect/safety/` before reaching the user. That filter rejects content
promoting unsafe training volume, sleep reduction, dietary restriction, self-critical framing, or
medical advice. Never bypass it, including in tests of "harmless" paths.

## Commands

```
npm run dev            # Vite dev server (browser, mock platform adapter)
npm run tauri:dev      # Full desktop app with the real Tauri adapter
npm run build          # Type-check + production web build
npm run tauri:build    # Windows installer (MSI/NSIS)
npm run test           # Vitest unit + integration
npm run test:watch
npm run typecheck
npm run lint
npm run format
npm run verify         # typecheck + lint + test + build — run before any commit
```

## Testing expectations

- Progression math, quest generation, integrity/anti-farming, and migrations require unit tests.
  These are the parts where a silent bug corrupts years of a person's history.
- Repository and migration tests run against real SQLite via `node:sqlite` — never against mocks.
- Every migration needs a test that it applies to the previous schema version and preserves data.
- Critical user flows (onboarding, quest completion, restart-and-restore) require end-to-end coverage.
- A bug fix gets a regression test that fails before the fix.

## Workflow rules

- Work in coherent vertical slices. Keep the app launchable after every unit of work.
- Before risky changes: check `git status`, read the relevant docs, understand existing tests.
- After a coherent unit: `npm run verify`, inspect the result, update docs, then commit.
- Never delete files or tests merely to silence an error.
- Never overwrite unrelated user work.
- When a requirement must be deferred, record it in `docs/ROADMAP.md` and `docs/BACKLOG.md`.
  Silent abandonment of a requirement is a defect.

## Definition of Done

A feature is done only when all of the following hold:

- It fulfils the documented behaviour in the spec.
- It is wired to real state and real persistence — no placeholder pretending to be final.
- Loading, empty, success, and error states are all handled.
- It is fully keyboard accessible with visible focus states and screen-reader labels.
- It respects reduced motion, reduced particles, and mute settings.
- It behaves correctly across supported window sizes.
- It has tests proportional to its risk.
- Affected documentation is updated, including `docs/CURRENT_STATE.md`.
- `npm run verify` passes and no unrelated behaviour regressed.

A screen is not complete because it looks attractive. A backend feature is not complete if the user
cannot meaningfully reach it.

## End-of-session requirements

Update `docs/CURRENT_STATE.md` (including the exact recommended next task), `docs/CHANGELOG.md`,
`docs/ROADMAP.md` status, any affected specification, and any relevant ADR in `docs/DECISIONS.md`.

Documentation must reflect reality, not intention.

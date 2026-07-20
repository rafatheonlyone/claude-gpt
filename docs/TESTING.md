# Testing Strategy

## Principle

Test where a silent failure would be expensive and hard to detect. In SYSTEM
that is overwhelmingly the **progression mathematics, the persistence layer, and
the safety constraints** — a bug in any of those quietly corrupts or misrepresents
years of a person's irreplaceable history, and does so without an error message.

A visual regression is noticed in a day. A wrong XP formula is noticed never.

## Commands

```
npm run test           # full suite, single run
npm run test:watch
npm run test:coverage  # v8 coverage over src/core/**
npm run verify         # typecheck + lint + test + build — the pre-commit gate
```

## Current coverage

140 tests across 8 files.

| Suite                             | Tests | Covers                                                                                                                                      |
| ---------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `progression/levels.test.ts`       | 15    | Curve calibration points, monotonicity, exact inverse at boundaries, no negative level loss on correction                                   |
| `progression/xp.test.ts`           | 19    | Difficulty scaling, evidence multipliers, partial-completion floor, diminishing returns, **order-independence**, anti-fragmentation         |
| `quests/generator.test.ts`         | 24    | Determinism, schedule as a hard constraint, injury exclusion, recovery clamping, neglect recovery, rationale presence, template safety scan |
| `quests/templates.test.ts`         | 4     | English/Portuguese field parity across every template, non-empty localized content                                                          |
| `persistence/migrator.test.ts`     | 17    | Apply, idempotency, FK enforcement, checksum tamper detection, newer-schema refusal, transactional rollback, migration 001→002 data preservation |
| `achievements/definitions.test.ts` | 4     | Definition/localization shape, presentation ordering                                                                                         |
| `i18n/index.test.ts`               | 16    | Default locale is pt-BR, switching, **catalogue key-shape parity between `en` and `pt-BR`**, missing-key fallback, number/date formatting    |
| `tests/vertical-slice.test.ts`     | 41    | Full flow end to end, including **restart and state restoration**, quest lifecycle (`detected`→`offered`→accepted/completed/postponed)      |

## Notable test designs

Some of these encode product values, not just behaviour:

- **Order-independence of diminishing returns.** Splitting one award into several
  must credit exactly the same total. If it did not, the system would quietly
  reward fragmenting work into many small entries — the precise farming pattern
  the design forbids.
- **Template safety scan.** Every quest template's full text is scanned for
  shaming and excess-promoting language. This is a content constraint enforced by
  a test rather than by reviewer memory.
- **Recovery clamping.** Asserts that a low-recovery day produces strictly less
  proposed work. The system must reduce load when the user is depleted.
- **Restart restoration.** Constructs a brand-new service over the same database
  and asserts XP, level, quest status and unlocks all survive, which is what
  actually happens when the user closes and reopens SYSTEM.
- **Newer-schema refusal.** Asserts the app refuses to start against a database
  written by a newer build, rather than risking damage to that data.
- **i18n catalogue parity.** `en` and `pt-BR` must resolve to exactly the same set
  of dotted keys. A translator adding a Portuguese-only key or missing an English
  one fails the build immediately rather than surfacing as a raw key on screen
  after a locale switch.

## Real SQLite, never mocks

Repository and migration tests run against genuine SQLite via Node's built-in
`node:sqlite`. Mocking the database would verify that our code calls the
functions we expect while proving nothing about whether the SQL is correct —
and the SQL is where the risk is.

`node:sqlite` is used rather than `better-sqlite3` to avoid a native build
dependency on every machine.

**Known gap:** tests use `node:sqlite` while production uses `rusqlite`. Both
satisfy the same `StorageAdapter` contract against an identical schema, but they
are different engines. The production path is verified separately by launching
the app and inspecting the resulting database (see below).

## Manual verification performed

Because the two SQLite engines differ, the real path was checked directly:

```
npm run tauri:dev
# then, against %APPDATA%\dev.system.app\system.db:
integrity_check: ok
journal_mode:    wal
foreign_keys:    1
migrations:      [{version: 1, name: initial_schema}]
tables:          24
achievements:    16 seeded
users:           1
host RSS:        38.5 MB
```

This confirms migrations, pragmas, the achievement registry sync and user
creation all work through Tauri IPC and `rusqlite`, not only through the test
adapter.

**2026-07-20 re-check:** `npm run tauri:dev` was launched again after the
Portuguese-localization and multi-page-shell milestone and the window was
screenshotted directly (`PrintWindow`, not a browser). It rendered a real
dashboard against the existing database — Portuguese sidebar and copy
throughout, a live quest ("Circuito de Manejo de Bola", domain `physical`,
difficulty `Moderada`), and the cinematic encounter overlay ("NOVA MISSÃO
DETECTADA" / "Deseja aceitar esta missão?") with a live "15 more waiting"
queue counter — confirming the shell, the localization default, and the
encounter queue all work against production `rusqlite`, not only the test
adapter. Full interactive click-through (accept/complete/restart via real
mouse input) was not performed in this pass because the window could not be
reliably brought to the OS foreground in this environment without risking
sending input to an unrelated window; the underlying interaction logic is
covered instead by the 41-test vertical slice.

## Determinism

Two sources of non-determinism are removed by construction:

- **Time** — all time flows through `ClockAdapter`. `FixedClock` lets tests move
  time explicitly, so date-boundary behaviour (streaks, decay, daily generation)
  is asserted rather than hoped for.
- **Randomness** — quest generation uses a seeded generator keyed on user and
  date. Identical inputs produce identical output, which is asserted directly.

## Gaps and priorities

1. **No end-to-end UI tests.** The largest gap. The React layer has no automated
   coverage; the slice is verified at the service layer and by manual launch.
   Playwright is planned (roadmap cross-cutting).
2. **No performance measurement.** The targets in `ARCHITECTURE.md` §7 are stated
   but only host RSS has been measured. They must be measured, not assumed.
3. **No accessibility automation.** Keyboard paths and ARIA are implemented but
   not asserted. A real screen-reader audit is outstanding.
4. **No adversarial safety fixtures yet** for the Architect safety filter — the
   filter itself is not implemented (Phase D-15), only its constraints are
   documented and enforced at the template level.

## Expectations for new work

- Progression math, generation, integrity and migrations require unit tests.
- Every migration needs a test that it applies to the prior version and preserves
  existing data.
- A bug fix gets a regression test that fails before the fix.
- Coverage thresholds are enforced on `src/core/**` only: 70 % lines, functions
  and statements, 65 % branches. The UI is deliberately excluded from thresholds
  until end-to-end tests exist, so the number is not inflated by trivial coverage.

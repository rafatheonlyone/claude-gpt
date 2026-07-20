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

247 tests across 11 files.

| Suite                                    | Tests | Covers                                                                                                                                      |
| ------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `progression/levels.test.ts`               | 15    | Curve calibration points, monotonicity, exact inverse at boundaries, no negative level loss on correction                                   |
| `progression/xp.test.ts`                   | 19    | Difficulty scaling, evidence multipliers, partial-completion floor, diminishing returns, **order-independence**, anti-fragmentation         |
| `quests/generator.test.ts`                 | 33    | Determinism, schedule as a hard constraint, injury exclusion, recovery clamping, neglect recovery, rationale presence, template safety scan, workload-budget awareness, hard duplicate exclusion, Daily Protocol selection |
| `quests/templates.test.ts`                 | 7     | English/Portuguese field parity across every template and every objective, non-empty localized content, no fixed extreme physical benchmark |
| `quests/objectives.test.ts`                | 17    | Objective completion (numeric and zero/one kinds), protocol progress from mandatory objectives only, baseline calibration at 80%, conservative fallback |
| `quests/workload-budget.test.ts`           | 11    | Available/budget/remaining minutes, recovery reduction, committed-workload subtraction, overload flag, primary/demanding caps, the literal 1,190-minute regression |
| `persistence/migrator.test.ts`             | 30    | Apply, idempotency, FK enforcement, checksum tamper detection, newer-schema refusal, transactional rollback, migrations 001→002→003→004→005 data preservation, concurrent-lock semantics |
| `achievements/definitions.test.ts`         | 4     | Definition/localization shape, presentation ordering                                                                                         |
| `i18n/index.test.ts`                       | 48    | Default locale is pt-BR, switching, **catalogue key-shape parity between `en` and `pt-BR`**, missing-key fallback, number/date formatting, **translation-key leak prevention across every dynamic key space used in the UI** |
| `features/quests/useQuestEncounterQueue.test.tsx` | 5 | One modal per session, the rest prepared silently with a count, silent mode, prepared-summary dismissal — the first React hook test in the project |
| `tests/vertical-slice.test.ts`             | 58    | Full flow end to end, including **restart and state restoration**, quest lifecycle, the **concurrent-generation race regression**, recalibration workload accumulation, duplicate-quest repair, Daily Protocol/objective persistence |

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
- **The concurrent-generation race regression** (`tests/vertical-slice.test.ts`,
  "never generates duplicate batches when several callers race on first load").
  Fires `getDashboard`/`getPendingEncounters` concurrently against one shared
  service, the same shape as Shell/Home/Today all mounting at once, and asserts
  every caller observes the same at-most-5-quest day. Verified to fail with
  "expected 20 to be less than or equal to 5" when the `daily_generation_locks`
  guard is removed — a real database inspected while diagnosing this bug had 21
  quests inserted across 7 batches within 22 milliseconds from exactly this race.
- **Never prescribes a fixed extreme physical benchmark.** A template-level test
  asserts every baseline-linked objective's `target` is `null` in the template
  itself — the number only exists after calibration from the user's own data,
  never as a constant an author could accidentally hard-code (the milestone's
  explicit example of what not to do: 100 push-ups, 100 squats, a 10 km run).
- **i18n catalogue parity.** `en` and `pt-BR` must resolve to exactly the same set
  of dotted keys. A translator adding a Portuguese-only key or missing an English
  one fails the build immediately rather than surfacing as a raw key on screen
  after a locale switch.
- **Translation-key leak prevention.** Parity alone does not catch a key absent
  from *both* catalogues — exactly what happened with `domain.*` and `rank.*`,
  which rendered literally as `domain.physical`/`rank.dormant` in the shipped
  app despite passing every existing i18n test. A dedicated test now enumerates
  every dynamically-interpolated key space actually used in the UI (`domain.*`,
  `rank.*`, `quest.difficulty.*`, `quest.states.*`, `achievements.rarity.*`)
  against the real `Domain`/`Rank`/etc. value sets and asserts each resolves to
  real copy, not its own key, in both locales.

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

**2026-07-20 re-check (adaptive quest engine milestone):** the real development
database was inspected directly and confirmed the reported bug: 27 quests for
one day, 21 of them inserted across 7 batches within 22 milliseconds, and
`domain.physical`/`rank.dormant` rendering literally with no catalogue entry in
either locale. After the fix, `npm run tauri:dev` was launched against that
same database (migrations 003–005 applying live through `rusqlite`, not
`node:sqlite`) and screenshotted: the sidebar and stats correctly show
"ACADÊMICO" and "Adormecido" instead of raw keys, and the dashboard shows one
reasonable accepted quest rather than the previous duplicate pile. A one-off
Node script drove the same migration and repair logic directly against the
real `system.db` (checkpointing the WAL first and taking a file backup before
any write) to clean up the pre-existing 21 duplicates down to 6 genuine
quests — documented in `docs/CHANGELOG.md`. As before, full interactive
click-through was not performed for the same OS-foreground reason; the new
concurrency, budget, duplicate-repair and objective/baseline behaviour is
covered by the automated suite instead, including a regression test verified
to fail without the fix (see "Notable test designs" above).

## Determinism

Two sources of non-determinism are removed by construction:

- **Time** — all time flows through `ClockAdapter`. `FixedClock` lets tests move
  time explicitly, so date-boundary behaviour (streaks, decay, daily generation)
  is asserted rather than hoped for.
- **Randomness** — quest generation uses a seeded generator keyed on user and
  date. Identical inputs produce identical output, which is asserted directly.

## Gaps and priorities

1. **Still the largest gap, but no longer absolute.** `useQuestEncounterQueue.test.tsx`
   is the first automated React test in the project — `@testing-library/react`
   and jsdom were already installed but unwired; `vite.config.ts`'s `test.include`
   now picks up `.test.tsx` alongside `.test.ts`, and the environment is opted
   into jsdom per-file via a `// @vitest-environment jsdom` pragma comment
   rather than changing the global (still `node`) default, so every other test
   file's performance is unaffected. No component (as opposed to hook) has
   render-level coverage yet, and there is still no true end-to-end
   click-through test. Playwright remains planned for that (roadmap cross-cutting).
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

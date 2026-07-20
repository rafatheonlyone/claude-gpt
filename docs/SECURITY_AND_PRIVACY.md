# Security and Privacy

## Posture

SYSTEM holds an unusually sensitive dataset: years of one person's goals,
failures, health habits, academic performance and private reflections — and the
primary user is a minor. The correct default is therefore not "secure enough for
a productivity app" but **nothing leaves this machine unless the user explicitly
sends it**.

Privacy here is a product value, not a compliance checkbox. Several design
decisions cost convenience to preserve it, deliberately.

## Threat model

| Threat                                 | Realistic?              | Mitigation                                                                                        | Status                   |
| -------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------- | ------------------------ |
| Personal data silently uploaded        | The central risk        | No network permission in the webview capability set; AI disabled by default; per-category consent | ✅                       |
| Malicious/buggy content reaching SQL   | Moderate                | Parameterised-only bridge; SQL strings only from compiled application code                        | ✅                       |
| Remote code execution via webview      | Low                     | Strict CSP; no `unsafe-eval`; no remote origins; `object-src 'none'`                              | ✅                       |
| API key leakage                        | Moderate once AI exists | OS credential store only; never SQLite, config files, or logs                                     | ⬜ D-15                  |
| Data loss / corruption                 | **High over ten years** | WAL, FK enforcement, integrity checks, pre-migration backup, transactional migrations             | 🔄 backups not scheduled |
| Local disk access by another user      | Low-moderate            | Optional encryption at rest                                                                       | ⬜ D-17                  |
| Accidental data destruction by the app | Moderate                | Append-only log; corrections are new events, never overwrites                                     | ✅                       |

## Local data

Everything lives in one SQLite database under the OS application-data directory:

```
%APPDATA%\dev.system.app\system.db
%APPDATA%\dev.system.app\backups\
```

- `PRAGMA foreign_keys = ON` — enforced, not advisory.
- WAL journal mode with `synchronous = NORMAL`.
- `PRAGMA integrity_check` on launch and before any restore.
- Automatic backup before every migration.

**Encryption at rest is not yet implemented.** The database is currently
readable by anyone with access to the Windows user account. This is stated
plainly rather than glossed: for the single-user desktop case it is a reasonable
starting posture, but it is a real limitation and is tracked as D-17.

## The SQL bridge

ADR-0002 puts schema and queries in TypeScript and exposes a narrow execution
surface from Rust. That is only safe because of one invariant:

> The `sql` argument always originates from compiled-in application code. User
> input, imported files and AI responses reach the database **exclusively** as
> bound parameters.

Defences supporting it:

1. All repository SQL is a literal in application source.
2. `rusqlite`'s single-statement APIs reject trailing statements, so classic
   statement-chaining injection fails closed even if the invariant were violated.
3. The migration runner's only inlined identifiers are validated against
   `^[a-z0-9_]+$` and throw otherwise — the guarantee is enforced, not assumed.
4. The strict CSP prevents injected script from reaching the IPC surface.

## Webview capabilities

The capability set is deliberately minimal:

```json
{ "permissions": ["core:default", "opener:default"] }
```

No filesystem, no shell, no HTTP, no arbitrary process access is granted to the
webview. Everything privileged happens in audited Rust commands with narrow
signatures.

CSP forbids remote origins entirely: `default-src 'self'`, `object-src 'none'`,
`frame-ancestors 'none'`. `style-src` permits `'unsafe-inline'` because the
animation library sets inline styles; script remains `'self'` only, which is the
directive that actually matters for code execution.

## External AI (not yet enabled)

When implemented (D-15), the following are binding requirements, not intentions:

- **Default off.** SYSTEM ships fully functional with no AI and no key.
- **Per-category consent.** Goals, schedule, quest text, performance metrics and
  reflections are independently toggleable. **Health data defaults to never
  shared even when AI is enabled.**
- **Show before send.** Before the first external request the user sees the exact
  literal payload. A dry-run inspector remains permanently available.
- **Minimised and pseudonymised.** No name, birth date or location is ever sent.
- **Logged.** Provider, purpose, categories, tokens, cost and outcome recorded
  locally for every request.
- **Budgeted.** Local rate and monthly cost ceilings, enforced before any call.
- **Credentials in the OS store only.** The current `SecretAdapter` stub _throws_
  rather than falling back to insecure storage — silently writing an API key
  somewhere weaker would be worse than failing loudly.
- **One-switch removal.** Disabling AI deletes stored credentials.

## User data rights

The user owns this data unconditionally.

| Right                            | Status                      |
| -------------------------------- | --------------------------- |
| Export — full JSON archive       | ⬜ D-13                     |
| Export — human-readable Markdown | ⬜ D-13                     |
| Export — CSV per table           | ⬜ D-13                     |
| Selective deletion               | ⬜ D-13                     |
| Complete deletion with `VACUUM`  | ⬜ D-13                     |
| Correction of any record         | 🔄 model supports it; no UI |
| Audit visibility of overrides    | 🔄 table exists; no UI      |

The human-readable Markdown export matters most: **data the user cannot read
without our software is not truly theirs.** In ten years SYSTEM may not run, and
the record should outlive the application.

## Minors

The primary user is 15. Accordingly:

- No account, no telemetry, no analytics, no crash reporting, no third-party SDKs.
- No advertising, no social features, no comparison with other people.
- Age-sensitive content rules in `GAME_SYSTEMS.md` §12 are enforced in code.
- Health data is the most protected category and is excluded from any external
  request by default.

## Logging

Structured, local, no personal content by default. Log statements must never
include quest text, reflections, goals or health values. `console.log` is banned
by lint; only `warn` and `error` are permitted.

## Reporting

This is a personal single-user application with no network surface. Should it
ever be distributed, a disclosure process and a threat re-assessment must precede
release — the current model assumes a single trusted local user.

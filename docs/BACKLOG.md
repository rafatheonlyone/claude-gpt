# Backlog

Ideas intentionally deferred. **Nothing here is implemented.** Items in
`ROADMAP.md` are committed work; items here are candidates that may never be
built.

---

## Deliberately out of scope

These are rejected on principle, not on effort. Revisiting them means revisiting
a product value.

| Idea                                      | Why not                                                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Cloud sync / accounts                     | Local-first is a stated product value, and this dataset is unusually sensitive. Sync would require rethinking the entire privacy posture |
| Social feed, friends, leaderboards        | Comparison with other people is explicitly forbidden, especially for a minor                                                             |
| Streak-loss pressure, daily login rewards | Textbook dark patterns; would directly contradict the central rule                                                                       |
| Telemetry / analytics / crash reporting   | No data leaves the machine                                                                                                               |
| Monetised cosmetics                       | Would corrupt the reward model, which must track real achievement only                                                                   |
| Calorie tracking                          | Explicitly forbidden by the safety constraints                                                                                           |

## Plausible later features

| Idea                         | Notes                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Multi-user profiles          | Schema already keys everything on `user_id`; only UI and switching are missing                                      |
| Commercial version           | Architecture is deliberately generalisable; would need onboarding for users unlike the initial one                  |
| Calendar integration         | Would sharply improve schedule feasibility. Requires explicit opt-in and careful data handling                      |
| GitHub integration           | Strong evidence source for technical mastery — commits, PRs, review activity                                        |
| Weather integration          | Only useful for outdoor training. Requires explicit opt-in and a network permission SYSTEM currently does not grant |
| Wearable / sleep data import | Would make recovery real rather than self-reported. Highest-sensitivity data; needs the strongest consent design    |
| Spaced-repetition system     | Would make the Knowledge dimension genuinely measurable                                                             |
| Chess platform import        | Rating history is excellent Performance evidence                                                                    |
| Voice reflection capture     | Lower friction for journaling than typing                                                                           |
| Photo progress timeline      | Must avoid appearance-focused framing entirely                                                                      |
| Shareable achievement cards  | Export only, user-initiated, no platform integration                                                                |
| Plugin / asset-pack system   | User-replaceable themes, sounds and quest libraries                                                                 |
| Mobile companion             | Capture-only, syncing locally over LAN rather than cloud                                                            |

## Technical debt and improvements

| Item                                | Notes                                                    |
| ----------------------------------- | -------------------------------------------------------- |
| Projection rebuild command          | Design supports it; no implementation or UI yet          |
| Snapshot-bounded replay             | Needed before the event log grows large enough to matter |
| Virtualised lists                   | Only once quest history is long enough to justify it     |
| Web Worker for analytics            | Keep heavy aggregation off the main thread               |
| Playwright end-to-end suite         | Currently the largest testing gap                        |
| Visual regression testing           | Would protect the design system from drift               |
| Bundle self-hosted fonts            | Needed for deterministic rendering across machines       |
| `better-sqlite3` parity test        | Would close the `node:sqlite` vs `rusqlite` engine gap   |
| Automated contrast validation in CI | Design system specifies it; not yet wired                |
| Rust-side integration tests         | The SQL bridge has no automated coverage of its own      |

## Open design questions

Genuinely unresolved, recorded so they are not silently decided by accident:

1. **Should mastery decay be visible by default?** Honest, but potentially
   discouraging. Current lean: visible, framed neutrally as "current sharpness",
   with peak always shown alongside.
2. **How should hybrid classes be named?** Auto-generated names risk sounding
   generic; user-chosen names risk feeling arbitrary. Possibly a suggested name
   the user may override.
3. **What is the right cadence for rank trials?** Too frequent cheapens rank; too
   rare makes progression feel absent for months.
4. **Should the Architect ever initiate contact?** A weekly insight is valuable,
   but any unprompted notification is on the boundary of an engagement loop.
5. **How much history should the dashboard surface?** The timeline is the
   emotional payoff of a ten-year product, but the dashboard must prioritise
   today.

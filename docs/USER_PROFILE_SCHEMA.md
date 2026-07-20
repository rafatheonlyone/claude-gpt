# User Profile Schema

## Principle

**No fact about a person is permanently assumed true.** Age, weight, height,
goals, schedule, interests and priorities all change — and for a user who starts
at 15, they will change fast. Every profile field is versioned in
`profile_history` and re-confirmable from settings.

This document defines the _shape_ of profile data. It deliberately contains **no
actual personal values** — those live only in the local database, never in
documentation committed to a repository.

## Storage

| Table                  | Holds                                    |
| ---------------------- | ---------------------------------------- |
| `profiles`             | Current values                           |
| `profile_history`      | Every prior value with a timestamp       |
| `onboarding_state`     | Resumable progress, schema version       |
| `onboarding_responses` | Individual answers with revision history |
| `preferences`          | Namespaced, typed settings               |

## Core identity

| Field          | Type     | Required | Notes                                     |
| -------------- | -------- | -------- | ----------------------------------------- |
| `display_name` | string   | yes      | Chosen name; need not be legal            |
| `birth_date`   | ISO date | no       | **Only** for age-appropriate safety rules |
| `country`      | ISO code | no       |                                           |
| `timezone`     | IANA     | yes      | Drives the day boundary — see below       |
| `locale`       | tag      | yes      | `en` only at present                      |

The timezone matters more than it appears: "which day is it" must follow the
user, not UTC. For a user in Brazil, using UTC would shift the boundary by three
hours and quietly attribute late-evening work to the following day, corrupting
streaks and daily caps.

## Onboarding categories

Implemented in the current build:

| Category     | Fields                             |
| ------------ | ---------------------------------- |
| Identity     | display name, birth date           |
| Focus        | goal tags across all eight domains |
| Capacity     | available minutes on a normal day  |
| Calibration  | difficulty preference              |
| Presentation | animation intensity, sound         |

Specified and deferred (`ROADMAP.md`), each with "prefer not to answer":

education stage · school schedule · subjects · self-assessed grades · academic
goals · upcoming examinations · programming experience · technologies known and
desired · personal projects · career interests · reading habits · chess
experience · physical activities · training schedule · height · weight · sleep ·
recovery · nutrition habits · hydration · injuries and limitations · current
routine · commitments · short-term, one-year and five-year goals · long-term
aspirations · strengths · friction points · feedback style · notification
frequency · privacy preferences.

## Sensitive fields

| Field          | Handling                                                                  |
| -------------- | ------------------------------------------------------------------------- |
| `birth_date`   | Never displayed prominently; used only for safety gating                  |
| Height, weight | **Hidden by default.** Opt-in to display. Never shown as a goal or judged |
| Injuries       | Used to exclude quests structurally, never displayed as a limitation      |
| Reflections    | Never sent externally under any AI consent configuration                  |
| Nutrition      | Habit quality only — never restriction, never targets                     |

Body metrics carry an explicit statement that SYSTEM is not medical care, and a
one-switch hide. The default is conservative because the user is a minor and the
downside of an appearance-focused framing is far worse than the upside of a
visible number.

## Preferences

Namespaced under `profile`:

| Key                    | Type                                | Default                    |
| ---------------------- | ----------------------------------- | -------------------------- |
| `goals`                | string[]                            | `[]`                       |
| `availableMinutes`     | number                              | `120`                      |
| `difficultyPreference` | `lighter \| balanced \| harder`     | `balanced`                 |
| `excludedDomains`      | Domain[]                            | `[]`                       |
| `injuredAreas`         | string[]                            | `[]`                       |
| `animationIntensity`   | `full \| reduced \| minimal \| off` | OS preference, else `full` |
| `soundEnabled`         | boolean                             | `true`                     |

The animation default reads the OS reduced-motion preference on first run and
never silently overrides it — only an explicit user choice can.

## Derived, never stored as input

These are computed from the event log and must never be directly writable:

- Attribute values (ADR-0005)
- Level, rank, class inference
- Consistency, momentum
- Domain distribution

If a value can be written directly, it can be farmed directly.

## Initial user context

The initial user's known context — a Brazilian high-school student with
mathematics competition experience, C1-approaching-C2 English, front-end
programming experience, and interests spanning basketball, boxing, calisthenics,
chess and cybersecurity — is used **only** to seed sensible onboarding defaults
and to tune the quest template library.

It is treated as _defaults to confirm_, never as established fact. Onboarding
asks; it does not assume. Specific personal values are not recorded in this
repository.

## Rights

Every profile field can be edited, exported and deleted. History is retained on
edit so the timeline stays honest, but the user may delete history too — it is
their record, and ownership without deletion is not ownership.

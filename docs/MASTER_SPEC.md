# SYSTEM — Master Specification

The complete product specification. Domain detail lives in the companion
documents; this is the authoritative statement of _what SYSTEM is and what it
must never become_.

---

## 1. Product definition

SYSTEM is a lifelong, local-first personal evolution operating system for
Windows. It converts verified real-world development into an evolving RPG-like
progression record intended to remain meaningful for ten or more years.

It is **not** a habit tracker, task manager, dashboard, or productivity
experiment.

### The central rule

> SYSTEM must reward real-world action, not time spent inside the application.

The user should be eager to _leave_ SYSTEM, do meaningful work, and return to
record, verify and reflect on it. Any mechanic satisfiable without doing the real
thing is broken by definition.

### Non-negotiable constraints

1. Health and safety outrank engagement. Never reward sleep deprivation,
   overtraining, dietary restriction or self-punishment. Rest is progression.
2. No dark patterns. No manufactured urgency, no streak anxiety, no shame.
3. Local-first and private by default. Core function works entirely offline.
4. Honest measurement. Effort, knowledge, mastery and outcomes stay distinct.
5. Legally distinct originality. Atmosphere may be extracted; assets never.
6. Accessibility is correctness, not a feature.

## 2. Scope of development

SYSTEM tracks development across eight domains: **physical, academic, technical,
mental, creative, social, financial, recovery** — covering strength, basketball,
boxing, calisthenics, conditioning, mobility, sleep, nutrition habits, school,
mathematics, English, programming, web development, cybersecurity, reading,
chess, memory, focus, creativity, communication, confidence, discipline,
emotional regulation, project execution, entrepreneurship, financial education
and long-term planning.

## 3. Progression model

Eight separate dimensions — Experience, Mastery, Knowledge, Performance,
Consistency, Momentum, Recovery, Impact — deliberately never collapsed into one
number. Full formulas, calibration reasoning and worked examples in
**`GAME_SYSTEMS.md`**.

Key structural decisions:

- Levels are uncapped; level ~100 is calibrated as a ten-year achievement.
- **Attributes are derived, never awarded** (ADR-0005), which makes them
  unfarmable and self-explaining.
- Mastery advances only on evidence and decays gently with disuse, but **peak
  mastery is permanent**.
- Ranks require multi-criteria gates including a real-world trial.
- Classes describe identity and never restrict what the user may do.

## 4. The Architect

A three-layer intelligence system (**`AI_ARCHITECT.md`**): a deterministic local
rules engine that is always sufficient; an optional provider abstraction with no
vendor lock-in; and an unconditional validation and safety layer that every
generated artefact passes through regardless of origin.

AI is **disabled by default** and SYSTEM ships complete without it.

## 5. Quests

Eighteen quest types with full lifecycle, generation inputs, and user controls
(accept, reject, reroll, edit, postpone, adjust difficulty, ask why, report,
exclude categories). Detail in `GAME_SYSTEMS.md` §9 and `AI_ARCHITECT.md` §3.

Generation ordering is load-bearing: **hard filters → relevance scoring →
diversity → workload clamp**. A quest that conflicts with the user's real life is
a design failure, not variety.

Failure produces reflection and recalibration — never XP loss, never shame.

## 6. Bosses

User-defined real challenges (exams, projects, competitions, certifications)
transformed into structured encounters with phases, weaknesses, preparation
chains and mandatory post-battle review. Boss HP maps to **real preparation
components**, never to clicks. Partial victory is a real outcome. Detail in
`GAME_SYSTEMS.md` §10.

## 7. Achievements

Tiered presentation (standard / rare / legendary) with rarity-scaled emphasis,
hidden achievements discoverable through meaningful behaviour, and a hard rule
against celebrating unsafe extremes. The interruption budget in
`DESIGN_SYSTEM.md` §10 governs when anything is allowed to interrupt.

## 8. Interface and experience

Full visual language, motion choreography, particle budgets, sound identity,
rank-based visual evolution and accessibility requirements in
**`DESIGN_SYSTEM.md`**.

Governing rule: _if an effect were removed and the user could not tell what was
lost, it should not exist._ Early states must already look premium — progression
adds distinction, never removes quality.

## 9. Onboarding

A cinematic but respectful activation sequence, architected as a **resumable,
versioned schema** rather than a hard-coded sequence. Supports back navigation,
optional sections, "prefer not to answer", later editing, historical snapshots,
keyboard navigation, reduced motion and screen readers.

No scientifically authoritative "potential percentage" is ever calculated. If a
Potential model is introduced it must be transparently motivational — based on
opportunity, consistency and demonstrated progress — never framed as biological
destiny or medical prediction.

## 10. Health, age and safety

The initial user is a minor. All health features are conservative: no diagnosis,
no authoritative body predictions, no calorie mechanics, no body-shaming, no
comparison with others, no rewards for overtraining or sleep loss, no punishment
for rest. Injuries disable unsuitable quests structurally. Estimates are labelled
as estimates. Medical concerns are directed to qualified adults and
professionals. Full constraint list in `GAME_SYSTEMS.md` §12.

## 11. Integrity

A fair, non-accusatory model that detects farming patterns and responds with
recalibration and offers to merge — never accusation. Fixed non-negotiable
language. The user may override any verdict; overrides are recorded visibly but
never punitively. Detail in `GAME_SYSTEMS.md` §11.

## 12. Data and history

Append-only event log with rebuildable projections, versioned snapshots bound to
formula versions, full export (including human-readable Markdown), import,
correction and deletion. Detail in **`DATA_MODEL.md`** and
**`SECURITY_AND_PRIVACY.md`**.

The user owns this data unconditionally. Data they cannot read without our
software is not truly theirs.

## 13. Architecture

Tauri 2 desktop shell, React 19 UI, framework-free portable core, platform
adapters, SQLite with TypeScript-owned migrations. Rationale and boundaries in
**`ARCHITECTURE.md`** and **`DECISIONS.md`**.

## 14. Longevity

Ten-year meaningfulness is achieved through layered generative systems rather
than a finite content list: procedural and AI-assisted generation, skill-specific
mastery, increasing challenge complexity, life-stage adaptation, user-generated
goals, dynamic campaigns, historical comparison, class branching, prestige,
seasonal reviews, life arcs, evolving visual identity, rising evidence standards
and multi-year objectives.

Life arcs (High School, Exchange, University Preparation, University, First
Professional Project, Career, Business, Financial Independence, Mastery, Legacy)
activate from the user's **actual life**, never from age alone.

## 15. Language

English throughout — interface, generated content, documentation and code
identifiers. All user-facing copy sits behind a typed i18n catalogue from the
first commit (ADR-0006) so Brazilian Portuguese can be added without touching the
UI.

## 16. Definition of done

Stated in `CLAUDE.md` and binding. A screen is not complete because it looks
attractive; a backend feature is not complete if the user cannot reach it.

## 17. Current status

See **`CURRENT_STATE.md`** for what actually works today, and **`ROADMAP.md`**
for what is deferred and in what order. Requirements are never silently dropped —
deferral is always explicit and tracked.

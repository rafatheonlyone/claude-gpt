# SYSTEM — Game Systems and Formulas

Every formula here is implemented as a pure, versioned, tested function in `src/core/progression/`.
Formula versions are recorded on every awarded event and every snapshot, so recalibrating a formula
never silently rewrites the user's history.

**Design rule that governs this entire document:** a number the user cannot have explained to them is a
number SYSTEM should not display.

---

## 1. The eight dimensions

These are stored and computed separately. Collapsing them would be dishonest.

| Dimension           | Represents                                 | Source of truth                                                                 | Can it be farmed?                                 |
| ------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Experience (XP)** | Meaningful effort and honoured commitments | Completed quests, logged sessions                                               | Bounded by diminishing returns + integrity engine |
| **Mastery**         | Demonstrated capability                    | Evidence only: assessments, projects, competition results, verified performance | No — requires evidence artefacts                  |
| **Knowledge**       | Studied and retained material              | Study sessions with recall checks, spaced review                                | Partially — decays without review                 |
| **Performance**     | Measurable real-world results              | User-recorded metrics (lifts, times, scores, ratings)                           | No — values are compared against history          |
| **Consistency**     | Sustainable repeated behaviour             | Activity calendar                                                               | No — time-gated by construction                   |
| **Momentum**        | Recent trajectory                          | Derived comparison of recent to baseline                                        | No — purely derived                               |
| **Recovery**        | Sleep, rest, workload balance              | Voluntary tracking                                                              | Not applicable — never a scored target            |
| **Impact**          | Work that created value outside the app    | Shipped projects, published work, helped people                                 | No — requires external artefact                   |

Experience answers _did you show up_. Mastery answers _can you actually do it_. They must never be the
same number, because that conflation is the single most common failure in gamified self-improvement
tools — it makes the tool reward its own use.

---

## 2. Levels

Global level is uncapped.

```
xpRequiredForLevel(n) = 75 + round(25 * n^1.5)      // XP to go from level n to n+1
```

Calibration reasoning, stated explicitly so it can be revisited honestly:

An engaged user doing genuine daily work earns roughly 150–400 XP/day; the model assumes a long-run
average of ~250. That yields ≈ 91,000 XP/year and ≈ 912,000 over ten years. The cumulative requirement
of the curve above reaches level 100 at ≈ 1.0 M XP. So **level ~100 is a ten-year achievement**, not a
first-year one.

| Transition | XP needed | Approx. real time at 250 XP/day |
| ---------- | --------- | ------------------------------- |
| 1 → 2      | 100       | first session                   |
| 5 → 6      | 355       | ~1.5 days                       |
| 10 → 11    | 866       | ~3.5 days                       |
| 25 → 26    | 3,200     | ~2 weeks                        |
| 50 → 51    | 8,914     | ~5 weeks                        |
| 100 → 101  | 25,075    | ~14 weeks                       |

Early levels arrive fast — that is intentional, and it is honest rather than manipulative, because the
early work genuinely is the hardest to start. The curve then slows permanently, so late progress means
something. There is no level cap and no prestige reset that erases history.

**Domain levels** use the same curve with a coefficient of 15 rather than 25, since domain XP is a
subset of global XP.

---

## 3. XP award

```
rawXp     = base(difficulty)
          × evidenceMultiplier
          × completionFactor
          × integrityFactor

creditedXp = applyDiminishingReturns(rawXp, domain, day)
```

**Base by difficulty** — calibrated against real effort, not arbitrary tiers:

| Difficulty | Base XP | Reference                   |
| ---------- | ------- | --------------------------- |
| Trivial    | 10      | Under 5 minutes             |
| Light      | 25      | ~15 minutes of real focus   |
| Moderate   | 60      | ~45 minutes of real work    |
| Demanding  | 120     | ~2 hours, or genuinely hard |
| Severe     | 250     | A significant undertaking   |

**Evidence multiplier** — rewards verifiability, never punishes its absence:

| Evidence                                                   | ×    |
| ---------------------------------------------------------- | ---- |
| Self-reported                                              | 1.00 |
| Structured detail (notes, counts, metrics)                 | 1.10 |
| Artefact attached (file, link, photo, commit)              | 1.25 |
| External verifiable result (score, rating, published work) | 1.40 |

Self-report is the baseline at 1.0, not a penalty. The system trusts the user by default; evidence is
a bonus for the user's own future confidence, not a compliance requirement.

**Completion factor:** full 1.0; partial completion credits the proportion of required steps done, with
a floor of 0.25 for any genuine attempt. **Attempting and falling short always beats not trying**, and
the system must never make abandonment the rational choice.

### Diminishing returns

Per domain, per day. Prevents grinding one category without ever reaching zero, so effort is never
literally wasted:

```
softCap = 400 XP per domain per day       (configurable)

credited(raw) = raw                                     if raw ≤ softCap
              = softCap + softCap * ln(1 + (raw − softCap)/softCap)    otherwise
```

| Raw XP in one domain in one day | Credited |
| ------------------------------- | -------- |
| 400                             | 400      |
| 800                             | 677      |
| 1,200                           | 839      |
| 2,000                           | 1,044    |

A genuinely enormous day is still rewarded — meaningfully more than an ordinary one — but repetitive
grinding produces sharply less. The curve is smooth and never reaches zero, so no action is ever
pointless. Cross-domain work is not penalised at all, which structurally encourages balance.

---

## 4. Mastery

Mastery is per skill, scored 0–100 within six tiers, and **advances only on evidence**.

| Tier         | Range  | Meaning                        |
| ------------ | ------ | ------------------------------ |
| Novice       | 0–15   | Has begun                      |
| Apprentice   | 16–33  | Can perform with support       |
| Practitioner | 34–52  | Independently capable          |
| Adept        | 53–70  | Reliable under pressure        |
| Expert       | 71–86  | Can teach it                   |
| Authority    | 87–100 | Produces original contribution |

```
masteryGain = evidenceWeight × difficultyRelativeToCurrent × (1 − current/100)^1.5
```

The final term makes each tier progressively harder — moving 85 → 90 costs far more than 20 → 25 —
which mirrors how skill acquisition actually works.

**Decay and peak.** Mastery decays 0.5 %/week after a 30-day grace period of inactivity, floored at
**60 % of peak mastery ever achieved**. Peak mastery is permanent and shown in history.

The reasoning: pretending an unpractised skill is still sharp would be dishonest, and honesty is the
product's core value. But erasing a demonstrated achievement would be cruel and false — you did do
that, and the record says so forever. Decay is presented neutrally as _current sharpness_, never as
failure, and returning to a skill recovers it quickly.

---

## 5. Attributes — derived, never awarded

Nothing in the system writes an attribute value. Each is a pure function, recomputed from the event log:

```
attributeScore(a) = Σ over contributing skills s:
                      weight(a, s) × masteryOf(s)
                  + 0.3 × normalizedDomainXp(mappedDomains(a))
                  + 0.2 × consistencyOf(mappedDomains(a))
```

Normalised to a 0–100 display value with an uncapped underlying level.

This structure is what makes attributes unfarmable and self-explaining: the UI can always show
_exactly_ which skills and which activity produced a value, because that is literally how it was
computed. Initial attributes: Strength, Endurance, Agility, Mobility, Coordination, Recovery,
Intelligence, Knowledge, Focus, Memory, Creativity, Discipline, Consistency, Strategy, Communication,
Confidence, Adaptability, Technical Skill, Leadership, Financial Awareness. Custom attributes are
supported, with duplicate detection against existing names and mappings.

Activity → skill → attribute mappings are data, not code, and live in a versioned registry. Not every
activity touches every attribute; a mapping must be justified in the registry to exist.

---

## 6. Consistency, Momentum, Recovery

**Consistency** (0–100, per domain, 28-day window):

```
consistency = 100 × (weightedActiveDays / expectedActiveDays)
```

Expected days come from the user's _own declared_ schedule, not a global ideal. Someone who trains
three days a week and does so is 100 % consistent. Capped at 100 — exceeding your own plan does not
raise consistency, because that would reward overtraining.

**Momentum** (−100…+100): compares a 7-day EWMA against a 28-day EWMA. Labelled everywhere as a
_trend_, never as an achievement, and never used as a rank gate. Negative momentum is presented
neutrally and is expected during exams, illness, and rest periods.

**Recovery** is tracked only if the user opts in. It is **never a scored target and never a
leaderboard**. It exists to let the Architect reduce load, and it can gate quest generation:
sustained poor recovery causes the engine to propose lighter work and recovery quests. Recovery quests
award normal XP. Rest is progression, not its absence.

---

## 7. Ranks

Ranks are rare, multi-criteria, and cinematic. XP alone never grants one.

| #   | Rank             | Meaning                                   |
| --- | ---------------- | ----------------------------------------- |
| 0   | **Dormant**      | Pre-activation                            |
| 1   | **Threshold**    | Detected; baseline established            |
| 2   | **Emergent**     | Consistent measurable growth              |
| 3   | **Ascendant**    | Demonstrated mastery in one domain        |
| 4   | **Vanguard**     | Excellence across multiple domains        |
| 5   | **Paragon**      | Sustained multi-year excellence           |
| 6   | **Sovereign**    | Self-directed mastery; sets own standards |
| 7   | **Transcendent** | Original contribution beyond the self     |

Each rank has sub-tiers I / II / III, giving 24 meaningful steps across a decade.

**Every rank-up requires all of:**

1. A minimum global level
2. Minimum mastery — e.g. Vanguard requires Adept+ in at least three skills across two domains
3. Completed life milestones
4. Minimum consistency sustained over a period (not a single good week)
5. At least one boss victory of appropriate weight
6. A **rank trial**: a user-accepted real-world challenge with a defined evidence requirement

The trial is what prevents rank from being a passive accumulation. The user must _do something_ and
show it. Rank-up is one of the few moments that earns a full cinematic interruption.

---

## 8. Classes

A class describes current development identity. It is descriptive, never restrictive — no quest, skill,
or reward is ever locked behind a class.

Starting classes: Scholar, Developer, Athlete, Strategist, Creator, Builder, Explorer, Hybrid.

Class is **inferred** from the actual distribution of XP, mastery, and completed work across domains,
then **proposed** to the user, who accepts, rejects, or overrides. The system observes; the user
decides. Hybrids emerge automatically when two domains each exceed 30 % of weighted activity —
Scholar-Developer, Athlete-Strategist, Technical Creator, Builder-Entrepreneur.

Evolution requires sustained pattern evidence over months, not a threshold crossed once. Class history
is permanent and forms part of the timeline narrative. Users may define their own classes.

---

## 9. Quests

Full type list, lifecycle, and generation inputs are specified in `docs/MASTER_SPEC.md` §12.

Generation priority — relevance strictly dominates novelty:

```
score = 0.35 × goalAlignment
      + 0.25 × neglectRecovery
      + 0.20 × scheduleFeasibility
      + 0.10 × difficultyFit
      + 0.10 × variety
```

`scheduleFeasibility` is a hard filter before it is a score: a quest that cannot fit in the user's
actual available time today is discarded, not merely ranked lower. A quest that conflicts with the
user's real life is a design failure, not a random-variation feature.

Recent workload and recovery state clamp total daily proposed effort. The engine will propose _less_
when the user is depleted, and it explains that it is doing so.

**Daily workload budget (ADR-0009).** Implemented in `src/core/quests/workload-budget.ts`. A day's
budget is roughly 75% of stated available time, reduced further under moderate or low recovery, then
reduced again by whatever is already committed to the day (accepted, postponed or completed quests) —
so a second generation call, or a manual recalibration, can never simply add a fixed number on top of
an already-full day. Calibrated defaults, not universal truths: a fresh day proposes 3–5 primary
quests and at most one demanding-or-severe quest, both real numbers a developer can retune, not
claimed constants of human capacity. This budget is a hard cap during selection, not a
score — a quest that would push the day over it is removed from the candidate pool the same way an
infeasible schedule is.

**Hard duplicate exclusion (ADR-0010).** A template already `detected`, `offered`, `accepted` or
`postponed` for the user is hard-excluded from candidates, not merely down-ranked by the existing
`variety` score term. Because generation is entirely template-based, the template id is already a
deterministic content fingerprint — the same template proposed twice while an earlier copy is still
live is definitionally the same content, not a coincidence to be scored.

**Failure behaviour:** no XP loss, no streak destruction, no shame language. A missed quest triggers a
short reflection prompt (skippable) and feeds difficulty recalibration. Three consecutive misses in a
domain lower proposed difficulty automatically and prompt the Architect to ask whether the goal itself
still matters — because the most useful response to repeated failure is usually to fix the goal, not
to push harder.

### 9.1 Daily Protocols and objectives (ADR-0012)

A Daily Protocol is a quest (`quest_type = 'daily_protocol'`) whose content is several first-class,
independently-progressable objectives (`src/core/quests/objectives.ts`) instead of free-text steps —
the structured, satisfying clarity of a single daily mission, without copying any protected work's
text, layout or assets. Objectives support numeric progress (repetitions, duration, distance,
quantity, a numeric score or a percentage) or zero/one completion (a checklist item or a plain binary
confirmation). A protocol's overall completion is driven by its **mandatory** objectives only — an
undone optional objective never blocks or dilutes it, the same principle already applied to optional
workload generally.

Physical objective targets are never a fixed benchmark. They are calibrated from the user's own
`physical_baseline` — self-reported *comfortable* capacity, editable at any time from Settings — at
80% of that figure, which is deliberately sustainable rather than maximal (a protocol is meant to be
repeated, not passed once). A user who has not set a baseline still gets the objective, at a
conservative, clearly-smaller default. True adaptive progressive overload (targets rising over time
with demonstrated consistency) is not yet implemented; today's 80%-of-stated-baseline is the
calibration mechanism, and it is a real function of the user's own numbers rather than a placeholder.

---

## 10. Bosses

Boss HP maps to **real preparation requirements**, never to clicks.

```
bossProgress = Σ (componentWeight × componentCompletion)
```

For an examination: topics reviewed, practice questions completed, mock tests taken, errors corrected
and re-tested, confidence calibration, sleep plan. For a software project: requirements clarified,
architecture decided, core features implemented, tests passing, accessibility reviewed, deployed,
feedback collected.

Phases unlock on preparation thresholds. Weaknesses are derived from the user's own error patterns.
**Post-battle review is mandatory and is where most of the value lives**: outcome recorded, lessons
captured, mastery updated from the actual result, rematch logic seeded.

A boss can be won partially. An exam scored below target after genuine preparation is a partial
victory that still awards preparation mastery — because the preparation was real and did happen. The
outcome is recorded honestly, without either inflation or punishment.

---

## 11. Integrity

The integrity engine returns `accept`, `recalibrate(factor, reason)`, or `flagForReview(reason)`.
It **never blocks the user and never accuses.**

Detected patterns: near-duplicate entries in a short window; fragmentation of one action into many
trivial quests; implausible volume relative to elapsed time; timer sessions with no corresponding
output; retroactive edits that repeatedly increase rewards; recurrence-rule exploitation; duplicate
evidence artefacts.

Language is fixed and non-negotiable:

> "This activity appears similar to several recent entries. Would you like to combine these records?"
> "This reward may be recalibrated to preserve progression balance."

Never: cheating, fraud, dishonest, gaming, suspicious, violation.

The user owns their data and may override any verdict. Overrides are recorded in the audit log —
visible to them, never punitive. The purpose is to keep the user's own numbers meaningful _to them_;
there is no one else to deceive, so the tone must be that of a helpful ledger, not an adversary.

---

## 12. Safety constraints on all generated content

Hard rules enforced in `src/core/architect/safety/`, applied to rules-engine and AI output alike:

- Never propose reducing sleep, and never reward doing so.
- Never propose training that increases volume more than ~10 % week over week.
- Never propose calorie restriction, fasting, or weight targets. Nutrition quests concern habit
  quality, hydration, and consistency — never restriction.
- Never propose training an area flagged as injured or limited.
- Never use self-critical, shaming, or body-comparative framing.
- Never give medical, diagnostic, or dosage advice; direct to qualified adults and professionals.
- Never create achievements for extremes: all-nighters, skipped meals, training through injury,
  unbroken streaks that would punish rest.
- Age-aware: while the user is a minor, strength progression is conservative and framed around
  technique, control, and consistency rather than maximal load.

These are unit-tested with adversarial fixtures, including AI responses crafted to violate them.

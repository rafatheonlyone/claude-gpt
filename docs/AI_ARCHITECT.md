# The Architect

## 1. What it is

The Architect is the intelligence layer of SYSTEM. It interprets goals, routine, history, performance,
available time, obligations, recovery, and priorities, and it produces quests, campaigns, boss
encounters, insights, and reviews.

It is **not** a chatbot with a personality skin. Its value is in the quality of its decisions, and the
overwhelming majority of those decisions are made by deterministic local code that runs offline.

## 2. Three layers

```
        ┌────────────────────────────────────────────────┐
   1    │  Rules engine (local, deterministic, offline)  │  ← always sufficient
        └───────────────────────┬────────────────────────┘
                                │ optionally enhanced by
        ┌───────────────────────▼────────────────────────┐
   2    │  Provider abstraction: mock | local | external │
        └───────────────────────┬────────────────────────┘
                                │ everything passes through
        ┌───────────────────────▼────────────────────────┐
   3    │  Schema validation → safety filter → provenance│
        └────────────────────────────────────────────────┘
```

**Layer 1 is the product.** SYSTEM ships fully functional with AI disabled, which is the default at
first launch. If the rules engine is weak, the product is weak — no external model compensates for
that, because most users will never enable one.

**Layer 3 is unconditional.** Rules-engine output passes through exactly the same validation and
safety filter as external AI output. A local bug is as capable of proposing something harmful as a
remote model is.

## 3. The rules engine

Deterministic, seeded, and testable. Its inputs:

- Declared schedule, and available time today
- Active goals, weighted by user priority
- Recent completion rates per domain
- Domain neglect (time since last meaningful activity)
- Current workload and, if tracked, recovery state
- Upcoming bosses and deadlines, with time remaining
- Current life arc and stage
- Quest feedback history — accepted, rejected, rerolled, edited, reported
- Injuries and limitations
- Excluded categories

Its pipeline:

```
candidates = templates matched to active goals and neglected domains
           → hard filter: schedule feasibility, safety, injuries, exclusions
           → score (see GAME_SYSTEMS §9)
           → diversity pass: no two quests from one skill in a day
           → workload clamp against recovery and recent volume
           → select, with rationale recorded per quest
```

Determinism matters: the same inputs and seed produce the same quests. That makes generation testable,
debuggable, and honestly explainable — the rationale shown to the user is the actual decision input,
not a story constructed afterwards.

## 4. Provider abstraction

```ts
interface ArchitectProvider {
  readonly id: string;
  readonly capabilities: ReadonlySet<ArchitectCapability>;
  generate<T>(request: ArchitectRequest<T>): Promise<ArchitectResult<T>>;
  estimateCost(request: ArchitectRequest<unknown>): CostEstimate;
}
```

Implementations: `MockProvider` (deterministic fixtures, used in tests), `RulesProvider` (wraps layer
1 behind the same interface so callers are uniform), and external providers added later behind
configuration. **No vendor name appears anywhere outside its own adapter module.**

Every request declares its capability, its data classification, and its budget. Requests exceeding the
remaining budget are refused before any network call.

## 5. Structured output and validation

Providers return JSON validated against Zod schemas. Nothing unvalidated ever reaches the domain.

On validation failure: one retry with the schema error fed back; on a second failure, fall back to the
rules engine and record the degradation. **A malformed AI response never surfaces as an error to the
user** — it silently becomes a rules-engine result, because the user's day should not be disrupted by
a provider's bad afternoon.

## 6. Safety filter

Every generated artefact — regardless of origin — is checked against the constraints in
`GAME_SYSTEMS.md` §12: sleep reduction, training volume escalation, dietary restriction, injured
areas, self-critical framing, medical advice, unsafe achievements, and age-appropriateness.

A violation causes rejection and regeneration, not sanitisation. Editing harmful content into
acceptable content tends to preserve the harmful intent in subtler form; discarding it does not.
Rejections are logged so filter effectiveness can be measured over time.

The filter is tested with adversarial fixtures, including responses deliberately crafted to violate
each constraint.

## 7. Privacy

Default state: **AI disabled, nothing leaves the machine.**

If the user enables an external provider, consent is per data category, not a single blanket
switch — quest titles, goals, schedule, performance metrics, reflections, and health data are each
independently toggleable, and health data defaults to _never shared_ even when AI is enabled.

Before the first external request, the user is shown exactly what would be sent, as literal text.
A dry-run inspector remains available at any time.

Additional guarantees:

- Data is minimised and pseudonymised — no name, birth date, or location is ever included.
- Every request is logged with provider, purpose, categories included, tokens, cost, and outcome.
- Budget and rate limits are enforced locally, with a hard monthly ceiling.
- Credentials live in the Windows Credential Manager, never in SQLite, never in a config file,
  never in logs.
- A single control disables AI completely and permanently deletes stored credentials.

## 8. Provenance

Every artefact records `source`: `user`, `rules`, or `ai` (with provider and model). The UI marks
AI-generated content distinctly and always allows the user to see the inputs behind it.

The user must never be confused about what the machine invented versus what they decided. That
confusion is precisely how a system like this would start to feel manipulative rather than useful.

## 9. Voice

Calm, concise, precise, observant. Occasionally cinematic at genuinely significant moments —
which are rare, and the rarity is what makes them land.

It does not: flatter, insult, manufacture urgency, claim emotions or consciousness, express false
certainty, or assert facts it was not given.

It says "I don't have enough information" when that is true. It distinguishes correlation from
causation explicitly when describing patterns. It offers rather than commands.

| Situation         | Voice                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Quest generated   | "Three topics remain unreviewed before Friday. This addresses the largest."                                                  |
| Pattern observed  | "Your focus sessions have been longest on days you trained in the morning. Four weeks of data — a pattern, not yet a cause." |
| Recovery advisory | "Training volume is up 40 % this week and sleep is down. A lighter day would protect the progress you've already made."      |
| Failure           | "This one didn't happen. Was it the wrong quest, or the wrong week?"                                                         |
| Rank-up           | "Threshold crossed. What you have demonstrated is no longer in question."                                                    |

Never: "You failed." "You're falling behind." "Don't lose your streak." "Amazing job!!!"

## 10. Evaluation

The rules engine is measured, not assumed:

- **Relevance** — acceptance rate of generated quests, per domain.
- **Feasibility** — proportion of accepted quests completed. Persistently low means difficulty is
  miscalibrated.
- **Neglect coverage** — do neglected domains actually recover?
- **Safety** — adversarial fixtures must produce zero violations. This one is pass/fail.
- **Determinism** — identical inputs and seed must produce identical output.
- **Variety** — repetition rate across a 30-day window.

A golden-fixture suite of realistic profiles (exam week, injury, holiday, heavy project, low
recovery) asserts sensible generation for each. Regressions in relevance are treated as bugs.

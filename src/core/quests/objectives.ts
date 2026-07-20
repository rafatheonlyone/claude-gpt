/**
 * First-class quest objectives (`docs/GAME_SYSTEMS.md` §9, ADR-0012).
 *
 * A quest — most commonly a Daily Protocol — can carry several measurable
 * objectives instead of being modelled as many separate single-purpose
 * quests. This is deliberately a small, closed set of kinds rather than the
 * full twelve enumerated in the milestone brief: `repetitions`,
 * `duration_seconds`, `distance_meters` and `quantity` share identical
 * numeric-progress semantics and are distinguished only by unit/label, so
 * one implementation covers all of them. `checklist` and `binary` are the
 * same zero/one case under different names in the brief. `numeric_score` and
 * `percentage` reduce to the same "current vs target" shape too. The
 * remaining kinds from the brief (project deliverable, study topic, practice
 * result, manual confirmation) are represented as `checklist` items with a
 * descriptive label rather than new kinds — introducing a distinct enum
 * value for each would multiply the switch statements in every consumer
 * without adding real behavioural difference. Extending the kind set later,
 * if a genuinely different progress shape is needed, does not require a
 * migration for existing rows.
 */

export const OBJECTIVE_KINDS = [
  'repetitions',
  'duration_seconds',
  'distance_meters',
  'quantity',
  'checklist',
  'numeric_score',
  'percentage',
  'binary',
] as const;

export type ObjectiveKind = (typeof OBJECTIVE_KINDS)[number];

/** Kinds with no numeric target — complete on a single confirming action. */
const ZERO_TARGET_KINDS = new Set<ObjectiveKind>(['checklist', 'binary']);

export interface ObjectiveProgress {
  readonly id: string;
  readonly kind: ObjectiveKind;
  readonly label: string;
  /** `null` for checklist/binary objectives — completion is 0 or 1, not a count. */
  readonly target: number | null;
  readonly current: number;
  readonly unit: string | null;
  readonly optional: boolean;
  readonly completedAt: string | null;
}

export function isObjectiveComplete(objective: Pick<ObjectiveProgress, 'kind' | 'target' | 'current'>): boolean {
  if (objective.target === null || ZERO_TARGET_KINDS.has(objective.kind)) {
    return objective.current >= 1;
  }
  return objective.current >= objective.target;
}

/** 0–1. Clamped both directions so an over-shot objective never reports more than "done". */
export function objectiveCompletionFraction(
  objective: Pick<ObjectiveProgress, 'kind' | 'target' | 'current'>,
): number {
  if (objective.target === null || ZERO_TARGET_KINDS.has(objective.kind)) {
    return objective.current >= 1 ? 1 : 0;
  }
  if (objective.target <= 0) return 1;
  return Math.min(1, Math.max(0, objective.current / objective.target));
}

export interface ProtocolProgress {
  /** Mandatory objectives completed. */
  readonly completed: number;
  /** Total mandatory objectives — optional ones do not count toward this. */
  readonly total: number;
  /** 0–1 across mandatory objectives only. */
  readonly fraction: number;
}

/**
 * A protocol's overall progress is driven by its mandatory objectives only —
 * an optional objective left undone must never block or dilute completion,
 * the same principle that keeps optional quests from counting as workload.
 */
export function protocolProgress(
  objectives: ReadonlyArray<Pick<ObjectiveProgress, 'kind' | 'target' | 'current' | 'optional'>>,
): ProtocolProgress {
  const mandatory = objectives.filter((o) => !o.optional);
  const completed = mandatory.filter(isObjectiveComplete).length;
  return {
    completed,
    total: mandatory.length,
    fraction: mandatory.length === 0 ? 1 : completed / mandatory.length,
  };
}

/**
 * Calibrates a physical objective's target from the user's own baseline
 * rather than a fixed benchmark (milestone: never prescribe 100 push-ups or
 * a 10 km run as a default). 80% of a self-reported *comfortable* capacity
 * is deliberately sustainable, not maximal — a daily protocol is meant to be
 * repeatable, not a one-off test.
 *
 * When no baseline is set, falls back to a conservative, clearly-labelled
 * default rather than refusing to generate the objective at all.
 */
export function calibratedTarget(comfortableCapacity: number | null, conservativeDefault: number): number {
  if (comfortableCapacity === null || comfortableCapacity <= 0) return conservativeDefault;
  return Math.max(1, Math.round(comfortableCapacity * 0.8));
}

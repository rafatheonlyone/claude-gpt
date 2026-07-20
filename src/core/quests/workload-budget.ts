import type { RecoveryState } from './generator';

/**
 * Daily workload planning (`docs/GAME_SYSTEMS.md` §9, ADR-0009).
 *
 * A single source of truth for "how much may today reasonably hold", used by
 * both the generator (to cap what it proposes) and the UI (to explain the
 * plan). Before this existed, `generateForDate` and `recalibrateToday` each
 * proposed a fixed number of quests without ever checking what the day
 * already carried — the concrete failure this fixes is documented in
 * migration 003.
 *
 * Every number here is deliberately a *calibrated default*, not a claimed
 * universal truth (see the milestone brief): the constants below are the
 * starting point, not a promise that 3–5 quests is correct for everyone.
 */

/** Reserve a slice of available time so the day never fills completely. */
const BASE_UTILISATION = 0.75;

/** Absolute ceiling on primary (non-optional) quests in a single day. */
const MAX_PRIMARY_QUESTS = 5;
/** Floor — below this, a day is not "planned", it is empty. */
const MIN_PRIMARY_QUESTS = 3;
/** At most one demanding/severe quest per day by default. */
const MAX_DEMANDING_QUESTS = 1;

export interface WorkloadBudgetInput {
  /** Minutes the user actually has today. */
  readonly availableMinutes: number;
  readonly recoveryState: RecoveryState;
  /** Minutes already committed today: accepted + postponed + completed quests. */
  readonly committedMinutes: number;
  /** How many of those committed quests are primary (non-optional). */
  readonly committedPrimaryCount: number;
  /** Whether a demanding/severe quest is already committed today. */
  readonly committedDemandingOrAbove: boolean;
}

export type BudgetReasonCode =
  | 'base'
  | 'low_recovery'
  | 'moderate_recovery'
  | 'already_committed'
  | 'day_full'
  | 'demanding_already_present'
  | 'primary_cap_reached';

export interface WorkloadBudget {
  readonly availableMinutes: number;
  /** Total minutes today should hold, across everything already committed and anything new. */
  readonly budgetMinutes: number;
  readonly committedMinutes: number;
  /** budgetMinutes − committedMinutes, floored at 0. What generation may still add. */
  readonly remainingMinutes: number;
  /** True once committed work already meets or exceeds the budget. */
  readonly overloaded: boolean;
  /** How many more primary quests generation may add today. */
  readonly maxNewPrimary: number;
  /** How many more demanding/severe quests generation may add today (0 or 1). */
  readonly maxNewDemanding: number;
  /** Machine-readable reasons, in the order they were applied — the UI localizes these. */
  readonly reasons: readonly BudgetReasonCode[];
}

export function computeDailyWorkloadBudget(input: WorkloadBudgetInput): WorkloadBudget {
  const reasons: BudgetReasonCode[] = ['base'];
  let budgetMinutes = Math.max(0, input.availableMinutes) * BASE_UTILISATION;

  if (input.recoveryState === 'low') {
    budgetMinutes *= 0.5;
    reasons.push('low_recovery');
  } else if (input.recoveryState === 'moderate') {
    budgetMinutes *= 0.8;
    reasons.push('moderate_recovery');
  }

  budgetMinutes = Math.round(budgetMinutes);

  const committedMinutes = Math.max(0, input.committedMinutes);
  if (committedMinutes > 0) reasons.push('already_committed');

  const remainingMinutes = Math.max(0, budgetMinutes - committedMinutes);
  const overloaded = committedMinutes >= budgetMinutes && budgetMinutes > 0;
  if (overloaded) reasons.push('day_full');

  let maxNewPrimary = Math.max(0, MAX_PRIMARY_QUESTS - input.committedPrimaryCount);
  if (input.committedPrimaryCount >= MAX_PRIMARY_QUESTS) reasons.push('primary_cap_reached');
  // Never propose a primary quest with no time left for it, regardless of count headroom.
  if (remainingMinutes <= 0) maxNewPrimary = 0;

  const maxNewDemanding = input.committedDemandingOrAbove ? 0 : MAX_DEMANDING_QUESTS;
  if (input.committedDemandingOrAbove) reasons.push('demanding_already_present');

  return {
    availableMinutes: input.availableMinutes,
    budgetMinutes,
    committedMinutes,
    remainingMinutes,
    overloaded,
    maxNewPrimary,
    maxNewDemanding,
    reasons,
  };
}

/** The lower bound on how many primary quests a *fresh* day (nothing committed yet) should propose. */
export const MINIMUM_DAILY_PRIMARY_QUESTS = MIN_PRIMARY_QUESTS;
export const MAXIMUM_DAILY_PRIMARY_QUESTS = MAX_PRIMARY_QUESTS;

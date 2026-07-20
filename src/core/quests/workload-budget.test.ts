import { describe, it, expect } from 'vitest';
import { computeDailyWorkloadBudget, MAXIMUM_DAILY_PRIMARY_QUESTS } from './workload-budget';

const base = {
  availableMinutes: 120,
  recoveryState: 'unknown' as const,
  committedMinutes: 0,
  committedPrimaryCount: 0,
  committedDemandingOrAbove: false,
};

describe('computeDailyWorkloadBudget', () => {
  it('reserves a slice of available time rather than filling the whole day', () => {
    const budget = computeDailyWorkloadBudget(base);
    expect(budget.budgetMinutes).toBeLessThan(base.availableMinutes);
    expect(budget.budgetMinutes).toBe(90);
  });

  it('reduces the budget on low recovery', () => {
    const budget = computeDailyWorkloadBudget({ ...base, recoveryState: 'low' });
    expect(budget.budgetMinutes).toBeLessThan(computeDailyWorkloadBudget(base).budgetMinutes);
    expect(budget.reasons).toContain('low_recovery');
  });

  it('reduces the budget on moderate recovery, less than low', () => {
    const low = computeDailyWorkloadBudget({ ...base, recoveryState: 'low' });
    const moderate = computeDailyWorkloadBudget({ ...base, recoveryState: 'moderate' });
    const full = computeDailyWorkloadBudget(base);
    expect(low.budgetMinutes).toBeLessThan(moderate.budgetMinutes);
    expect(moderate.budgetMinutes).toBeLessThan(full.budgetMinutes);
  });

  it('subtracts already-committed minutes from what remains', () => {
    const budget = computeDailyWorkloadBudget({ ...base, committedMinutes: 60 });
    expect(budget.remainingMinutes).toBe(budget.budgetMinutes - 60);
  });

  it('never lets remaining minutes go negative', () => {
    const budget = computeDailyWorkloadBudget({ ...base, committedMinutes: 10_000 });
    expect(budget.remainingMinutes).toBe(0);
  });

  it('flags a day as overloaded once committed work meets the budget', () => {
    const budget = computeDailyWorkloadBudget({ ...base, committedMinutes: 90 });
    expect(budget.overloaded).toBe(true);
    expect(budget.reasons).toContain('day_full');
  });

  it('does not flag overload for a fresh, empty day', () => {
    const budget = computeDailyWorkloadBudget(base);
    expect(budget.overloaded).toBe(false);
  });

  it('caps primary quests and reduces headroom as more are already committed', () => {
    const fresh = computeDailyWorkloadBudget(base);
    expect(fresh.maxNewPrimary).toBe(MAXIMUM_DAILY_PRIMARY_QUESTS);

    const partiallyFull = computeDailyWorkloadBudget({ ...base, committedPrimaryCount: 3 });
    expect(partiallyFull.maxNewPrimary).toBe(MAXIMUM_DAILY_PRIMARY_QUESTS - 3);

    const full = computeDailyWorkloadBudget({ ...base, committedPrimaryCount: MAXIMUM_DAILY_PRIMARY_QUESTS });
    expect(full.maxNewPrimary).toBe(0);
    expect(full.reasons).toContain('primary_cap_reached');
  });

  it('never proposes a new primary quest once time is exhausted, even with count headroom', () => {
    const budget = computeDailyWorkloadBudget({ ...base, committedMinutes: 90, committedPrimaryCount: 1 });
    expect(budget.maxNewPrimary).toBe(0);
  });

  it('allows at most one demanding quest per day by default', () => {
    const fresh = computeDailyWorkloadBudget(base);
    expect(fresh.maxNewDemanding).toBe(1);

    const alreadyDemanding = computeDailyWorkloadBudget({ ...base, committedDemandingOrAbove: true });
    expect(alreadyDemanding.maxNewDemanding).toBe(0);
    expect(alreadyDemanding.reasons).toContain('demanding_already_present');
  });

  it('a normal day never permits a 19-hour (1140-minute) plan', () => {
    // The exact real-world symptom this milestone exists to prevent.
    const budget = computeDailyWorkloadBudget({ ...base, availableMinutes: 120 });
    expect(budget.budgetMinutes).toBeLessThan(120);
    expect(budget.budgetMinutes).toBeLessThan(1140);
  });
});

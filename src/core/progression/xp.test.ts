import { describe, it, expect } from 'vitest';
import {
  calculateXpAward,
  applyDiminishingReturns,
  completionFactor,
  DIFFICULTY_BASE_XP,
  DEFAULT_DOMAIN_DAILY_SOFT_CAP,
} from './xp';

describe('completionFactor', () => {
  it('gives full credit for full completion', () => {
    expect(completionFactor(1)).toBe(1);
  });

  it('gives nothing only for nothing attempted', () => {
    expect(completionFactor(0)).toBe(0);
  });

  it('keeps a genuine partial attempt clearly worthwhile', () => {
    // Attempting and falling short must always beat not trying, so that
    // abandoning a quest is never the rational choice.
    expect(completionFactor(0.1)).toBeGreaterThan(0.25);
    expect(completionFactor(0.5)).toBeCloseTo(0.625, 10);
  });

  it('increases monotonically', () => {
    let previous = -1;
    for (let c = 0; c <= 1.0001; c += 0.05) {
      const value = completionFactor(Math.min(c, 1));
      expect(value).toBeGreaterThan(previous);
      previous = value;
    }
  });

  it('rejects out-of-range input', () => {
    expect(() => completionFactor(1.5)).toThrow(RangeError);
    expect(() => completionFactor(-0.1)).toThrow(RangeError);
  });
});

describe('applyDiminishingReturns', () => {
  const cap = DEFAULT_DOMAIN_DAILY_SOFT_CAP;

  it('credits fully below the soft cap', () => {
    expect(applyDiminishingReturns(100, 0, cap)).toBe(100);
    expect(applyDiminishingReturns(cap, 0, cap)).toBe(cap);
  });

  it('matches the documented curve beyond the cap', () => {
    // docs/GAME_SYSTEMS.md §3 publishes these totals.
    expect(applyDiminishingReturns(800, 0, cap)).toBeCloseTo(677, 0);
    expect(applyDiminishingReturns(1200, 0, cap)).toBeCloseTo(839, 0);
    expect(applyDiminishingReturns(2000, 0, cap)).toBeCloseTo(1044, 0);
  });

  it('never reaches zero, so honest effort is never wasted', () => {
    // Even after an implausible day, the next real action still counts.
    const afterHugeDay = applyDiminishingReturns(60, 100_000, cap);
    expect(afterHugeDay).toBeGreaterThan(0);
  });

  it('is order-independent: splitting an award changes nothing', () => {
    // Otherwise the system would quietly reward fragmenting work into many
    // small entries, which is exactly the farming pattern it must not create.
    const single = applyDiminishingReturns(600, 0, cap);
    const split =
      applyDiminishingReturns(200, 0, cap) +
      applyDiminishingReturns(200, 200, cap) +
      applyDiminishingReturns(200, 400, cap);
    expect(split).toBeCloseTo(single, 6);
  });

  it('decreases marginal value as the day accumulates', () => {
    const first = applyDiminishingReturns(100, 0, cap);
    const later = applyDiminishingReturns(100, 1000, cap);
    expect(later).toBeLessThan(first);
  });
});

describe('calculateXpAward', () => {
  it('awards the base value for a self-reported full completion', () => {
    const result = calculateXpAward({
      difficulty: 'moderate',
      evidence: 'self_reported',
      completion: 1,
    });
    expect(result.creditedXp).toBe(DIFFICULTY_BASE_XP.moderate);
    expect(result.diminished).toBe(0);
  });

  it('treats self-report as the baseline rather than a penalty', () => {
    const selfReported = calculateXpAward({
      difficulty: 'moderate',
      evidence: 'self_reported',
      completion: 1,
    });
    expect(selfReported.creditedXp).toBe(DIFFICULTY_BASE_XP.moderate);
  });

  it('rewards stronger evidence with a bonus', () => {
    const base = calculateXpAward({
      difficulty: 'moderate',
      evidence: 'self_reported',
      completion: 1,
    }).creditedXp;
    const verified = calculateXpAward({
      difficulty: 'moderate',
      evidence: 'verified',
      completion: 1,
    }).creditedXp;
    expect(verified).toBeGreaterThan(base);
    expect(verified).toBe(Math.round(DIFFICULTY_BASE_XP.moderate * 1.4));
  });

  it('scales with difficulty', () => {
    const ordered = (['trivial', 'light', 'moderate', 'demanding', 'severe'] as const).map(
      (difficulty) =>
        calculateXpAward({ difficulty, evidence: 'self_reported', completion: 1 }).creditedXp,
    );
    for (let i = 1; i < ordered.length; i += 1) {
      expect(ordered[i]!).toBeGreaterThan(ordered[i - 1]!);
    }
  });

  it('applies the integrity factor without ever going negative', () => {
    const result = calculateXpAward({
      difficulty: 'severe',
      evidence: 'self_reported',
      completion: 1,
      integrityFactor: 0.5,
    });
    expect(result.creditedXp).toBe(125);
    expect(result.creditedXp).toBeGreaterThanOrEqual(0);
  });

  it('rejects an out-of-range integrity factor', () => {
    expect(() =>
      calculateXpAward({
        difficulty: 'light',
        evidence: 'self_reported',
        completion: 1,
        integrityFactor: 1.5,
      }),
    ).toThrow(RangeError);
  });

  it('always produces an explainable breakdown', () => {
    // docs/GAME_SYSTEMS.md: a number the user cannot have explained to them is
    // a number SYSTEM should not display.
    const result = calculateXpAward({
      difficulty: 'demanding',
      evidence: 'artefact',
      completion: 0.6,
      integrityFactor: 0.8,
      domainXpToday: 500,
    });
    expect(result.breakdown.length).toBeGreaterThanOrEqual(4);
    expect(result.breakdown.every((b) => b.label.length > 0 && b.value.length > 0)).toBe(true);
  });

  it('never awards XP for zero completion', () => {
    const result = calculateXpAward({
      difficulty: 'severe',
      evidence: 'verified',
      completion: 0,
    });
    expect(result.creditedXp).toBe(0);
  });

  it('cannot be farmed by fragmenting one action into many trivial entries', () => {
    // Twenty trivial quests must not out-earn the honest equivalent.
    const cap = DEFAULT_DOMAIN_DAILY_SOFT_CAP;
    let earned = 0;
    for (let i = 0; i < 20; i += 1) {
      earned += calculateXpAward({
        difficulty: 'trivial',
        evidence: 'self_reported',
        completion: 1,
        domainXpToday: earned,
      }).creditedXp;
    }
    expect(earned).toBeLessThan(cap);
  });
});

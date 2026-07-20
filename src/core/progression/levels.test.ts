import { describe, it, expect } from 'vitest';
import { xpRequiredForLevel, cumulativeXpForLevel, levelFromTotalXp, levelsGained } from './levels';

describe('xpRequiredForLevel', () => {
  it('matches the documented calibration points', () => {
    // These values are published in docs/GAME_SYSTEMS.md §2. If the curve
    // changes, the documentation must change with it — hence the assertion.
    expect(xpRequiredForLevel(1)).toBe(100);
    expect(xpRequiredForLevel(5)).toBe(355);
    expect(xpRequiredForLevel(10)).toBe(866);
    expect(xpRequiredForLevel(25)).toBe(3200);
    expect(xpRequiredForLevel(50)).toBe(8914);
    expect(xpRequiredForLevel(100)).toBe(25075);
  });

  it('increases monotonically and without a cap', () => {
    let previous = 0;
    for (let level = 1; level <= 500; level += 1) {
      const required = xpRequiredForLevel(level);
      expect(required).toBeGreaterThan(previous);
      previous = required;
    }
  });

  it('uses a lighter curve for domain levels', () => {
    expect(xpRequiredForLevel(10, 'domain')).toBeLessThan(xpRequiredForLevel(10, 'global'));
  });

  it('rejects invalid levels rather than returning nonsense', () => {
    expect(() => xpRequiredForLevel(0)).toThrow(RangeError);
    expect(() => xpRequiredForLevel(-1)).toThrow(RangeError);
    expect(() => xpRequiredForLevel(Number.NaN)).toThrow(RangeError);
  });
});

describe('cumulativeXpForLevel', () => {
  it('starts at zero for level 1', () => {
    expect(cumulativeXpForLevel(1)).toBe(0);
  });

  it('equals the sum of individual requirements', () => {
    let sum = 0;
    for (let level = 1; level < 30; level += 1) sum += xpRequiredForLevel(level);
    expect(cumulativeXpForLevel(30)).toBe(sum);
  });

  it('places level 100 near the ten-year budget of roughly one million XP', () => {
    // The whole curve is calibrated on this assumption (docs/GAME_SYSTEMS.md §2):
    // ~250 XP/day sustained for ten years is ~912k XP.
    const total = cumulativeXpForLevel(100);
    expect(total).toBeGreaterThan(900_000);
    expect(total).toBeLessThan(1_150_000);
  });
});

describe('levelFromTotalXp', () => {
  it('is the exact inverse of the cumulative curve at boundaries', () => {
    for (const level of [1, 2, 5, 17, 40, 99, 150]) {
      const atBoundary = levelFromTotalXp(cumulativeXpForLevel(level));
      expect(atBoundary.level).toBe(level);
      expect(atBoundary.xpIntoLevel).toBe(0);
      expect(atBoundary.fraction).toBe(0);
    }
  });

  it('does not advance a level one XP short of the requirement', () => {
    const boundary = cumulativeXpForLevel(10);
    expect(levelFromTotalXp(boundary - 1).level).toBe(9);
    expect(levelFromTotalXp(boundary).level).toBe(10);
  });

  it('reports progress within the current level', () => {
    const progress = levelFromTotalXp(cumulativeXpForLevel(5) + 100);
    expect(progress.level).toBe(5);
    expect(progress.xpIntoLevel).toBe(100);
    expect(progress.xpForNextLevel).toBe(xpRequiredForLevel(5));
    expect(progress.fraction).toBeCloseTo(100 / xpRequiredForLevel(5), 10);
  });

  it('starts a new user at level 1 with zero progress', () => {
    const progress = levelFromTotalXp(0);
    expect(progress.level).toBe(1);
    expect(progress.xpIntoLevel).toBe(0);
    expect(progress.totalXp).toBe(0);
  });

  it('rejects negative or non-finite totals', () => {
    expect(() => levelFromTotalXp(-1)).toThrow(RangeError);
    expect(() => levelFromTotalXp(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('levelsGained', () => {
  it('counts levels crossed by an award', () => {
    expect(levelsGained(0, cumulativeXpForLevel(3))).toBe(2);
  });

  it('returns zero when no boundary is crossed', () => {
    expect(levelsGained(0, 50)).toBe(0);
  });

  it('never returns a negative value, even if XP were corrected downward', () => {
    // Corrections are legitimate (docs/GAME_SYSTEMS.md §11). They must not
    // produce a negative "levels gained" that a caller might award as a loss.
    expect(levelsGained(cumulativeXpForLevel(10), 0)).toBe(0);
  });
});

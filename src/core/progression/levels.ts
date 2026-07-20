/**
 * Level curve. See `docs/GAME_SYSTEMS.md` §2 for the calibration reasoning.
 *
 * Pure and versioned: every awarded event records the formula version that
 * produced it, so recalibrating this curve never silently rewrites history.
 */

export const LEVEL_FORMULA_VERSION = 1;

/** Global level coefficient, calibrated so level ~100 is a ten-year achievement. */
const GLOBAL_COEFFICIENT = 25;

/** Domain XP is a subset of global XP, so domain levels advance on a lighter curve. */
const DOMAIN_COEFFICIENT = 15;

/** Floor so the very first level-up needs a real session rather than one tap. */
const BASE_REQUIREMENT = 75;

export type LevelScale = 'global' | 'domain';

function coefficientFor(scale: LevelScale): number {
  return scale === 'global' ? GLOBAL_COEFFICIENT : DOMAIN_COEFFICIENT;
}

/**
 * XP required to advance *from* `level` to `level + 1`.
 *
 * Superlinear (n^1.5): early levels arrive quickly because starting is the
 * hardest part, then the curve slows permanently so late progress means
 * something. There is no cap and no reset that erases history.
 */
export function xpRequiredForLevel(level: number, scale: LevelScale = 'global'): number {
  if (!Number.isFinite(level) || level < 1) {
    throw new RangeError(`level must be a finite number >= 1, received ${level}`);
  }
  return BASE_REQUIREMENT + Math.round(coefficientFor(scale) * Math.pow(level, 1.5));
}

// Cumulative totals are requested on every render of a progress bar, so the
// prefix sums are memoised per scale and extended on demand.
const cumulativeCache: Record<LevelScale, number[]> = {
  global: [0, 0],
  domain: [0, 0],
};

/** Total XP needed to reach `level` from zero. `cumulativeXpForLevel(1) === 0`. */
export function cumulativeXpForLevel(level: number, scale: LevelScale = 'global'): number {
  if (!Number.isFinite(level) || level < 1) {
    throw new RangeError(`level must be a finite number >= 1, received ${level}`);
  }
  const cache = cumulativeCache[scale];
  for (let n = cache.length; n <= level; n += 1) {
    const previous = cache[n - 1] ?? 0;
    cache[n] = previous + xpRequiredForLevel(n - 1, scale);
  }
  return cache[level] ?? 0;
}

export interface LevelProgress {
  readonly level: number;
  /** XP accumulated inside the current level. */
  readonly xpIntoLevel: number;
  /** XP required to complete the current level. */
  readonly xpForNextLevel: number;
  /** Fraction of the current level completed, 0–1. */
  readonly fraction: number;
  readonly totalXp: number;
}

/**
 * Resolve total XP into a level and the progress within it.
 *
 * Walks upward from level 1. The curve is steep enough that even a decade of
 * dedicated use stays in the low hundreds of iterations, so a closed-form
 * inverse would trade clarity for no measurable gain.
 */
export function levelFromTotalXp(totalXp: number, scale: LevelScale = 'global'): LevelProgress {
  if (!Number.isFinite(totalXp) || totalXp < 0) {
    throw new RangeError(`totalXp must be a finite number >= 0, received ${totalXp}`);
  }

  let level = 1;
  let consumed = 0;

  for (;;) {
    const required = xpRequiredForLevel(level, scale);
    if (consumed + required > totalXp) break;
    consumed += required;
    level += 1;
  }

  const xpIntoLevel = totalXp - consumed;
  const xpForNextLevel = xpRequiredForLevel(level, scale);

  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    fraction: xpForNextLevel === 0 ? 0 : xpIntoLevel / xpForNextLevel,
    totalXp,
  };
}

/** Levels gained when total XP moves from `before` to `after`. Never negative. */
export function levelsGained(before: number, after: number, scale: LevelScale = 'global'): number {
  const from = levelFromTotalXp(before, scale).level;
  const to = levelFromTotalXp(after, scale).level;
  return Math.max(0, to - from);
}

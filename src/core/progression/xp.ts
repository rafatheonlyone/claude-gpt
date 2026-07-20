/**
 * XP awards and diminishing returns. See `docs/GAME_SYSTEMS.md` §3.
 *
 * Two rules govern everything here:
 *  - XP rewards real-world action, never time spent in the application.
 *  - Effort is never worth literally zero, so no honest work is ever wasted.
 */

export const XP_FORMULA_VERSION = 1;

export type Difficulty = 'trivial' | 'light' | 'moderate' | 'demanding' | 'severe';

/** Calibrated against real effort, not arbitrary tiers. */
export const DIFFICULTY_BASE_XP: Readonly<Record<Difficulty, number>> = {
  trivial: 10, // under 5 minutes
  light: 25, // ~15 minutes of real focus
  moderate: 60, // ~45 minutes of real work
  demanding: 120, // ~2 hours, or genuinely hard
  severe: 250, // a significant undertaking
};

export type EvidenceLevel = 'self_reported' | 'detailed' | 'artefact' | 'verified';

/**
 * Evidence is a bonus, never a penalty: self-report sits at 1.0.
 *
 * SYSTEM trusts the user by default. Evidence exists so their own future
 * confidence in the record is higher, not to satisfy a compliance gate.
 */
export const EVIDENCE_MULTIPLIER: Readonly<Record<EvidenceLevel, number>> = {
  self_reported: 1.0,
  detailed: 1.1,
  artefact: 1.25,
  verified: 1.4,
};

/** Any genuine attempt keeps at least this share of the reward. */
export const PARTIAL_COMPLETION_FLOOR = 0.25;

/** Per-domain, per-day soft cap before diminishing returns engage. */
export const DEFAULT_DOMAIN_DAILY_SOFT_CAP = 400;

export interface XpAwardInput {
  readonly difficulty: Difficulty;
  readonly evidence: EvidenceLevel;
  /** Fraction of required steps completed, 0–1. */
  readonly completion: number;
  /** Integrity engine adjustment, 0–1. `1` means fully accepted. */
  readonly integrityFactor?: number;
  /** XP already credited in this domain today, for diminishing returns. */
  readonly domainXpToday?: number;
  readonly softCap?: number;
}

export interface XpAwardResult {
  /** XP before diminishing returns. */
  readonly rawXp: number;
  /** XP actually granted. */
  readonly creditedXp: number;
  /** How much was withheld by diminishing returns. */
  readonly diminished: number;
  readonly formulaVersion: number;
  /** Human-readable terms, so any award can be explained to the user. */
  readonly breakdown: ReadonlyArray<{ label: string; value: string }>;
}

/**
 * Completion factor.
 *
 * A genuine partial attempt always beats not trying, so abandonment is never
 * the rational choice. Zero completion is the only path to zero.
 */
export function completionFactor(completion: number): number {
  if (!Number.isFinite(completion) || completion < 0 || completion > 1) {
    throw new RangeError(`completion must be between 0 and 1, received ${completion}`);
  }
  if (completion === 0) return 0;
  if (completion === 1) return 1;
  return PARTIAL_COMPLETION_FLOOR + completion * (1 - PARTIAL_COMPLETION_FLOOR);
}

/**
 * Diminishing returns within one domain on one day.
 *
 * Logarithmic beyond the cap: a genuinely enormous day still earns meaningfully
 * more than an ordinary one, while repetitive grinding earns sharply less. The
 * curve never reaches zero, and cross-domain work is not penalised at all —
 * which makes balance the naturally rewarding strategy rather than an enforced
 * one.
 */
export function applyDiminishingReturns(
  rawXp: number,
  alreadyEarnedToday: number,
  softCap: number = DEFAULT_DOMAIN_DAILY_SOFT_CAP,
): number {
  if (rawXp <= 0) return 0;
  if (softCap <= 0) return rawXp;

  const creditedBefore = creditedTotal(alreadyEarnedToday, softCap);
  const creditedAfter = creditedTotal(alreadyEarnedToday + rawXp, softCap);
  return Math.max(0, creditedAfter - creditedBefore);
}

/** Total credited XP for a given raw daily total in one domain. */
function creditedTotal(rawTotal: number, softCap: number): number {
  if (rawTotal <= softCap) return rawTotal;
  return softCap + softCap * Math.log(1 + (rawTotal - softCap) / softCap);
}

export function calculateXpAward(input: XpAwardInput): XpAwardResult {
  const {
    difficulty,
    evidence,
    completion,
    integrityFactor = 1,
    domainXpToday = 0,
    softCap = DEFAULT_DOMAIN_DAILY_SOFT_CAP,
  } = input;

  if (integrityFactor < 0 || integrityFactor > 1) {
    throw new RangeError(`integrityFactor must be between 0 and 1, received ${integrityFactor}`);
  }

  const base = DIFFICULTY_BASE_XP[difficulty];
  const evidenceMultiplier = EVIDENCE_MULTIPLIER[evidence];
  const completionMultiplier = completionFactor(completion);

  const rawXp = Math.round(base * evidenceMultiplier * completionMultiplier * integrityFactor);
  const creditedXp = Math.round(applyDiminishingReturns(rawXp, domainXpToday, softCap));

  const breakdown: Array<{ label: string; value: string }> = [
    { label: `Base (${difficulty})`, value: `${base}` },
    { label: 'Evidence', value: `×${evidenceMultiplier.toFixed(2)}` },
  ];

  if (completionMultiplier !== 1) {
    breakdown.push({ label: 'Completion', value: `×${completionMultiplier.toFixed(2)}` });
  }
  if (integrityFactor !== 1) {
    breakdown.push({ label: 'Recalibrated', value: `×${integrityFactor.toFixed(2)}` });
  }
  if (creditedXp !== rawXp) {
    breakdown.push({
      label: 'Daily balance',
      value: `${creditedXp - rawXp}`,
    });
  }

  return {
    rawXp,
    creditedXp,
    diminished: rawXp - creditedXp,
    formulaVersion: XP_FORMULA_VERSION,
    breakdown,
  };
}

import type { Domain } from '../domain/types';
import type { Difficulty } from '../progression/xp';
import { QUEST_TEMPLATES, localizeTemplate, type QuestTemplate, type ObjectiveTemplateDefinition } from './templates';
import { SeededRandom, dailySeed } from '../util/random';
import { daysBetween } from '../platform/clock';
import type { ContentLocale } from '../content-locale';
import { DEFAULT_CONTENT_LOCALE } from '../content-locale';
import { RATIONALE_PHRASES } from './rationale-i18n';
import { computeDailyWorkloadBudget } from './workload-budget';

/**
 * Deterministic quest generation (see `docs/AI_ARCHITECT.md` §3 and
 * `docs/GAME_SYSTEMS.md` §9).
 *
 * The ordering of concerns is deliberate and is the whole design:
 *
 *   1. HARD FILTERS   — safety, injuries, exclusions, schedule feasibility.
 *                        A quest that cannot or should not happen today is
 *                        removed, never merely down-ranked.
 *   2. SCORING        — relevance strictly dominates novelty.
 *   3. DIVERSITY      — no two quests from the same domain in one day.
 *   4. WORKLOAD CLAMP — total proposed effort is bounded by available time
 *                        and by recovery state.
 *
 * A random quest that conflicts with the user's real life is a design failure,
 * not a variety feature.
 */

export type RecoveryState = 'good' | 'moderate' | 'low' | 'unknown';
export type DifficultyPreference = 'lighter' | 'balanced' | 'harder';

export interface GenerationContext {
  readonly userId: string;
  readonly date: string;
  /** Minutes the user actually has today. A hard constraint. */
  readonly availableMinutes: number;
  /** Active goal tags, highest priority first. */
  readonly goals: readonly string[];
  /** Last active date per domain, `null` if never. Drives neglect recovery. */
  readonly domainLastActive: Partial<Record<Domain, string | null>>;
  /** Template IDs offered recently, for variety (soft — deprioritises, does not exclude). */
  readonly recentTemplateIds: readonly string[];
  /**
   * Template IDs the user currently has active (still `detected`, `offered`,
   * `accepted`, or `postponed`) — hard-excluded so the same content is never
   * proposed twice while it is still live. See ADR-0010.
   */
  readonly excludedTemplateIds?: readonly string[];
  /** Completion rate per domain over the recent window, 0–1. */
  readonly completionRateByDomain: Partial<Record<Domain, number>>;
  readonly excludedDomains: readonly Domain[];
  /** Body areas that must not be loaded, e.g. from injury. */
  readonly injuredAreas: readonly string[];
  readonly recoveryState: RecoveryState;
  readonly difficultyPreference: DifficultyPreference;
  /** How many quests to offer, subject to the workload budget. */
  readonly count: number;
  /** Minutes already committed today (accepted/postponed/completed quests). Defaults to 0. */
  readonly committedMinutes?: number;
  /** How many primary quests are already committed today. Defaults to 0. */
  readonly committedPrimaryCount?: number;
  /** Whether a demanding/severe quest is already committed today. Defaults to false. */
  readonly committedDemandingOrAbove?: boolean;
  /** Language for generated titles, descriptions and rationale. Defaults to Portuguese (ADR-0007). */
  readonly locale?: ContentLocale;
  /**
   * Extra seed material for a manual "recalibrate" reroll. Empty by default,
   * so ordinary generation stays keyed only on user and date and never
   * rerolls itself on a plain restart.
   */
  readonly seedSuffix?: string;
}

export interface GeneratedQuest {
  readonly templateId: string;
  readonly title: string;
  readonly description: string;
  readonly purpose: string;
  readonly domain: Domain;
  readonly questType: string;
  readonly difficulty: Difficulty;
  readonly estimatedMinutes: number;
  readonly steps: readonly string[];
  /**
   * The actual decision inputs that selected this quest, recorded so
   * "why was this generated?" is answered honestly rather than reconstructed.
   */
  readonly rationale: string;
  readonly score: number;
  /** Present only for a Daily Protocol template — see `objectives.ts`. */
  readonly objectives?: ReadonlyArray<Omit<ObjectiveTemplateDefinition, 'labelPt' | 'unitPt'>>;
}

const DIFFICULTY_ORDER: readonly Difficulty[] = [
  'trivial',
  'light',
  'moderate',
  'demanding',
  'severe',
];

/** Neglect saturates at four weeks; beyond that it is not "more neglected". */
const NEGLECT_SATURATION_DAYS = 28;

export function generateQuests(context: GenerationContext): GeneratedQuest[] {
  const locale = context.locale ?? DEFAULT_CONTENT_LOCALE;
  const seed = context.seedSuffix
    ? `${dailySeed(context.userId, context.date)}:${context.seedSuffix}`
    : dailySeed(context.userId, context.date);
  const random = new SeededRandom(seed);

  const eligible = QUEST_TEMPLATES.filter((template) => passesHardFilters(template, context));

  const scored = eligible
    .map((template) => ({
      template,
      ...scoreTemplate(template, context, locale),
    }))
    .sort((a, b) => b.score - a.score);

  // Break ties deterministically but not identically every day, so equally
  // relevant quests rotate instead of one always winning.
  const jittered = scored.map((entry) => ({
    ...entry,
    score: entry.score + random.next() * 0.02,
  }));
  jittered.sort((a, b) => b.score - a.score);

  const budget = computeDailyWorkloadBudget({
    availableMinutes: context.availableMinutes,
    recoveryState: context.recoveryState,
    committedMinutes: context.committedMinutes ?? 0,
    committedPrimaryCount: context.committedPrimaryCount ?? 0,
    committedDemandingOrAbove: context.committedDemandingOrAbove ?? false,
  });
  const maxCount = Math.min(context.count, budget.maxNewPrimary);
  const isDemandingOrAbove = (d: Difficulty): boolean => d === 'demanding' || d === 'severe';
  // The cap must apply to what the user will actually see: difficulty
  // calibration (preference, recovery) can push a template up or down a
  // step, so the pre-calibration template difficulty is not a safe proxy.
  const finalDifficulty = (entry: (typeof jittered)[number]): Difficulty =>
    calibrateDifficulty(entry.template.difficulty, context);

  const selected: typeof jittered = [];
  const usedDomains = new Set<Domain>();
  let allocatedMinutes = 0;
  let demandingSelected = 0;

  const fitsBudget = (entry: (typeof jittered)[number]): boolean => {
    if (allocatedMinutes + entry.template.estimatedMinutes > budget.remainingMinutes) return false;
    if (isDemandingOrAbove(finalDifficulty(entry)) && demandingSelected >= budget.maxNewDemanding) {
      return false;
    }
    return true;
  };

  const take = (entry: (typeof jittered)[number]): void => {
    selected.push(entry);
    usedDomains.add(entry.template.domain);
    allocatedMinutes += entry.template.estimatedMinutes;
    if (isDemandingOrAbove(finalDifficulty(entry))) demandingSelected += 1;
  };

  for (const entry of jittered) {
    if (selected.length >= maxCount) break;

    // Diversity: one quest per domain per day. Breadth is what the progression
    // model rewards, so generation should not fight it.
    if (usedDomains.has(entry.template.domain)) continue;
    if (!fitsBudget(entry)) continue;

    take(entry);
  }

  // If diversity left us short, relax it — but never the time budget or the
  // demanding-quest cap, both of which are promises about the user's actual day.
  if (selected.length < maxCount) {
    for (const entry of jittered) {
      if (selected.length >= maxCount) break;
      if (selected.includes(entry)) continue;
      if (!fitsBudget(entry)) continue;
      take(entry);
    }
  }

  return selected.map(({ template, score, reasons }) => {
    const content = localizeTemplate(template, locale);
    return {
      templateId: template.id,
      title: content.title,
      description: content.description,
      purpose: content.purpose,
      domain: template.domain,
      questType: template.questType,
      difficulty: calibrateDifficulty(template.difficulty, context),
      estimatedMinutes: template.estimatedMinutes,
      steps: content.steps,
      rationale: reasons.join(' '),
      score: Number(score.toFixed(4)),
      ...(content.objectives ? { objectives: content.objectives } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// Hard filters
// ---------------------------------------------------------------------------

function passesHardFilters(template: QuestTemplate, context: GenerationContext): boolean {
  if (context.excludedDomains.includes(template.domain)) return false;

  // Hard duplicate/cooldown control (ADR-0010): a template already active —
  // detected, offered, accepted, or postponed — must not be regenerated as a
  // second independent quest. This is a deterministic content fingerprint,
  // not a similarity heuristic: generation is entirely template-based, so
  // two quests sharing a template id are the same content by construction.
  if (context.excludedTemplateIds?.includes(template.id)) return false;

  // Never propose loading an area the user has flagged as injured.
  if (template.bodyAreas && context.injuredAreas.length > 0) {
    const conflicts = template.bodyAreas.some((area) =>
      context.injuredAreas.some((injured) => injured.toLowerCase() === area.toLowerCase()),
    );
    if (conflicts) return false;
  }

  // Low recovery removes hard physical work entirely. The system proposes less
  // when the user is depleted — it never pushes through it.
  if (context.recoveryState === 'low' && template.intensity === 'hard') return false;
  if (context.recoveryState === 'low' && template.intensity === 'moderate') return false;

  // A quest that does not fit the day is not a quest.
  if (template.estimatedMinutes > context.availableMinutes) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Scoring — weights published in docs/GAME_SYSTEMS.md §9
// ---------------------------------------------------------------------------

interface ScoreResult {
  readonly score: number;
  readonly reasons: string[];
}

function scoreTemplate(
  template: QuestTemplate,
  context: GenerationContext,
  locale: ContentLocale,
): ScoreResult {
  const reasons: string[] = [];

  const goalAlignment = scoreGoalAlignment(template, context, reasons, locale);
  const neglect = scoreNeglect(template, context, reasons, locale);
  const feasibility = scoreFeasibility(template, context);
  const difficultyFit = scoreDifficultyFit(template, context);
  const variety = scoreVariety(template, context, reasons, locale);

  const score =
    0.35 * goalAlignment + 0.25 * neglect + 0.2 * feasibility + 0.1 * difficultyFit + 0.1 * variety;

  if (reasons.length === 0) {
    reasons.push(RATIONALE_PHRASES[locale].broadDevelopment);
  }

  return { score, reasons };
}

function scoreGoalAlignment(
  template: QuestTemplate,
  context: GenerationContext,
  reasons: string[],
  locale: ContentLocale,
): number {
  if (context.goals.length === 0) return 0.5;

  let best = 0;
  let matchedGoal: string | undefined;

  context.goals.forEach((goal, index) => {
    if (!template.tags.includes(goal)) return;
    // Earlier goals are higher priority, decaying gently down the list.
    const weight = 1 / (1 + index * 0.35);
    if (weight > best) {
      best = weight;
      matchedGoal = goal;
    }
  });

  if (matchedGoal) {
    reasons.push(RATIONALE_PHRASES[locale].supportsGoal(matchedGoal.replace(/_/g, ' ')));
  }
  return best;
}

function scoreNeglect(
  template: QuestTemplate,
  context: GenerationContext,
  reasons: string[],
  locale: ContentLocale,
): number {
  const lastActive = context.domainLastActive[template.domain];
  const domainLabel = RATIONALE_PHRASES[locale].domainLabels[template.domain];

  if (lastActive === null || lastActive === undefined) {
    reasons.push(RATIONALE_PHRASES[locale].neverRecorded(domainLabel));
    return 1;
  }

  const days = daysBetween(lastActive, context.date);
  if (days <= 1) return 0;

  const ratio = Math.min(1, days / NEGLECT_SATURATION_DAYS);
  if (days >= 7) {
    reasons.push(RATIONALE_PHRASES[locale].quietFor(domainLabel, days));
  }
  return ratio;
}

/** Prefer quests that use the day well without consuming all of it. */
function scoreFeasibility(template: QuestTemplate, context: GenerationContext): number {
  if (context.availableMinutes <= 0) return 0;
  const fraction = template.estimatedMinutes / context.availableMinutes;
  if (fraction > 0.6) return 0.2;
  if (fraction > 0.4) return 0.6;
  if (fraction < 0.05) return 0.7;
  return 1;
}

/**
 * Calibrate against recent completion.
 *
 * Persistently low completion in a domain means the difficulty was wrong, not
 * that the user is failing — so easier quests score higher there.
 */
function scoreDifficultyFit(template: QuestTemplate, context: GenerationContext): number {
  const completion = context.completionRateByDomain[template.domain] ?? 0.6;
  const index = DIFFICULTY_ORDER.indexOf(template.difficulty);
  const normalised = index / (DIFFICULTY_ORDER.length - 1);

  const target =
    context.difficultyPreference === 'harder'
      ? Math.min(1, completion + 0.25)
      : context.difficultyPreference === 'lighter'
        ? Math.max(0, completion - 0.25)
        : completion;

  return 1 - Math.abs(normalised - target);
}

function scoreVariety(
  template: QuestTemplate,
  context: GenerationContext,
  reasons: string[],
  locale: ContentLocale,
): number {
  const recentIndex = context.recentTemplateIds.indexOf(template.id);
  if (recentIndex === -1) return 1;

  // Most recent occurrence is penalised hardest, decaying with distance.
  const penalty = 1 / (1 + recentIndex);
  if (recentIndex < 2) {
    reasons.push(RATIONALE_PHRASES[locale].repeatedDeliberately);
  }
  return 1 - penalty;
}

/** Nudge difficulty toward the user's stated preference, one step at most. */
function calibrateDifficulty(difficulty: Difficulty, context: GenerationContext): Difficulty {
  const index = DIFFICULTY_ORDER.indexOf(difficulty);
  let target = index;

  if (context.difficultyPreference === 'lighter') target = index - 1;
  if (context.difficultyPreference === 'harder') target = index + 1;
  if (context.recoveryState === 'low') target = Math.min(target, index - 1);

  const clamped = Math.max(0, Math.min(DIFFICULTY_ORDER.length - 1, target));
  return DIFFICULTY_ORDER[clamped] ?? difficulty;
}

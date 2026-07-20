import { ACHIEVEMENTS, type AchievementContext, type AchievementDefinition } from './definitions';

/**
 * Evaluate which achievements have newly unlocked.
 *
 * Pure: takes the already-unlocked set plus the current context and returns
 * only what is newly earned. Never re-unlocks, never revokes — an achievement
 * records something that genuinely happened, so it is permanent even if the
 * underlying numbers later change through a correction.
 */
export function evaluateAchievements(
  unlockedIds: ReadonlySet<string>,
  context: AchievementContext,
): AchievementDefinition[] {
  return ACHIEVEMENTS.filter(
    (achievement) => !unlockedIds.has(achievement.id) && achievement.condition(context),
  );
}

/**
 * Order unlocks so the most significant is presented last.
 *
 * When several unlock at once, the legendary moment should land as the
 * conclusion rather than being buried under standard notifications.
 */
export function orderForPresentation(
  achievements: readonly AchievementDefinition[],
): AchievementDefinition[] {
  const weight = { standard: 0, rare: 1, legendary: 2 } as const;
  return [...achievements].sort((a, b) => weight[a.rarity] - weight[b.rarity]);
}

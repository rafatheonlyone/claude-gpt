import type { Domain } from '../domain/types';
import type { ContentLocale } from '../content-locale';

/**
 * Achievement registry.
 *
 * Rules that are not negotiable (`docs/GAME_SYSTEMS.md` §12):
 *  - Nothing rewards sleep deprivation, overtraining, dietary restriction or
 *    unbroken streaks that would punish rest.
 *  - Nothing rewards time spent inside the application.
 *  - Recovery is celebrated as progression, not tolerated as its absence.
 *
 * `name`/`description` are the English source of truth; `namePt`/`descriptionPt`
 * carry the Brazilian Portuguese translation (ADR-0007) and must stay in sync —
 * checked by `definitions.test.ts`.
 */
export type Rarity = 'standard' | 'rare' | 'legendary';

export interface AchievementContext {
  readonly totalXp: number;
  readonly level: number;
  readonly questsCompleted: number;
  readonly questsCompletedByDomain: Readonly<Partial<Record<Domain, number>>>;
  readonly distinctDomains: number;
  readonly recoveryQuestsCompleted: number;
  readonly activeDays: number;
  /** Distinct days with activity in the last 7. Never framed as a streak to protect. */
  readonly activeDaysThisWeek: number;
  readonly partialCompletions: number;
  readonly returnedAfterGap: boolean;
}

export interface AchievementDefinition {
  readonly id: string;
  readonly name: string;
  readonly namePt: string;
  readonly description: string;
  readonly descriptionPt: string;
  readonly category: string;
  readonly rarity: Rarity;
  /** Hidden until unlocked. Discoverable through meaningful behaviour only. */
  readonly secret: boolean;
  /** Identifier for an original vector glyph; never an external asset. */
  readonly icon: string;
  readonly condition: (context: AchievementContext) => boolean;
}

export interface LocalizedAchievementContent {
  readonly name: string;
  readonly description: string;
}

export function localizeAchievement(
  achievement: AchievementDefinition,
  locale: ContentLocale,
): LocalizedAchievementContent {
  if (locale === 'en') {
    return { name: achievement.name, description: achievement.description };
  }
  return { name: achievement.namePt, description: achievement.descriptionPt };
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'first_steps',
    name: 'First Signal',
    namePt: 'Primeiro Sinal',
    description: 'Complete your first quest.',
    descriptionPt: 'Conclua sua primeira missão.',
    category: 'first_steps',
    rarity: 'standard',
    secret: false,
    icon: 'pulse',
    condition: (c) => c.questsCompleted >= 1,
  },
  {
    id: 'first_level',
    name: 'Threshold Crossed',
    namePt: 'Limiar Ultrapassado',
    description: 'Reach level 2.',
    descriptionPt: 'Alcance o nível 2.',
    category: 'first_steps',
    rarity: 'standard',
    secret: false,
    icon: 'ascend',
    condition: (c) => c.level >= 2,
  },
  {
    id: 'level_five',
    name: 'Established',
    namePt: 'Estabelecido',
    description: 'Reach level 5.',
    descriptionPt: 'Alcance o nível 5.',
    category: 'mastery',
    rarity: 'standard',
    secret: false,
    icon: 'tier',
    condition: (c) => c.level >= 5,
  },
  {
    id: 'level_ten',
    name: 'Momentum',
    namePt: 'Momentum',
    description: 'Reach level 10.',
    descriptionPt: 'Alcance o nível 10.',
    category: 'mastery',
    rarity: 'rare',
    secret: false,
    icon: 'surge',
    condition: (c) => c.level >= 10,
  },
  {
    id: 'level_twentyfive',
    name: 'Proven',
    namePt: 'Comprovado',
    description: 'Reach level 25.',
    descriptionPt: 'Alcance o nível 25.',
    category: 'mastery',
    rarity: 'rare',
    secret: false,
    icon: 'crest',
    condition: (c) => c.level >= 25,
  },
  {
    id: 'level_fifty',
    name: 'Sustained',
    namePt: 'Sustentado',
    description: 'Reach level 50. This one takes years, not weeks.',
    descriptionPt: 'Alcance o nível 50. Este leva anos, não semanas.',
    category: 'legacy',
    rarity: 'legendary',
    secret: false,
    icon: 'monolith',
    condition: (c) => c.level >= 50,
  },
  {
    id: 'ten_quests',
    name: 'Consistent',
    namePt: 'Consistente',
    description: 'Complete ten quests.',
    descriptionPt: 'Conclua dez missões.',
    category: 'consistency',
    rarity: 'standard',
    secret: false,
    icon: 'lattice',
    condition: (c) => c.questsCompleted >= 10,
  },
  {
    id: 'hundred_quests',
    name: 'Accumulated',
    namePt: 'Acumulado',
    description: 'Complete one hundred quests.',
    descriptionPt: 'Conclua cem missões.',
    category: 'consistency',
    rarity: 'rare',
    secret: false,
    icon: 'strata',
    condition: (c) => c.questsCompleted >= 100,
  },
  {
    id: 'breadth_three',
    name: 'Multi-Threaded',
    namePt: 'Multifacetado',
    description: 'Complete quests in three different domains.',
    descriptionPt: 'Conclua missões em três domínios diferentes.',
    category: 'exploration',
    rarity: 'standard',
    secret: false,
    icon: 'branch',
    condition: (c) => c.distinctDomains >= 3,
  },
  {
    id: 'breadth_six',
    name: 'Composite',
    namePt: 'Composto',
    description: 'Complete quests in six different domains.',
    descriptionPt: 'Conclua missões em seis domínios diferentes.',
    category: 'exploration',
    rarity: 'rare',
    secret: false,
    icon: 'constellation',
    condition: (c) => c.distinctDomains >= 6,
  },
  {
    id: 'recovery_respected',
    name: 'Deliberate Rest',
    namePt: 'Descanso Deliberado',
    description: 'Complete five recovery quests. Rest is a training decision.',
    descriptionPt: 'Conclua cinco missões de recuperação. Descansar é uma decisão de treino.',
    category: 'recovery',
    rarity: 'standard',
    secret: false,
    icon: 'still',
    condition: (c) => c.recoveryQuestsCompleted >= 5,
  },
  {
    id: 'balanced_week',
    name: 'Sustainable',
    namePt: 'Sustentável',
    description: 'Stay active four days in a week without training every single day.',
    descriptionPt: 'Fique ativo quatro dias em uma semana sem treinar todos os dias.',
    category: 'recovery',
    rarity: 'rare',
    secret: false,
    icon: 'balance',
    // Deliberately rewards four to six days, never seven. A system that
    // rewarded a perfect week would be rewarding the absence of rest.
    condition: (c) => c.activeDaysThisWeek >= 4 && c.activeDaysThisWeek <= 6,
  },
  {
    id: 'returned',
    name: 'Resumed',
    namePt: 'Retomado',
    description: 'Return and complete a quest after time away.',
    descriptionPt: 'Volte e conclua uma missão depois de um tempo afastado.',
    category: 'comeback',
    rarity: 'standard',
    secret: true,
    icon: 'return',
    // Coming back matters more than never leaving.
    condition: (c) => c.returnedAfterGap && c.questsCompleted >= 1,
  },
  {
    id: 'honest_partial',
    name: 'Recorded Honestly',
    namePt: 'Registrado com Honestidade',
    description: 'Record five partial completions instead of overstating them.',
    descriptionPt: 'Registre cinco conclusões parciais em vez de superestimá-las.',
    category: 'hidden',
    rarity: 'rare',
    secret: true,
    icon: 'candor',
    // Rewards honest self-reporting, which is what keeps the record meaningful.
    condition: (c) => c.partialCompletions >= 5,
  },
  {
    id: 'thirty_active_days',
    name: 'Thirty Days',
    namePt: 'Trinta Dias',
    description: 'Be active on thirty separate days.',
    descriptionPt: 'Esteja ativo em trinta dias distintos.',
    category: 'consistency',
    rarity: 'rare',
    secret: false,
    icon: 'cycle',
    condition: (c) => c.activeDays >= 30,
  },
  {
    id: 'year_of_days',
    name: 'A Year of Evidence',
    namePt: 'Um Ano de Evidências',
    description: 'Be active on two hundred separate days.',
    descriptionPt: 'Esteja ativo em duzentos dias distintos.',
    category: 'legacy',
    rarity: 'legendary',
    secret: false,
    icon: 'archive',
    condition: (c) => c.activeDays >= 200,
  },
];

export function achievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

import type { Platform } from '../platform';
import type { Domain } from '../domain/types';
import type { Difficulty, EvidenceLevel } from '../progression/xp';
import { Migrator } from '../persistence/migrator';
import { Repositories, type QuestRecord } from './repositories';
import { calculateXpAward, type XpAwardResult } from '../progression/xp';
import { levelFromTotalXp, LEVEL_FORMULA_VERSION } from '../progression/levels';
import { generateQuests, type DifficultyPreference, type RecoveryState } from '../quests/generator';
import { evaluateAchievements, orderForPresentation } from '../achievements/engine';
import type { AchievementDefinition } from '../achievements/definitions';
import { uuidv7 } from '../util/id';
import { daysBetween } from '../platform/clock';

export interface OnboardingInput {
  readonly displayName: string;
  readonly birthDate: string | null;
  readonly country: string | null;
  readonly goals: readonly string[];
  readonly availableMinutes: number;
  readonly difficultyPreference: DifficultyPreference;
  readonly excludedDomains: readonly Domain[];
  readonly injuredAreas: readonly string[];
  readonly animationIntensity: 'full' | 'reduced' | 'minimal' | 'off';
  readonly soundEnabled: boolean;
}

export interface DashboardQuest extends QuestRecord {
  readonly steps: ReadonlyArray<{ id: string; description: string; optional: boolean }>;
}

export interface DashboardState {
  readonly displayName: string;
  readonly totalXp: number;
  readonly level: number;
  readonly xpIntoLevel: number;
  readonly xpForNextLevel: number;
  readonly fraction: number;
  readonly rank: string;
  readonly questsCompleted: number;
  readonly activeDays: number;
  readonly quests: readonly DashboardQuest[];
  readonly recentAchievements: ReadonlyArray<{ id: string; unlockedAt: string }>;
}

export interface CompletionOutcome {
  readonly award: XpAwardResult;
  readonly levelBefore: number;
  readonly levelAfter: number;
  readonly leveledUp: boolean;
  readonly totalXp: number;
  readonly achievements: readonly AchievementDefinition[];
}

const PREF_NAMESPACE = 'profile';

/**
 * Application service — the orchestration layer between the UI and the domain.
 *
 * Every progression write follows the same path (`docs/ARCHITECTURE.md` §3):
 * append to the event log and update projections inside one transaction, then
 * hand the resulting events to the UI. The UI never computes progression.
 */
export class SystemService {
  private constructor(
    private readonly platform: Platform,
    private readonly repos: Repositories,
    private userId: string,
  ) {}

  static async create(platform: Platform): Promise<SystemService> {
    const migrator = new Migrator(platform.storage, platform.clock);
    await migrator.migrate();

    const repos = new Repositories(platform.storage);
    await repos.syncAchievementRegistry();

    let user = await repos.findUser();
    if (!user) {
      const id = uuidv7(platform.clock.now().getTime());
      await repos.createUser(id, platform.clock.now().toISOString());
      user = await repos.findUser();
    }

    return new SystemService(platform, repos, user?.id ?? '');
  }

  async isOnboarded(): Promise<boolean> {
    const user = await this.repos.findUser();
    return user?.onboardingCompleted ?? false;
  }

  async completeOnboarding(input: OnboardingInput): Promise<void> {
    const now = this.platform.clock.now().toISOString();

    await this.repos.saveProfile(
      this.userId,
      {
        displayName: input.displayName.trim() || 'Operator',
        birthDate: input.birthDate,
        country: input.country,
        timezone: this.platform.clock.timezone(),
        locale: 'en',
      },
      now,
    );

    const preferences: Array<[string, unknown]> = [
      ['goals', input.goals],
      ['availableMinutes', input.availableMinutes],
      ['difficultyPreference', input.difficultyPreference],
      ['excludedDomains', input.excludedDomains],
      ['injuredAreas', input.injuredAreas],
      ['animationIntensity', input.animationIntensity],
      ['soundEnabled', input.soundEnabled],
    ];
    for (const [key, value] of preferences) {
      await this.repos.setPreference(this.userId, PREF_NAMESPACE, key, value, now);
    }

    await this.repos.setOnboardingComplete(this.userId, now);
    await this.appendEvent('OnboardingCompleted', { displayName: input.displayName }, 'user');
  }

  async getPreferences(): Promise<Record<string, unknown>> {
    return this.repos.getPreferences(this.userId, PREF_NAMESPACE);
  }

  /**
   * Today's quests, generating and persisting them once per day.
   *
   * Generation is keyed on the date, so reopening the app never rerolls the
   * day — that would feel arbitrary and would invite reroll-farming.
   */
  async getDashboard(): Promise<DashboardState> {
    const date = this.platform.clock.today();
    const user = await this.repos.findUser();

    let quests = await this.repos.getQuestsForDate(this.userId, date);
    if (quests.length === 0) {
      await this.generateForDate(date);
      quests = await this.repos.getQuestsForDate(this.userId, date);
    }

    const [state, stats, recentAchievements] = await Promise.all([
      this.repos.getProfileState(this.userId),
      this.repos.getCompletionStats(this.userId),
      this.repos.getRecentUnlocks(this.userId),
    ]);

    const progress = levelFromTotalXp(state.totalXp);

    const withSteps: DashboardQuest[] = [];
    for (const quest of quests) {
      const steps = await this.repos.getSteps(quest.id);
      withSteps.push({
        ...quest,
        steps: steps.map((s) => ({
          id: s.id,
          description: s.description,
          optional: s.optional,
        })),
      });
    }

    return {
      displayName: user?.displayName ?? 'Operator',
      totalXp: state.totalXp,
      level: progress.level,
      xpIntoLevel: progress.xpIntoLevel,
      xpForNextLevel: progress.xpForNextLevel,
      fraction: progress.fraction,
      rank: state.rank,
      questsCompleted: stats.questsCompleted,
      activeDays: stats.activeDays,
      quests: withSteps,
      recentAchievements,
    };
  }

  private async generateForDate(date: string): Promise<void> {
    const prefs = await this.getPreferences();
    const [domainLastActive, recentTemplateIds] = await Promise.all([
      this.repos.getDomainLastActive(this.userId),
      this.repos.recentTemplateIds(this.userId),
    ]);

    const generated = generateQuests({
      userId: this.userId,
      date,
      availableMinutes: numberPref(prefs['availableMinutes'], 120),
      goals: stringArrayPref(prefs['goals']),
      domainLastActive,
      recentTemplateIds,
      completionRateByDomain: {},
      excludedDomains: stringArrayPref(prefs['excludedDomains']) as Domain[],
      injuredAreas: stringArrayPref(prefs['injuredAreas']),
      recoveryState: 'unknown' as RecoveryState,
      difficultyPreference: (prefs['difficultyPreference'] as DifficultyPreference) ?? 'balanced',
      count: 3,
    });

    const now = this.platform.clock.now().toISOString();

    for (const quest of generated) {
      const questId = uuidv7(this.platform.clock.now().getTime());

      const statements = [
        {
          sql: `INSERT INTO quests
                  (id, user_id, title, description, purpose, quest_type, domain, difficulty,
                   estimated_minutes, status, due_date, generation_rationale, source,
                   evidence_level, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'offered', ?, ?, 'rules', 'self_reported', ?, ?)`,
          params: [
            questId,
            this.userId,
            quest.title,
            quest.description,
            quest.purpose,
            quest.questType,
            quest.domain,
            quest.difficulty,
            quest.estimatedMinutes,
            date,
            quest.rationale,
            now,
            now,
          ],
        },
        ...quest.steps.map((step, index) => ({
          sql: `INSERT INTO quest_steps (id, quest_id, position, description, optional, completed)
                VALUES (?, ?, ?, ?, 0, 0)`,
          params: [uuidv7(this.platform.clock.now().getTime()), questId, index, step],
        })),
        {
          sql: `INSERT INTO events
                  (id, user_id, type, payload, occurred_at, recorded_at, occurred_date,
                   formula_version, source)
                VALUES (?, ?, 'QuestOffered', ?, ?, ?, ?, ?, 'rules')`,
          params: [
            uuidv7(this.platform.clock.now().getTime()),
            this.userId,
            JSON.stringify({ questId, templateId: quest.templateId, score: quest.score }),
            now,
            now,
            date,
            LEVEL_FORMULA_VERSION,
          ],
        },
      ];

      await this.platform.storage.transaction(statements);
    }
  }

  async acceptQuest(questId: string): Promise<void> {
    const now = this.platform.clock.now().toISOString();
    await this.repos.setQuestStatus(questId, 'accepted', now);
    await this.appendEvent('QuestAccepted', { questId }, 'user');
  }

  /** Declining is a normal, cost-free action. It informs future generation. */
  async rejectQuest(questId: string, reason?: string): Promise<void> {
    const now = this.platform.clock.now().toISOString();
    await this.repos.setQuestStatus(questId, 'rejected', now);
    await this.platform.storage.execute(
      `INSERT INTO quest_feedback (id, user_id, quest_id, action, reason, recorded_at)
       VALUES (?, ?, ?, 'rejected', ?, ?)`,
      [uuidv7(this.platform.clock.now().getTime()), this.userId, questId, reason ?? null, now],
    );
  }

  /**
   * Complete a quest and award progression.
   *
   * The event log and every projection are written in a single transaction, so
   * the record can never disagree with the totals derived from it.
   */
  async completeQuest(
    questId: string,
    options: { completion?: number; evidence?: EvidenceLevel } = {},
  ): Promise<CompletionOutcome> {
    const quest = await this.repos.getQuest(questId);
    if (!quest) throw new Error(`quest not found: ${questId}`);
    if (quest.status === 'completed') {
      throw new Error('quest is already completed');
    }

    const completion = options.completion ?? 1;
    const evidence = options.evidence ?? 'self_reported';
    const date = this.platform.clock.today();
    const now = this.platform.clock.now().toISOString();

    const [stateBefore, domainXpToday] = await Promise.all([
      this.repos.getProfileState(this.userId),
      this.repos.getDomainXpToday(this.userId, quest.domain, date),
    ]);

    const award = calculateXpAward({
      difficulty: quest.difficulty as Difficulty,
      evidence,
      completion,
      domainXpToday,
    });

    const totalXp = stateBefore.totalXp + award.creditedXp;
    const levelBefore = levelFromTotalXp(stateBefore.totalXp).level;
    const levelAfter = levelFromTotalXp(totalXp).level;

    await this.platform.storage.transaction([
      {
        sql: `UPDATE quests SET status = 'completed', awarded_xp = ?, completed_at = ?, updated_at = ?
              WHERE id = ?`,
        params: [award.creditedXp, now, now, questId],
      },
      {
        sql: `INSERT INTO events
                (id, user_id, type, payload, occurred_at, recorded_at, occurred_date,
                 formula_version, source)
              VALUES (?, ?, 'QuestCompleted', ?, ?, ?, ?, ?, 'user')`,
        params: [
          uuidv7(this.platform.clock.now().getTime()),
          this.userId,
          JSON.stringify({
            questId,
            domain: quest.domain,
            creditedXp: award.creditedXp,
            rawXp: award.rawXp,
            partial: completion < 1,
            completion,
            evidence,
          }),
          now,
          now,
          date,
          award.formulaVersion,
        ],
      },
      {
        sql: `UPDATE profile_state SET total_xp = ?, level = ?, formula_version = ?, updated_at = ?
              WHERE user_id = ?`,
        params: [totalXp, levelAfter, award.formulaVersion, now, this.userId],
      },
      {
        sql: `INSERT INTO domain_daily_xp (user_id, domain, date, raw_xp, credited_xp)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(user_id, domain, date) DO UPDATE SET
                raw_xp = raw_xp + excluded.raw_xp,
                credited_xp = credited_xp + excluded.credited_xp`,
        params: [this.userId, quest.domain, date, award.rawXp, award.creditedXp],
      },
      {
        sql: `INSERT INTO domain_state (user_id, domain, total_xp, level, last_active, updated_at)
              VALUES (?, ?, ?, 1, ?, ?)
              ON CONFLICT(user_id, domain) DO UPDATE SET
                total_xp = domain_state.total_xp + excluded.total_xp,
                last_active = excluded.last_active,
                updated_at = excluded.updated_at`,
        params: [this.userId, quest.domain, award.creditedXp, date, now],
      },
    ]);

    const achievements = await this.evaluateAndUnlockAchievements(totalXp, levelAfter, date);

    return {
      award,
      levelBefore,
      levelAfter,
      leveledUp: levelAfter > levelBefore,
      totalXp,
      achievements,
    };
  }

  private async evaluateAndUnlockAchievements(
    totalXp: number,
    level: number,
    date: string,
  ): Promise<AchievementDefinition[]> {
    const [stats, unlocked] = await Promise.all([
      this.repos.getCompletionStats(this.userId),
      this.repos.getUnlockedAchievementIds(this.userId),
    ]);

    const returnedAfterGap =
      stats.lastActiveDate !== null && daysBetween(stats.lastActiveDate, date) >= 7;

    const newly = evaluateAchievements(unlocked, {
      totalXp,
      level,
      questsCompleted: stats.questsCompleted,
      questsCompletedByDomain: stats.byDomain,
      distinctDomains: Object.keys(stats.byDomain).length,
      recoveryQuestsCompleted: stats.byDomain.recovery ?? 0,
      activeDays: stats.activeDays,
      activeDaysThisWeek: stats.activeDaysThisWeek,
      partialCompletions: stats.partialCompletions,
      returnedAfterGap,
    });

    if (newly.length === 0) return [];

    const now = this.platform.clock.now().toISOString();
    await this.platform.storage.transaction(
      newly.map((achievement) => ({
        sql: `INSERT INTO achievement_unlocks (user_id, achievement_id, unlocked_at, acknowledged)
              VALUES (?, ?, ?, 0)
              ON CONFLICT(user_id, achievement_id) DO NOTHING`,
        params: [this.userId, achievement.id, now],
      })),
    );

    return orderForPresentation(newly);
  }

  private async appendEvent(
    type: string,
    payload: unknown,
    source: 'user' | 'rules' | 'ai' | 'system',
  ): Promise<void> {
    const now = this.platform.clock.now().toISOString();
    await this.platform.storage.execute(
      `INSERT INTO events
         (id, user_id, type, payload, occurred_at, recorded_at, occurred_date, formula_version, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv7(this.platform.clock.now().getTime()),
        this.userId,
        type,
        JSON.stringify(payload),
        now,
        now,
        this.platform.clock.today(),
        LEVEL_FORMULA_VERSION,
        source,
      ],
    );
  }
}

function numberPref(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArrayPref(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

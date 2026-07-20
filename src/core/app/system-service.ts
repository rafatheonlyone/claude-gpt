import type { Platform } from '../platform';
import type { Domain } from '../domain/types';
import type { Difficulty, EvidenceLevel } from '../progression/xp';
import type { ContentLocale } from '../content-locale';
import { DEFAULT_CONTENT_LOCALE } from '../content-locale';
import { Migrator } from '../persistence/migrator';
import {
  Repositories,
  type QuestRecord,
  type QuestListFilter,
  type QuestFeedbackRecord,
  type ObjectiveRecord,
  type PhysicalBaselineRecord,
} from './repositories';
import { calculateXpAward, type XpAwardResult } from '../progression/xp';
import { levelFromTotalXp, LEVEL_FORMULA_VERSION } from '../progression/levels';
import { generateQuests, type DifficultyPreference, type RecoveryState } from '../quests/generator';
import { computeDailyWorkloadBudget, MAXIMUM_DAILY_PRIMARY_QUESTS } from '../quests/workload-budget';
import { isObjectiveComplete, calibratedTarget, type ObjectiveKind } from '../quests/objectives';
import { evaluateAchievements, orderForPresentation } from '../achievements/engine';
import { ACHIEVEMENTS, type AchievementDefinition } from '../achievements/definitions';
import { APP_VERSION } from '../version';
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

export interface QuestSteps {
  readonly steps: ReadonlyArray<{ id: string; description: string; optional: boolean }>;
}

export type DashboardQuest = QuestRecord & QuestSteps;

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

export interface ProfileSummary {
  readonly displayName: string;
  readonly totalXp: number;
  readonly level: number;
  readonly xpIntoLevel: number;
  readonly xpForNextLevel: number;
  readonly fraction: number;
  readonly rank: string;
}

export interface QuestDetail extends DashboardQuest {
  readonly feedback: readonly QuestFeedbackRecord[];
  readonly objectives: readonly ObjectiveRecord[];
}

export interface AchievementCatalogEntry {
  readonly definition: AchievementDefinition;
  readonly unlocked: boolean;
  readonly unlockedAt: string | null;
}

export interface ArchitectSnapshot {
  readonly recentQuests: readonly QuestRecord[];
  readonly goals: readonly string[];
  readonly availableMinutes: number;
  readonly difficultyPreference: DifficultyPreference;
}

export interface RecalibrationResult {
  readonly removed: number;
  readonly added: number;
}

export interface DuplicateQuestGroup {
  readonly templateId: string;
  readonly dueDate: string | null;
  readonly title: string;
  readonly keepId: string;
  readonly redundantIds: readonly string[];
}

export interface DuplicateRepairPreview {
  readonly groups: readonly DuplicateQuestGroup[];
  readonly totalRedundant: number;
}

export interface DomainSummary {
  readonly domain: Domain;
  readonly totalXp: number;
  readonly level: number;
  readonly lastActive: string | null;
}

export interface StatusSummary {
  readonly displayName: string;
  readonly birthDate: string | null;
  readonly joinedAt: string;
  readonly level: number;
  readonly totalXp: number;
  readonly rank: string;
  readonly questsCompleted: number;
  readonly achievementsUnlocked: number;
  readonly achievementsTotal: number;
  readonly domains: readonly DomainSummary[];
}

export interface AppInfo {
  readonly version: string;
  readonly schemaVersion: number;
  readonly dataDir: string;
  readonly backupDir: string;
  readonly database: string;
}

export interface CompletionOptions {
  readonly completion?: number;
  readonly evidence?: EvidenceLevel;
  readonly reflection?: string;
  readonly evidenceNote?: string;
}

export interface CompletionOutcome {
  readonly award: XpAwardResult;
  readonly levelBefore: number;
  readonly levelAfter: number;
  readonly leveledUp: boolean;
  readonly totalXp: number;
  readonly achievements: readonly AchievementDefinition[];
}

/** Preferences captured during onboarding: goals, capacity, presentation. */
const PREF_NAMESPACE_PROFILE = 'profile';
/** Application-level preferences set later, from Settings: locale, volumes, presentation mode. */
const PREF_NAMESPACE_APP = 'app';
const LOCALE_KEY = 'locale';

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
    const locale = await this.getLocalePreference();

    await this.repos.saveProfile(
      this.userId,
      {
        displayName: input.displayName.trim() || 'Operador',
        birthDate: input.birthDate,
        country: input.country,
        timezone: this.platform.clock.timezone(),
        locale,
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
      await this.repos.setPreference(this.userId, PREF_NAMESPACE_PROFILE, key, value, now);
    }

    await this.repos.setOnboardingComplete(this.userId, now);
    await this.appendEvent('OnboardingCompleted', { displayName: input.displayName }, 'user');
  }

  async getPreferences(): Promise<Record<string, unknown>> {
    return this.repos.getPreferences(this.userId, PREF_NAMESPACE_PROFILE);
  }

  async getAppPreferences(): Promise<Record<string, unknown>> {
    return this.repos.getPreferences(this.userId, PREF_NAMESPACE_APP);
  }

  async setAppPreference(key: string, value: unknown): Promise<void> {
    const now = this.platform.clock.now().toISOString();
    await this.repos.setPreference(this.userId, PREF_NAMESPACE_APP, key, value, now);
  }

  /**
   * Updates a preference set during onboarding (goals, capacity, sound,
   * animation intensity, ...). Kept in the same namespace `getPreferences`
   * reads, so a change made later in Settings is seen consistently by both
   * the boot-time preference application and the onboarding defaults.
   */
  async setProfilePreference(key: string, value: unknown): Promise<void> {
    const now = this.platform.clock.now().toISOString();
    await this.repos.setPreference(this.userId, PREF_NAMESPACE_PROFILE, key, value, now);
  }

  // -------------------------------------------------------------- locale

  async getLocalePreference(): Promise<ContentLocale> {
    const value = await this.repos.getPreferenceValue(this.userId, PREF_NAMESPACE_APP, LOCALE_KEY);
    return value === 'en' ? 'en' : DEFAULT_CONTENT_LOCALE;
  }

  async setLocalePreference(locale: ContentLocale): Promise<void> {
    const now = this.platform.clock.now().toISOString();
    await this.repos.setPreference(this.userId, PREF_NAMESPACE_APP, LOCALE_KEY, locale, now);

    // Keep the informational profiles.locale column in sync without
    // clobbering fields this method does not own.
    const user = await this.repos.findUser();
    if (user) {
      await this.repos.saveProfile(
        this.userId,
        {
          displayName: user.displayName,
          birthDate: user.birthDate,
          country: user.country,
          timezone: user.timezone,
          locale,
        },
        now,
      );
    }
  }

  // ------------------------------------------------------------- app info

  async getAppInfo(): Promise<AppInfo> {
    const [paths, schemaVersion] = await Promise.all([
      this.platform.info.paths(),
      new Migrator(this.platform.storage, this.platform.clock).currentVersion(),
    ]);
    return { version: APP_VERSION, schemaVersion, ...paths };
  }

  async runBackupNow(label?: string): Promise<string> {
    return this.platform.storage.backup(label);
  }

  // ----------------------------------------------------------- dashboard

  /**
   * Today's quests, generating and persisting them once per day.
   *
   * Generation is keyed on the date, so reopening the app never rerolls the
   * day — that would feel arbitrary and would invite reroll-farming. Newly
   * generated quests start as `detected`: they are not yet visible as
   * "available" until the cinematic encounter (or a silent pass, if the user
   * disabled it) presents them — see `presentQuest`.
   */
  async getDashboard(): Promise<DashboardState> {
    const date = this.platform.clock.today();
    const user = await this.repos.findUser();
    const quests = await this.ensureTodayQuests(date);

    const [state, stats, recentAchievements] = await Promise.all([
      this.repos.getProfileState(this.userId),
      this.repos.getCompletionStats(this.userId),
      this.repos.getRecentUnlocks(this.userId),
    ]);

    const progress = levelFromTotalXp(state.totalXp);

    return {
      displayName: user?.displayName ?? 'Operador',
      totalXp: state.totalXp,
      level: progress.level,
      xpIntoLevel: progress.xpIntoLevel,
      xpForNextLevel: progress.xpForNextLevel,
      fraction: progress.fraction,
      rank: state.rank,
      questsCompleted: stats.questsCompleted,
      activeDays: stats.activeDays,
      quests: await this.withSteps(quests),
      recentAchievements,
    };
  }

  /** Pure read for chrome that renders on every page (the top bar). Never generates quests. */
  async getProfileSummary(): Promise<ProfileSummary> {
    const [user, state] = await Promise.all([this.repos.findUser(), this.repos.getProfileState(this.userId)]);
    const progress = levelFromTotalXp(state.totalXp);
    return {
      displayName: user?.displayName ?? 'Operador',
      totalXp: state.totalXp,
      level: progress.level,
      xpIntoLevel: progress.xpIntoLevel,
      xpForNextLevel: progress.xpForNextLevel,
      fraction: progress.fraction,
      rank: state.rank,
    };
  }

  /**
   * Expires overdue quests and generates today's set if none exist yet.
   * Returns only what should actually be visible today — see
   * `Repositories.getVisibleQuestsForDate`.
   *
   * Shared by `getDashboard` and `getPendingEncounters` so the encounter
   * queue works correctly regardless of which page happens to mount first —
   * the Shell hosts the queue independently of the Home/Today routes.
   *
   * Generation is guarded by `daily_generation_locks` (migration 003,
   * ADR-0009): a plain "check then generate" is two separate async steps,
   * and several UI components mounting at once (the shell's encounter queue,
   * Home, Today) can each observe "no quests yet" before any of them
   * finishes inserting. A real database inspected while building this fix
   * had 21 quests inserted across 7 near-simultaneous batches from exactly
   * this race. Only the caller whose `INSERT OR IGNORE` actually inserts the
   * lock row proceeds to generate; everyone else waits briefly for that
   * quest to land rather than generating a second independent batch.
   *
   * The existence check below deliberately uses the *unfiltered*
   * `getQuestsForDate` (every status, including `detected` and `archived`),
   * not `getVisibleQuestsForDate` — "has today already been generated" and
   * "what should the user see" are different questions (ADR-0013). Using the
   * visible-only count here would have been wrong in the other direction: a
   * day whose only quests happened to be `detected` would look empty and
   * regenerate on every call.
   */
  private async ensureTodayQuests(date: string): Promise<QuestRecord[]> {
    const now = this.platform.clock.now().toISOString();
    await this.repos.expireStaleQuests(this.userId, date, now);

    const existing = await this.repos.getQuestsForDate(this.userId, date);
    if (existing.length === 0) {
      const wonRace = await this.repos.tryAcquireGenerationLock(this.userId, date, now);
      if (wonRace) {
        await this.generateForDate(date);
      } else {
        await this.waitForConcurrentGeneration(date);
      }
    }
    return this.repos.getVisibleQuestsForDate(this.userId, date);
  }

  /** Polls briefly for another in-flight generation call to land, rather than flashing an empty day. */
  private async waitForConcurrentGeneration(date: string): Promise<void> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const existing = await this.repos.getQuestsForDate(this.userId, date);
      if (existing.length > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  private async withSteps(quests: readonly QuestRecord[]): Promise<DashboardQuest[]> {
    const withSteps: DashboardQuest[] = [];
    for (const quest of quests) {
      const steps = await this.repos.getSteps(quest.id);
      withSteps.push({
        ...quest,
        steps: steps.map((s) => ({ id: s.id, description: s.description, optional: s.optional })),
      });
    }
    return withSteps;
  }

  private async generateForDate(date: string, seedSuffix = ''): Promise<void> {
    const [prefs, locale] = await Promise.all([this.getPreferences(), this.getLocalePreference()]);
    const [domainLastActive, recentTemplateIds, committed, activeTemplateIds, archivedTodayTemplateIds] =
      await Promise.all([
        this.repos.getDomainLastActive(this.userId),
        this.repos.recentTemplateIds(this.userId),
        this.repos.getCommittedWorkload(this.userId, date),
        this.repos.getActiveTemplateIds(this.userId),
        // Scoped to *this date only* (ADR-0013): a template archived today as
        // a redundant duplicate must not be immediately re-proposed by the
        // same or a later generation call the same day — recalibrating must
        // not recreate the exact duplicate it (or an earlier repair) just
        // removed. A `repeatable` template stays eligible on a future day.
        this.repos.getArchivedTemplateIdsForDate(this.userId, date),
      ]);

    const availableMinutes = numberPref(prefs['availableMinutes'], 120);
    const recoveryState = 'unknown' as RecoveryState;
    const budget = computeDailyWorkloadBudget({
      availableMinutes,
      recoveryState,
      committedMinutes: committed.minutes,
      committedPrimaryCount: committed.primaryCount,
      committedDemandingOrAbove: committed.demandingOrAbove,
    });

    const generated = generateQuests({
      userId: this.userId,
      date,
      availableMinutes,
      goals: stringArrayPref(prefs['goals']),
      domainLastActive,
      recentTemplateIds,
      excludedTemplateIds: [...new Set([...activeTemplateIds, ...archivedTodayTemplateIds])],
      completionRateByDomain: {},
      excludedDomains: stringArrayPref(prefs['excludedDomains']) as Domain[],
      injuredAreas: stringArrayPref(prefs['injuredAreas']),
      recoveryState,
      difficultyPreference: (prefs['difficultyPreference'] as DifficultyPreference) ?? 'balanced',
      locale,
      count: MAXIMUM_DAILY_PRIMARY_QUESTS,
      committedMinutes: committed.minutes,
      committedPrimaryCount: committed.primaryCount,
      committedDemandingOrAbove: committed.demandingOrAbove,
      // Spread rather than assigning `undefined`: exactOptionalPropertyTypes
      // treats an explicit undefined differently from an absent key.
      ...(seedSuffix ? { seedSuffix } : {}),
    });

    const now = this.platform.clock.now().toISOString();
    const needsBaseline = generated.some((quest) => quest.objectives?.some((o) => o.baselineKey));
    const baseline = needsBaseline ? await this.repos.getPhysicalBaseline(this.userId) : null;

    for (const quest of generated) {
      const questId = uuidv7(this.platform.clock.now().getTime());

      const statements = [
        {
          sql: `INSERT INTO quests
                  (id, user_id, title, description, purpose, quest_type, domain, difficulty,
                   estimated_minutes, status, due_date, generation_rationale, source,
                   evidence_level, created_at, updated_at, template_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'detected', ?, ?, 'rules', 'self_reported', ?, ?, ?)`,
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
            quest.templateId,
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
                VALUES (?, ?, 'QuestGenerated', ?, ?, ?, ?, ?, 'rules')`,
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

      if (quest.objectives && quest.objectives.length > 0) {
        const objectiveRows = quest.objectives.map((objective, index) => ({
          id: uuidv7(this.platform.clock.now().getTime()),
          position: index,
          kind: objective.kind,
          label: objective.label,
          target: objective.baselineKey
            ? calibratedTarget(baselineValue(baseline, objective.baselineKey), objective.conservativeDefault ?? 10)
            : objective.target,
          unit: objective.unit ?? null,
          optional: objective.optional ?? false,
        }));
        await this.repos.createObjectives(questId, objectiveRows, now);
      }
    }

    const newMinutes = generated.reduce((sum, q) => sum + q.estimatedMinutes, 0);
    const newPrimary = generated.filter((q) => q.questType !== 'side').length;
    await this.repos.saveGenerationPlan(
      this.userId,
      date,
      {
        availableMinutes,
        budgetMinutes: budget.budgetMinutes,
        plannedMinutes: committed.minutes + newMinutes,
        mandatoryCount: committed.primaryCount + newPrimary,
        optionalCount: generated.length - newPrimary,
        overloaded: budget.overloaded,
        breakdown: budget.reasons.map((reason) => ({ label: reason, detail: '' })),
      },
      now,
    );
  }

  // -------------------------------------------------------------- quests

  async getAllQuests(filter: QuestListFilter = {}): Promise<DashboardQuest[]> {
    const quests = await this.repos.getAllQuests(this.userId, filter);
    return this.withSteps(quests);
  }

  async getQuestDetail(questId: string): Promise<QuestDetail | null> {
    const quest = await this.repos.getQuest(questId);
    if (!quest) return null;
    const [steps, feedback, objectives] = await Promise.all([
      this.repos.getSteps(questId),
      this.repos.getQuestFeedback(questId),
      this.repos.getObjectives(questId),
    ]);
    return {
      ...quest,
      steps: steps.map((s) => ({ id: s.id, description: s.description, optional: s.optional })),
      feedback,
      objectives,
    };
  }

  /**
   * Updates one objective's progress and, when it is now complete, stamps
   * `completedAt`. Never touches the parent quest's own status — the user
   * still explicitly completes the quest itself (via `completeQuest`),
   * typically passing a `completion` fraction derived from
   * `protocolProgress()` over these objectives.
   */
  async updateObjectiveProgress(objectiveId: string, current: number): Promise<void> {
    const objective = await this.repos.getObjectiveById(objectiveId);
    if (!objective) throw new Error(`objective not found: ${objectiveId}`);

    const clamped = Math.max(0, current);
    const completed = isObjectiveComplete({ kind: objective.kind as ObjectiveKind, target: objective.target, current: clamped });
    const now = this.platform.clock.now().toISOString();
    await this.repos.updateObjectiveProgress(objectiveId, clamped, completed, now);
  }

  async getPhysicalBaseline(): Promise<PhysicalBaselineRecord | null> {
    return this.repos.getPhysicalBaseline(this.userId);
  }

  async savePhysicalBaseline(baseline: PhysicalBaselineRecord): Promise<void> {
    const now = this.platform.clock.now().toISOString();
    await this.repos.savePhysicalBaseline(this.userId, baseline, now);
  }

  /**
   * Quests generated but not yet shown to the user — the cinematic encounter
   * queue. Ensures today's quests exist first, so the queue is never empty
   * merely because this was the first call of the session.
   */
  async getPendingEncounters(): Promise<DashboardQuest[]> {
    await this.ensureTodayQuests(this.platform.clock.today());
    const quests = await this.repos.getPendingEncounters(this.userId);
    return this.withSteps(quests);
  }

  /**
   * Marks a quest as presented (detected -> offered).
   *
   * This is what makes the encounter idempotent across restarts: the
   * transition is persisted the moment the quest is shown, not when the user
   * finally decides, so closing the app mid-encounter never re-triggers it.
   */
  async presentQuest(questId: string): Promise<void> {
    const now = this.platform.clock.now().toISOString();
    await this.repos.presentQuest(questId, now);
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

  /** Postponing keeps the quest in history rather than discarding it silently. */
  async postponeQuest(questId: string, reason?: string): Promise<void> {
    const now = this.platform.clock.now().toISOString();
    await this.repos.postponeQuest(this.userId, questId, reason ?? null, now);
  }

  /**
   * Discards today's undecided quests (`detected`/`offered`) and generates a
   * fresh set. Quests the user already acted on — accepted, completed,
   * rejected, postponed — are never touched; a recalibration is not a
   * reset of a day's real decisions.
   */
  async recalibrateToday(): Promise<RecalibrationResult> {
    const date = this.platform.clock.today();
    // Deliberately the unfiltered scope (ADR-0013): recalibration must still
    // be able to see and remove `detected`/`offered` rows. `archived` rows
    // pass through `removable`'s filter untouched either way, and because
    // they are never added or removed here, they contribute identically to
    // `current.length` and the later re-query, cancelling out of `added`
    // exactly — the externally-reported counts stay correct even though this
    // intermediate list is not visibility-filtered.
    const current = await this.repos.getQuestsForDate(this.userId, date);
    const removable = current.filter((q) => q.status === 'detected' || q.status === 'offered');

    for (const quest of removable) {
      await this.repos.deleteQuest(quest.id);
    }

    const nonceKey = `rerollCount:${date}`;
    const now = this.platform.clock.now().toISOString();
    const priorNonce = Number(
      (await this.repos.getPreferenceValue(this.userId, PREF_NAMESPACE_APP, nonceKey)) ?? 0,
    );
    const nextNonce = priorNonce + 1;
    await this.repos.setPreference(this.userId, PREF_NAMESPACE_APP, nonceKey, nextNonce, now);

    await this.generateForDate(date, String(nextNonce));

    const survivingCount = current.length - removable.length;
    const afterCount = (await this.repos.getQuestsForDate(this.userId, date)).length;

    return { removed: removable.length, added: afterCount - survivingCount };
  }

  // ------------------------------------------------------- duplicate repair

  /**
   * Read-only preview of what `repairDuplicateQuests` would archive.
   *
   * Exists as its own call so the UI can show the user exactly what will
   * change before anything happens (`CLAUDE.md`: never silently delete or
   * alter meaningful user data). Nothing is written here.
   */
  async previewDuplicateQuestRepair(): Promise<DuplicateRepairPreview> {
    const groups = await this.repos.findDuplicateGeneratedQuests(this.userId);
    return {
      groups,
      totalRedundant: groups.reduce((sum, group) => sum + group.redundantIds.length, 0),
    };
  }

  /**
   * Archives redundant generated-quest duplicates: same template, same date,
   * still undecided or postponed. The most recent copy in each group is
   * kept untouched; the rest move to `archived`, which preserves the row
   * and its full history rather than deleting it. Accepted, completed,
   * rejected, expired and user-created quests are never candidates — see
   * `Repositories.findDuplicateGeneratedQuests`.
   *
   * Idempotent by construction: `findDuplicateGeneratedQuests` only reports
   * `detected`/`offered`/`postponed` rows, so an already-archived row can
   * never be re-selected on a second run, and a run that finds nothing
   * writes nothing. Each run that actually archives something is recorded
   * as a `DuplicateQuestsRepaired` event (append-only, like every other
   * awarding/generation action) — a real audit trail of when and how much
   * was repaired, in place of a one-off development script.
   */
  async repairDuplicateQuests(): Promise<DuplicateRepairPreview> {
    const preview = await this.previewDuplicateQuestRepair();
    const redundantIds = preview.groups.flatMap((group) => group.redundantIds);
    if (redundantIds.length > 0) {
      const now = this.platform.clock.now().toISOString();
      await this.repos.archiveQuests(redundantIds, now);
      await this.appendEvent(
        'DuplicateQuestsRepaired',
        {
          archivedCount: redundantIds.length,
          groups: preview.groups.map((group) => ({
            templateId: group.templateId,
            dueDate: group.dueDate,
            keptId: group.keepId,
            archivedIds: group.redundantIds,
          })),
        },
        'system',
      );
    }
    return preview;
  }

  /**
   * Complete a quest and award progression.
   *
   * The event log and every projection are written in a single transaction, so
   * the record can never disagree with the totals derived from it.
   */
  async completeQuest(questId: string, options: CompletionOptions = {}): Promise<CompletionOutcome> {
    const quest = await this.repos.getQuest(questId);
    if (!quest) throw new Error(`quest not found: ${questId}`);
    if (quest.status === 'completed') {
      throw new Error('quest is already completed');
    }

    const completion = options.completion ?? 1;
    const evidence = options.evidence ?? 'self_reported';
    const reflection = options.reflection?.trim() || null;
    const evidenceNote = options.evidenceNote?.trim() || null;
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
        sql: `UPDATE quests SET status = 'completed', awarded_xp = ?, completed_at = ?, updated_at = ?,
                reflection_note = ?, evidence_note = ?
              WHERE id = ?`,
        params: [award.creditedXp, now, now, reflection, evidenceNote, questId],
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

  // -------------------------------------------------------------- achievements

  async getAchievementsCatalog(): Promise<AchievementCatalogEntry[]> {
    const unlockedMap = await this.repos.getUnlockedMap(this.userId);
    return ACHIEVEMENTS.map((definition) => ({
      definition,
      unlocked: unlockedMap.has(definition.id),
      unlockedAt: unlockedMap.get(definition.id) ?? null,
    }));
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

  // ------------------------------------------------------------------ status

  async getStatusSummary(): Promise<StatusSummary> {
    const [user, state, stats, domains, unlocked] = await Promise.all([
      this.repos.findUser(),
      this.repos.getProfileState(this.userId),
      this.repos.getCompletionStats(this.userId),
      this.repos.getDomainStates(this.userId),
      this.repos.getUnlockedAchievementIds(this.userId),
    ]);

    return {
      displayName: user?.displayName ?? 'Operador',
      birthDate: user?.birthDate ?? null,
      joinedAt: user?.createdAt ?? this.platform.clock.now().toISOString(),
      level: levelFromTotalXp(state.totalXp).level,
      totalXp: state.totalXp,
      rank: state.rank,
      questsCompleted: stats.questsCompleted,
      achievementsUnlocked: unlocked.size,
      achievementsTotal: ACHIEVEMENTS.length,
      domains,
    };
  }

  // -------------------------------------------------------------- architect

  async getArchitectSnapshot(): Promise<ArchitectSnapshot> {
    const [recentQuests, prefs] = await Promise.all([
      this.repos.getRecentGeneratedQuests(this.userId, 10),
      this.getPreferences(),
    ]);

    return {
      recentQuests,
      goals: stringArrayPref(prefs['goals']),
      availableMinutes: numberPref(prefs['availableMinutes'], 120),
      difficultyPreference: (prefs['difficultyPreference'] as DifficultyPreference) ?? 'balanced',
    };
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

function baselineValue(
  baseline: PhysicalBaselineRecord | null,
  key: 'pushups' | 'squats' | 'plank',
): number | null {
  if (!baseline) return null;
  switch (key) {
    case 'pushups':
      return baseline.pushupsComfortable;
    case 'squats':
      return baseline.squatsComfortable;
    case 'plank':
      return baseline.plankSeconds;
  }
}

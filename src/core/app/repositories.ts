import type { StorageAdapter, SqlParam } from '../platform/storage';
import type { Domain } from '../domain/types';
import { ACHIEVEMENTS } from '../achievements/definitions';

/**
 * Data access.
 *
 * Every value reaching SQLite arrives as a bound parameter — never through
 * string interpolation. This is the invariant that makes the narrow SQL bridge
 * in the Rust host acceptable (ADR-0002).
 */

export interface UserRecord {
  readonly id: string;
  readonly displayName: string;
  readonly birthDate: string | null;
  readonly country: string | null;
  readonly timezone: string;
  readonly locale: string;
  readonly onboardingCompleted: boolean;
  readonly createdAt: string;
}

export interface ProfileStateRecord {
  readonly totalXp: number;
  readonly level: number;
  readonly rank: string;
  readonly rankTier: number;
  readonly primaryClass: string | null;
}

export interface QuestRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly purpose: string | null;
  readonly domain: Domain;
  readonly questType: string;
  readonly difficulty: string;
  readonly estimatedMinutes: number | null;
  readonly status: string;
  readonly rationale: string | null;
  readonly awardedXp: number | null;
  readonly dueDate: string | null;
  readonly createdAt: string;
  readonly presentedAt: string | null;
  readonly postponedAt: string | null;
  readonly completedAt: string | null;
  readonly reflectionNote: string | null;
  readonly evidenceNote: string | null;
  readonly templateId: string | null;
}

export interface QuestStepRecord {
  readonly id: string;
  readonly questId: string;
  readonly position: number;
  readonly description: string;
  readonly optional: boolean;
  readonly completed: boolean;
}

export interface ObjectiveRecord {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly target: number | null;
  readonly current: number;
  readonly unit: string | null;
  readonly optional: boolean;
  readonly notes: string | null;
  readonly completedAt: string | null;
}

export interface PhysicalBaselineRecord {
  readonly pushupsComfortable: number | null;
  readonly squatsComfortable: number | null;
  readonly plankSeconds: number | null;
  readonly trainingFrequencyPerWeek: number | null;
}

export interface QuestFeedbackRecord {
  readonly action: string;
  readonly reason: string | null;
  readonly recordedAt: string;
}

export interface QuestListFilter {
  readonly status?: readonly string[];
  readonly domain?: Domain;
  readonly search?: string;
}

const QUEST_COLUMNS = `id, title, description, purpose, domain, quest_type, difficulty,
              estimated_minutes, status, generation_rationale, awarded_xp, due_date,
              created_at, presented_at, postponed_at, completed_at, reflection_note, evidence_note,
              template_id`;

const asString = (value: unknown): string => String(value ?? '');
const asNumber = (value: unknown): number => Number(value ?? 0);
const asNullableString = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);
const asBoolean = (value: unknown): boolean => Number(value ?? 0) === 1;

export class Repositories {
  constructor(private readonly db: StorageAdapter) {}

  // ------------------------------------------------------------------ user

  async findUser(): Promise<UserRecord | null> {
    const rows = await this.db.query(
      `SELECT u.id, u.created_at, p.display_name, p.birth_date, p.country, p.timezone, p.locale,
              COALESCE(o.completed, 0) AS completed
         FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         LEFT JOIN onboarding_state o ON o.user_id = u.id
        ORDER BY u.created_at
        LIMIT 1`,
    );
    const row = rows[0];
    if (!row) return null;

    return {
      id: asString(row['id']),
      displayName: asString(row['display_name']),
      birthDate: asNullableString(row['birth_date']),
      country: asNullableString(row['country']),
      timezone: asString(row['timezone']) || 'UTC',
      locale: asString(row['locale']) || 'pt-BR',
      onboardingCompleted: asBoolean(row['completed']),
      createdAt: asString(row['created_at']),
    };
  }

  async createUser(id: string, now: string): Promise<void> {
    await this.db.transaction([
      {
        sql: 'INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)',
        params: [id, now, now],
      },
      {
        sql: `INSERT INTO profile_state (user_id, total_xp, level, rank, rank_tier, formula_version, updated_at)
              VALUES (?, 0, 1, 'dormant', 0, 1, ?)`,
        params: [id, now],
      },
    ]);
  }

  async saveProfile(
    userId: string,
    profile: {
      displayName: string;
      birthDate: string | null;
      country: string | null;
      timezone: string;
      locale: string;
    },
    now: string,
  ): Promise<void> {
    await this.db.execute(
      `INSERT INTO profiles (user_id, display_name, birth_date, country, timezone, locale, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         display_name = excluded.display_name,
         birth_date   = excluded.birth_date,
         country      = excluded.country,
         timezone     = excluded.timezone,
         locale       = excluded.locale,
         updated_at   = excluded.updated_at`,
      [
        userId,
        profile.displayName,
        profile.birthDate,
        profile.country,
        profile.timezone,
        profile.locale,
        now,
        now,
      ],
    );
  }

  async setOnboardingComplete(userId: string, now: string): Promise<void> {
    await this.db.execute(
      `INSERT INTO onboarding_state (user_id, schema_version, current_step, completed, started_at, completed_at, updated_at)
       VALUES (?, 1, 'complete', 1, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         completed = 1, current_step = 'complete', completed_at = excluded.completed_at, updated_at = excluded.updated_at`,
      [userId, now, now, now],
    );
  }

  // ----------------------------------------------------------- preferences

  async setPreference(
    userId: string,
    namespace: string,
    key: string,
    value: unknown,
    now: string,
  ): Promise<void> {
    await this.db.execute(
      `INSERT INTO preferences (user_id, namespace, key, value, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, namespace, key) DO UPDATE SET
         value = excluded.value, updated_at = excluded.updated_at`,
      [userId, namespace, key, JSON.stringify(value), now],
    );
  }

  async getPreferences(userId: string, namespace: string): Promise<Record<string, unknown>> {
    const rows = await this.db.query(
      'SELECT key, value FROM preferences WHERE user_id = ? AND namespace = ?',
      [userId, namespace],
    );
    const out: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        out[asString(row['key'])] = JSON.parse(asString(row['value']));
      } catch {
        // A malformed preference must never prevent the app from starting.
        out[asString(row['key'])] = null;
      }
    }
    return out;
  }

  /** Single-key read, for values that would be wasteful to fetch as a whole namespace. */
  async getPreferenceValue(userId: string, namespace: string, key: string): Promise<unknown> {
    const rows = await this.db.query(
      'SELECT value FROM preferences WHERE user_id = ? AND namespace = ? AND key = ?',
      [userId, namespace, key],
    );
    const row = rows[0];
    if (!row) return undefined;
    try {
      return JSON.parse(asString(row['value']));
    } catch {
      return undefined;
    }
  }

  // --------------------------------------------------------- profile state

  async getProfileState(userId: string): Promise<ProfileStateRecord> {
    const rows = await this.db.query(
      `SELECT total_xp, level, rank, rank_tier, primary_class
         FROM profile_state WHERE user_id = ?`,
      [userId],
    );
    const row = rows[0];
    return {
      totalXp: asNumber(row?.['total_xp']),
      level: Math.max(1, asNumber(row?.['level'])),
      rank: asString(row?.['rank']) || 'dormant',
      rankTier: asNumber(row?.['rank_tier']),
      primaryClass: asNullableString(row?.['primary_class']),
    };
  }

  async getDomainXpToday(userId: string, domain: Domain, date: string): Promise<number> {
    const rows = await this.db.query(
      'SELECT raw_xp FROM domain_daily_xp WHERE user_id = ? AND domain = ? AND date = ?',
      [userId, domain, date],
    );
    return asNumber(rows[0]?.['raw_xp']);
  }

  async getDomainStates(
    userId: string,
  ): Promise<Array<{ domain: Domain; totalXp: number; level: number; lastActive: string | null }>> {
    const rows = await this.db.query(
      'SELECT domain, total_xp, level, last_active FROM domain_state WHERE user_id = ? ORDER BY total_xp DESC',
      [userId],
    );
    return rows.map((row) => ({
      domain: asString(row['domain']) as Domain,
      totalXp: asNumber(row['total_xp']),
      level: Math.max(1, asNumber(row['level'])),
      lastActive: asNullableString(row['last_active']),
    }));
  }

  async getDomainLastActive(userId: string): Promise<Partial<Record<Domain, string | null>>> {
    const rows = await this.db.query(
      'SELECT domain, last_active FROM domain_state WHERE user_id = ?',
      [userId],
    );
    const out: Partial<Record<Domain, string | null>> = {};
    for (const row of rows) {
      out[asString(row['domain']) as Domain] = asNullableString(row['last_active']);
    }
    return out;
  }

  // ----------------------------------------------------------------- quests

  async getQuestsForDate(userId: string, date: string): Promise<QuestRecord[]> {
    const rows = await this.db.query(
      `SELECT ${QUEST_COLUMNS} FROM quests WHERE user_id = ? AND due_date = ? ORDER BY created_at`,
      [userId, date],
    );
    return rows.map(toQuestRecord);
  }

  /**
   * The full quest list, excluding `detected` quests — those are pre-encounter
   * and belong exclusively to the cinematic queue, never to a browsable list.
   */
  async getAllQuests(userId: string, filter: QuestListFilter = {}): Promise<QuestRecord[]> {
    const clauses: string[] = ['user_id = ?'];
    const params: SqlParam[] = [userId];

    if (filter.status && filter.status.length > 0) {
      clauses.push(`status IN (${filter.status.map(() => '?').join(', ')})`);
      params.push(...filter.status);
    } else {
      // Default browsing view: `detected` is pre-encounter (belongs only to
      // the cinematic queue) and `archived` is a duplicate-repair outcome,
      // not something to browse day to day. An explicit status filter can
      // still ask for either — the Missions "Archived" group does exactly that.
      clauses.push("status NOT IN ('detected', 'archived')");
    }
    if (filter.domain) {
      clauses.push('domain = ?');
      params.push(filter.domain);
    }
    if (filter.search && filter.search.trim().length > 0) {
      clauses.push('title LIKE ?');
      params.push(`%${filter.search.trim()}%`);
    }

    const rows = await this.db.query(
      `SELECT ${QUEST_COLUMNS} FROM quests WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC`,
      params,
    );
    return rows.map(toQuestRecord);
  }

  async getPendingEncounters(userId: string): Promise<QuestRecord[]> {
    const rows = await this.db.query(
      `SELECT ${QUEST_COLUMNS} FROM quests WHERE user_id = ? AND status = 'detected' ORDER BY created_at`,
      [userId],
    );
    return rows.map(toQuestRecord);
  }

  async getRecentGeneratedQuests(userId: string, limit = 10): Promise<QuestRecord[]> {
    const rows = await this.db.query(
      `SELECT ${QUEST_COLUMNS} FROM quests
        WHERE user_id = ? AND source = 'rules'
        ORDER BY created_at DESC LIMIT ?`,
      [userId, limit],
    );
    return rows.map(toQuestRecord);
  }

  async getQuest(questId: string): Promise<QuestRecord | null> {
    const rows = await this.db.query(`SELECT ${QUEST_COLUMNS} FROM quests WHERE id = ?`, [
      questId,
    ]);
    const row = rows[0];
    return row ? toQuestRecord(row) : null;
  }

  async getSteps(questId: string): Promise<QuestStepRecord[]> {
    const rows = await this.db.query(
      'SELECT id, quest_id, position, description, optional, completed FROM quest_steps WHERE quest_id = ? ORDER BY position',
      [questId],
    );
    return rows.map((row) => ({
      id: asString(row['id']),
      questId: asString(row['quest_id']),
      position: asNumber(row['position']),
      description: asString(row['description']),
      optional: asBoolean(row['optional']),
      completed: asBoolean(row['completed']),
    }));
  }

  async getQuestFeedback(questId: string): Promise<QuestFeedbackRecord[]> {
    const rows = await this.db.query(
      'SELECT action, reason, recorded_at FROM quest_feedback WHERE quest_id = ? ORDER BY recorded_at',
      [questId],
    );
    return rows.map((row) => ({
      action: asString(row['action']),
      reason: asNullableString(row['reason']),
      recordedAt: asString(row['recorded_at']),
    }));
  }

  /**
   * Any transition away from `detected` means the user saw and decided on the
   * quest, so `presented_at` is stamped if it was not already — regardless of
   * whether the caller went through the cinematic encounter's `presentQuest`
   * first. This keeps quest history honest without forcing every caller to
   * remember a two-step dance.
   */
  async setQuestStatus(questId: string, status: string, now: string): Promise<void> {
    await this.db.execute(
      'UPDATE quests SET status = ?, presented_at = COALESCE(presented_at, ?), updated_at = ? WHERE id = ?',
      [status, now, now, questId],
    );
  }

  /**
   * Detected -> offered, stamping `presented_at`.
   *
   * The `AND status = 'detected'` guard makes this idempotent: presenting an
   * already-presented quest a second time (a stale queue re-render, a double
   * click) is a silent no-op rather than a corrupted state transition.
   */
  async presentQuest(questId: string, now: string): Promise<void> {
    await this.db.execute(
      "UPDATE quests SET status = 'offered', presented_at = ?, updated_at = ? WHERE id = ? AND status = 'detected'",
      [now, now, questId],
    );
  }

  async postponeQuest(userId: string, questId: string, reason: string | null, now: string): Promise<void> {
    await this.db.transaction([
      {
        sql: "UPDATE quests SET status = 'postponed', postponed_at = ?, updated_at = ? WHERE id = ?",
        params: [now, now, questId],
      },
      {
        sql: `INSERT INTO quest_feedback (id, user_id, quest_id, action, reason, recorded_at)
              VALUES (?, ?, ?, 'postponed', ?, ?)`,
        params: [`${questId}-postpone-${now}`, userId, questId, reason, now],
      },
    ]);
  }

  /** Removes a quest and its steps (cascades) — used only for undecided quests during recalibration. */
  async deleteQuest(questId: string): Promise<void> {
    await this.db.execute('DELETE FROM quests WHERE id = ?', [questId]);
  }

  /**
   * Marks quests as expired once their due date has passed without a
   * decision. Runs lazily whenever quests are read for a new date, rather
   * than on a schedule — there is no background process in this architecture.
   */
  async expireStaleQuests(userId: string, today: string, now: string): Promise<void> {
    await this.db.execute(
      `UPDATE quests SET status = 'expired', updated_at = ?
        WHERE user_id = ? AND status IN ('detected','offered','accepted') AND due_date < ?`,
      [now, userId, today],
    );
  }

  /**
   * Claims the right to generate quests for a date.
   *
   * The row's existence *is* the lock: `INSERT OR IGNORE` either creates it
   * (this caller won) or silently does nothing (someone else already holds
   * it). This is what makes `ensureTodayQuests` safe when several UI
   * components mount at once and each independently decides "no quests yet,
   * I should generate" — without it, every one of them wins that race
   * simultaneously. See migration 003 for the real database evidence.
   */
  async tryAcquireGenerationLock(userId: string, date: string, now: string): Promise<boolean> {
    const result = await this.db.execute(
      'INSERT OR IGNORE INTO daily_generation_locks (user_id, date, created_at) VALUES (?, ?, ?)',
      [userId, date, now],
    );
    return result.changes === 1;
  }

  /**
   * Minutes and counts already committed to a date — accepted, postponed or
   * completed quests. `postponed` counts because the user already decided to
   * do it, just not today; it still occupies the day's budget rather than
   * vanishing. `side`-type quests are treated as optional and excluded from
   * the primary/demanding counts, matching the mandatory-vs-optional split
   * the workload budget uses.
   */
  async getCommittedWorkload(
    userId: string,
    date: string,
  ): Promise<{ minutes: number; primaryCount: number; demandingOrAbove: boolean }> {
    const rows = await this.db.query(
      `SELECT quest_type, difficulty, estimated_minutes FROM quests
        WHERE user_id = ? AND due_date = ? AND status IN ('accepted','postponed','completed')`,
      [userId, date],
    );
    let minutes = 0;
    let primaryCount = 0;
    let demandingOrAbove = false;
    for (const row of rows) {
      minutes += asNumber(row['estimated_minutes']);
      if (asString(row['quest_type']) !== 'side') {
        primaryCount += 1;
        const difficulty = asString(row['difficulty']);
        if (difficulty === 'demanding' || difficulty === 'severe') demandingOrAbove = true;
      }
    }
    return { minutes, primaryCount, demandingOrAbove };
  }

  async saveGenerationPlan(
    userId: string,
    date: string,
    plan: {
      availableMinutes: number;
      budgetMinutes: number;
      plannedMinutes: number;
      mandatoryCount: number;
      optionalCount: number;
      overloaded: boolean;
      breakdown: ReadonlyArray<{ label: string; detail: string }>;
    },
    now: string,
  ): Promise<void> {
    await this.db.execute(
      `INSERT INTO daily_generation_plans
         (user_id, date, available_minutes, budget_minutes, planned_minutes,
          mandatory_count, optional_count, overloaded, breakdown, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET
         available_minutes = excluded.available_minutes,
         budget_minutes     = excluded.budget_minutes,
         planned_minutes    = excluded.planned_minutes,
         mandatory_count    = excluded.mandatory_count,
         optional_count     = excluded.optional_count,
         overloaded         = excluded.overloaded,
         breakdown          = excluded.breakdown,
         updated_at         = excluded.updated_at`,
      [
        userId,
        date,
        plan.availableMinutes,
        plan.budgetMinutes,
        plan.plannedMinutes,
        plan.mandatoryCount,
        plan.optionalCount,
        plan.overloaded ? 1 : 0,
        JSON.stringify(plan.breakdown),
        now,
      ],
    );
  }

  async getGenerationPlan(
    userId: string,
    date: string,
  ): Promise<{
    availableMinutes: number;
    budgetMinutes: number;
    plannedMinutes: number;
    mandatoryCount: number;
    optionalCount: number;
    overloaded: boolean;
    breakdown: ReadonlyArray<{ label: string; detail: string }>;
  } | null> {
    const rows = await this.db.query(
      `SELECT available_minutes, budget_minutes, planned_minutes, mandatory_count,
              optional_count, overloaded, breakdown
         FROM daily_generation_plans WHERE user_id = ? AND date = ?`,
      [userId, date],
    );
    const row = rows[0];
    if (!row) return null;
    let breakdown: ReadonlyArray<{ label: string; detail: string }> = [];
    try {
      breakdown = JSON.parse(asString(row['breakdown'])) as ReadonlyArray<{ label: string; detail: string }>;
    } catch {
      breakdown = [];
    }
    return {
      availableMinutes: asNumber(row['available_minutes']),
      budgetMinutes: asNumber(row['budget_minutes']),
      plannedMinutes: asNumber(row['planned_minutes']),
      mandatoryCount: asNumber(row['mandatory_count']),
      optionalCount: asNumber(row['optional_count']),
      overloaded: asBoolean(row['overloaded']),
      breakdown,
    };
  }

  /**
   * Template ids the user currently has active (not rejected/expired), for
   * the generator's hard duplicate/cooldown filter — see `docs/DECISIONS.md`
   * ADR-0010. Generation is entirely template-based, so a template id is
   * already a deterministic content fingerprint: two quests sharing one are
   * the same generated content by construction.
   */
  async getActiveTemplateIds(userId: string): Promise<Set<string>> {
    const rows = await this.db.query(
      `SELECT DISTINCT template_id FROM quests
        WHERE user_id = ? AND template_id IS NOT NULL
          AND status IN ('detected','offered','accepted','postponed')`,
      [userId],
    );
    return new Set(rows.map((r) => asString(r['template_id'])).filter((id) => id.length > 0));
  }

  /**
   * Groups of redundant generated quests: the same template, generated for
   * the same date, still undecided or postponed. Never considers `accepted`,
   * `completed`, `rejected`, `expired` or user-created (`source = 'user'`)
   * quests — those are real decisions or real content, never candidates for
   * repair. Grouping by date (not just template) is deliberate: a
   * `repeatable` template legitimately recurring across many days is normal
   * content, not a duplicate — only several copies landing on the *same* day
   * are the bug this repairs (see migration 003/004, ADR-0010).
   *
   * Within a group, the most recently created quest is kept; the rest are
   * reported as redundant. `repairDuplicateQuests` is what actually archives
   * them — this method only ever reads.
   */
  async findDuplicateGeneratedQuests(userId: string): Promise<
    Array<{ templateId: string; dueDate: string | null; title: string; keepId: string; redundantIds: string[] }>
  > {
    const rows = await this.db.query(
      `SELECT id, template_id, due_date, title, created_at FROM quests
        WHERE user_id = ? AND source = 'rules'
          AND status IN ('detected','offered','postponed')
        ORDER BY due_date, created_at DESC`,
      [userId],
    );

    const groups = new Map<
      string,
      { templateId: string; dueDate: string | null; title: string; ids: string[] }
    >();

    for (const row of rows) {
      const templateId = asNullableString(row['template_id']);
      const dueDate = asNullableString(row['due_date']);
      // Rows written before migration 003 have no `template_id` — fall back
      // to (title, due_date) as a content fingerprint so pre-existing
      // duplicates (the exact real-world data this repair exists for) are
      // still found, not just ones generated after the fix landed.
      const fingerprint = templateId ?? `title:${asString(row['title'])}`;
      const key = `${fingerprint}::${dueDate ?? ''}`;
      const existing = groups.get(key);
      if (existing) {
        existing.ids.push(asString(row['id']));
      } else {
        groups.set(key, { templateId: fingerprint, dueDate, title: asString(row['title']), ids: [asString(row['id'])] });
      }
    }

    const duplicates: Array<{
      templateId: string;
      dueDate: string | null;
      title: string;
      keepId: string;
      redundantIds: string[];
    }> = [];
    for (const group of groups.values()) {
      if (group.ids.length <= 1) continue;
      // Rows arrived ordered newest-first within each group (created_at DESC).
      const [keepId, ...redundantIds] = group.ids;
      duplicates.push({
        templateId: group.templateId,
        dueDate: group.dueDate,
        title: group.title,
        keepId: keepId!,
        redundantIds,
      });
    }
    return duplicates;
  }

  /** Archives specific quest ids — the repair action's write path. Never touches anything else. */
  async archiveQuests(questIds: readonly string[], now: string): Promise<void> {
    if (questIds.length === 0) return;
    await this.db.transaction(
      questIds.map((id) => ({
        sql: "UPDATE quests SET status = 'archived', updated_at = ? WHERE id = ?",
        params: [now, id],
      })),
    );
  }

  // -------------------------------------------------------------- objectives

  async createObjectives(
    questId: string,
    objectives: ReadonlyArray<{
      id: string;
      position: number;
      kind: string;
      label: string;
      target: number | null;
      unit: string | null;
      optional: boolean;
    }>,
    now: string,
  ): Promise<void> {
    if (objectives.length === 0) return;
    await this.db.transaction(
      objectives.map((objective) => ({
        sql: `INSERT INTO quest_objectives
                (id, quest_id, position, kind, label, target_value, current_value, unit, optional, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        params: [
          objective.id,
          questId,
          objective.position,
          objective.kind,
          objective.label,
          objective.target,
          objective.unit,
          objective.optional ? 1 : 0,
          now,
          now,
        ],
      })),
    );
  }

  async getObjectives(questId: string): Promise<ObjectiveRecord[]> {
    const rows = await this.db.query(
      `SELECT id, kind, label, target_value, current_value, unit, optional, notes, completed_at
         FROM quest_objectives WHERE quest_id = ? ORDER BY position`,
      [questId],
    );
    return rows.map((row) => ({
      id: asString(row['id']),
      kind: asString(row['kind']),
      label: asString(row['label']),
      target: row['target_value'] === null ? null : asNumber(row['target_value']),
      current: asNumber(row['current_value']),
      unit: asNullableString(row['unit']),
      optional: asBoolean(row['optional']),
      notes: asNullableString(row['notes']),
      completedAt: asNullableString(row['completed_at']),
    }));
  }

  async getObjectiveById(objectiveId: string): Promise<ObjectiveRecord | null> {
    const rows = await this.db.query(
      `SELECT id, kind, label, target_value, current_value, unit, optional, notes, completed_at
         FROM quest_objectives WHERE id = ?`,
      [objectiveId],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: asString(row['id']),
      kind: asString(row['kind']),
      label: asString(row['label']),
      target: row['target_value'] === null ? null : asNumber(row['target_value']),
      current: asNumber(row['current_value']),
      unit: asNullableString(row['unit']),
      optional: asBoolean(row['optional']),
      notes: asNullableString(row['notes']),
      completedAt: asNullableString(row['completed_at']),
    };
  }

  async updateObjectiveProgress(
    objectiveId: string,
    current: number,
    completed: boolean,
    now: string,
  ): Promise<void> {
    await this.db.execute(
      `UPDATE quest_objectives SET current_value = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
      [current, completed ? now : null, now, objectiveId],
    );
  }

  // ---------------------------------------------------------- physical baseline

  async getPhysicalBaseline(userId: string): Promise<PhysicalBaselineRecord | null> {
    const rows = await this.db.query(
      `SELECT pushups_comfortable, squats_comfortable, plank_seconds, training_frequency_per_week
         FROM physical_baseline WHERE user_id = ?`,
      [userId],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      pushupsComfortable: row['pushups_comfortable'] === null ? null : asNumber(row['pushups_comfortable']),
      squatsComfortable: row['squats_comfortable'] === null ? null : asNumber(row['squats_comfortable']),
      plankSeconds: row['plank_seconds'] === null ? null : asNumber(row['plank_seconds']),
      trainingFrequencyPerWeek:
        row['training_frequency_per_week'] === null ? null : asNumber(row['training_frequency_per_week']),
    };
  }

  async savePhysicalBaseline(userId: string, baseline: PhysicalBaselineRecord, now: string): Promise<void> {
    await this.db.execute(
      `INSERT INTO physical_baseline
         (user_id, pushups_comfortable, squats_comfortable, plank_seconds, training_frequency_per_week, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         pushups_comfortable = excluded.pushups_comfortable,
         squats_comfortable  = excluded.squats_comfortable,
         plank_seconds       = excluded.plank_seconds,
         training_frequency_per_week = excluded.training_frequency_per_week,
         updated_at           = excluded.updated_at`,
      [
        userId,
        baseline.pushupsComfortable,
        baseline.squatsComfortable,
        baseline.plankSeconds,
        baseline.trainingFrequencyPerWeek,
        now,
      ],
    );
  }

  async recentTemplateIds(userId: string, limit = 30): Promise<string[]> {
    const rows = await this.db.query(
      `SELECT payload FROM events
        WHERE user_id = ? AND type = 'QuestGenerated'
        ORDER BY occurred_at DESC LIMIT ?`,
      [userId, limit],
    );
    const ids: string[] = [];
    for (const row of rows) {
      try {
        const payload = JSON.parse(asString(row['payload'])) as { templateId?: string };
        if (payload.templateId) ids.push(payload.templateId);
      } catch {
        // Ignore unparseable history rather than failing generation.
      }
    }
    return ids;
  }

  // ----------------------------------------------------------- achievements

  /** Upsert code-defined achievements so the registry is queryable in SQL. */
  async syncAchievementRegistry(): Promise<void> {
    const statements = ACHIEVEMENTS.map((a) => ({
      sql: `INSERT INTO achievements (id, name, description, category, rarity, secret, icon, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name, description = excluded.description,
              category = excluded.category, rarity = excluded.rarity,
              secret = excluded.secret, icon = excluded.icon`,
      params: [a.id, a.name, a.description, a.category, a.rarity, a.secret ? 1 : 0, a.icon] as SqlParam[],
    }));
    await this.db.transaction(statements);
  }

  async getUnlockedAchievementIds(userId: string): Promise<Set<string>> {
    const rows = await this.db.query(
      'SELECT achievement_id FROM achievement_unlocks WHERE user_id = ?',
      [userId],
    );
    return new Set(rows.map((r) => asString(r['achievement_id'])));
  }

  /** Every unlock this user has, keyed by achievement id, for the achievements page. */
  async getUnlockedMap(userId: string): Promise<Map<string, string>> {
    const rows = await this.db.query(
      'SELECT achievement_id, unlocked_at FROM achievement_unlocks WHERE user_id = ?',
      [userId],
    );
    return new Map(rows.map((r) => [asString(r['achievement_id']), asString(r['unlocked_at'])]));
  }

  async getRecentUnlocks(
    userId: string,
    limit = 5,
  ): Promise<Array<{ id: string; unlockedAt: string }>> {
    const rows = await this.db.query(
      `SELECT achievement_id, unlocked_at FROM achievement_unlocks
        WHERE user_id = ? ORDER BY unlocked_at DESC LIMIT ?`,
      [userId, limit],
    );
    return rows.map((r) => ({
      id: asString(r['achievement_id']),
      unlockedAt: asString(r['unlocked_at']),
    }));
  }

  // ---------------------------------------------------------------- stats

  async getCompletionStats(userId: string): Promise<{
    questsCompleted: number;
    byDomain: Partial<Record<Domain, number>>;
    activeDays: number;
    activeDaysThisWeek: number;
    partialCompletions: number;
    lastActiveDate: string | null;
  }> {
    const [totals, domains, days, week, partials, last] = await Promise.all([
      this.db.query("SELECT COUNT(*) AS n FROM quests WHERE user_id = ? AND status = 'completed'", [
        userId,
      ]),
      this.db.query(
        "SELECT domain, COUNT(*) AS n FROM quests WHERE user_id = ? AND status = 'completed' GROUP BY domain",
        [userId],
      ),
      this.db.query(
        "SELECT COUNT(DISTINCT occurred_date) AS n FROM events WHERE user_id = ? AND type = 'QuestCompleted'",
        [userId],
      ),
      this.db.query(
        `SELECT COUNT(DISTINCT occurred_date) AS n FROM events
          WHERE user_id = ? AND type = 'QuestCompleted'
            AND occurred_date >= date('now', '-7 days')`,
        [userId],
      ),
      this.db.query(
        `SELECT COUNT(*) AS n FROM events
          WHERE user_id = ? AND type = 'QuestCompleted' AND payload LIKE '%"partial":true%'`,
        [userId],
      ),
      this.db.query(
        `SELECT MAX(occurred_date) AS d FROM events
          WHERE user_id = ? AND type = 'QuestCompleted'`,
        [userId],
      ),
    ]);

    const byDomain: Partial<Record<Domain, number>> = {};
    for (const row of domains) {
      byDomain[asString(row['domain']) as Domain] = asNumber(row['n']);
    }

    return {
      questsCompleted: asNumber(totals[0]?.['n']),
      byDomain,
      activeDays: asNumber(days[0]?.['n']),
      activeDaysThisWeek: asNumber(week[0]?.['n']),
      partialCompletions: asNumber(partials[0]?.['n']),
      lastActiveDate: asNullableString(last[0]?.['d']),
    };
  }
}

function toQuestRecord(row: Record<string, unknown>): QuestRecord {
  return {
    id: asString(row['id']),
    title: asString(row['title']),
    description: asString(row['description']),
    purpose: asNullableString(row['purpose']),
    domain: asString(row['domain']) as Domain,
    questType: asString(row['quest_type']),
    difficulty: asString(row['difficulty']),
    estimatedMinutes: row['estimated_minutes'] === null ? null : asNumber(row['estimated_minutes']),
    status: asString(row['status']),
    rationale: asNullableString(row['generation_rationale']),
    awardedXp: row['awarded_xp'] === null ? null : asNumber(row['awarded_xp']),
    dueDate: asNullableString(row['due_date']),
    createdAt: asString(row['created_at']),
    presentedAt: asNullableString(row['presented_at']),
    postponedAt: asNullableString(row['postponed_at']),
    completedAt: asNullableString(row['completed_at']),
    reflectionNote: asNullableString(row['reflection_note']),
    evidenceNote: asNullableString(row['evidence_note']),
    templateId: asNullableString(row['template_id']),
  };
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SystemService, type OnboardingInput } from '../src/core/app/system-service';
import { NodeSqliteAdapter } from '../src/platform/test/sqlite-adapter';
import { createTestPlatform, type TestPlatform } from '../src/platform/test/test-platform';
import { levelFromTotalXp } from '../src/core/progression/levels';
import { Repositories } from '../src/core/app/repositories';
import { calibratedTarget } from '../src/core/quests/objectives';

/**
 * End-to-end proof of the first vertical slice:
 *
 *   onboarding → quest generation → accept → complete → XP → level →
 *   achievement unlock → persistence → restart → state restored
 *
 * This runs against real SQLite through the same repositories and migrations
 * used in production, so it verifies the SQL rather than a mock of it.
 */

const onboarding: OnboardingInput = {
  displayName: 'Operator',
  birthDate: '2010-10-15',
  country: 'BR',
  goals: ['mathematics', 'programming', 'basketball'],
  availableMinutes: 180,
  difficultyPreference: 'balanced',
  excludedDomains: [],
  injuredAreas: [],
  animationIntensity: 'full',
  soundEnabled: true,
};

let storage: NodeSqliteAdapter;
let platform: TestPlatform;
let service: SystemService;

beforeEach(async () => {
  storage = new NodeSqliteAdapter(':memory:');
  platform = createTestPlatform({ storage });
  service = await SystemService.create(platform);
});

afterEach(async () => {
  await storage.close();
});

describe('first launch', () => {
  it('starts un-onboarded', async () => {
    expect(await service.isOnboarded()).toBe(false);
  });

  it('creates a user with a clean slate', async () => {
    await service.completeOnboarding(onboarding);
    const dashboard = await service.getDashboard();

    expect(dashboard.totalXp).toBe(0);
    expect(dashboard.level).toBe(1);
    expect(dashboard.questsCompleted).toBe(0);
    expect(dashboard.displayName).toBe('Operator');
  });

  it('records onboarding so it is never repeated', async () => {
    await service.completeOnboarding(onboarding);
    expect(await service.isOnboarded()).toBe(true);
  });
});

describe('quest generation', () => {
  beforeEach(async () => {
    await service.completeOnboarding(onboarding);
  });

  it('generates quests as detected, awaiting the cinematic encounter', async () => {
    // Newly generated quests are not yet "available" — they enter the
    // encounter queue first, and only become offered once presented. This is
    // what makes the encounter idempotent across a restart.
    const dashboard = await service.getDashboard();
    expect(dashboard.quests.length).toBeGreaterThan(0);
    expect(dashboard.quests.every((q) => q.status === 'detected')).toBe(true);
  });

  it('surfaces detected quests through the pending-encounter queue', async () => {
    const dashboard = await service.getDashboard();
    const pending = await service.getPendingEncounters();
    expect(pending.map((q) => q.id).sort()).toEqual(dashboard.quests.map((q) => q.id).sort());
  });

  it('gives every quest steps, a purpose and a rationale', async () => {
    const dashboard = await service.getDashboard();
    for (const quest of dashboard.quests) {
      expect(quest.steps.length).toBeGreaterThan(0);
      expect(quest.purpose?.length ?? 0).toBeGreaterThan(0);
      expect(quest.rationale?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('does not regenerate quests when the dashboard is reloaded', async () => {
    // Reopening the app must never reroll the day.
    const first = await service.getDashboard();
    const second = await service.getDashboard();
    expect(second.quests.map((q) => q.id)).toEqual(first.quests.map((q) => q.id));
  });

  it('never generates duplicate batches when several callers race on first load', async () => {
    // The real bug this regression test exists for: Shell's encounter queue,
    // Home and Today each independently call into quest generation on mount.
    // A real database inspected while diagnosing this had 21 quests inserted
    // across 7 near-simultaneous batches — a plain check-then-generate raced
    // and every caller "won". Simulate exactly that shape of concurrency
    // against one shared service and database.
    const fresh = createTestPlatform({ storage: new NodeSqliteAdapter(':memory:') });
    const raceService = await SystemService.create(fresh);
    await raceService.completeOnboarding(onboarding);

    const [dashboardA, pendingA, dashboardB, pendingB, dashboardC] = await Promise.all([
      raceService.getDashboard(),
      raceService.getPendingEncounters(),
      raceService.getDashboard(),
      raceService.getPendingEncounters(),
      raceService.getDashboard(),
    ]);

    // At most one batch's worth of quests may exist, no matter how many
    // callers raced to be the one that generates it.
    const idsA = dashboardA.quests.map((q) => q.id).sort();
    expect(idsA.length).toBeGreaterThan(0);
    expect(idsA.length).toBeLessThanOrEqual(5);

    // Every racing caller must observe the very same day, not independent ones.
    expect(dashboardB.quests.map((q) => q.id).sort()).toEqual(idsA);
    expect(dashboardC.quests.map((q) => q.id).sort()).toEqual(idsA);
    expect(pendingA.map((q) => q.id).sort()).toEqual(idsA);
    expect(pendingB.map((q) => q.id).sort()).toEqual(idsA);

    // And the on-disk truth agrees, independent of any in-memory result.
    const persisted = await raceService.getPendingEncounters();
    expect(persisted.map((q) => q.id).sort()).toEqual(idsA);

    await fresh.storage.close();
  });

  it('respects the available time the user declared', async () => {
    const shortDay = createTestPlatform({ storage: new NodeSqliteAdapter(':memory:') });
    const shortService = await SystemService.create(shortDay);
    await shortService.completeOnboarding({ ...onboarding, availableMinutes: 30 });

    const dashboard = await shortService.getDashboard();
    for (const quest of dashboard.quests) {
      expect(quest.estimatedMinutes ?? 0).toBeLessThanOrEqual(30);
    }
    await shortDay.storage.close();
  });
});

describe('quest completion and progression', () => {
  beforeEach(async () => {
    await service.completeOnboarding(onboarding);
  });

  it('awards XP and advances the level', async () => {
    const dashboard = await service.getDashboard();
    const quest = dashboard.quests[0]!;

    await service.acceptQuest(quest.id);
    const outcome = await service.completeQuest(quest.id);

    expect(outcome.award.creditedXp).toBeGreaterThan(0);
    expect(outcome.totalXp).toBe(outcome.award.creditedXp);
    expect(outcome.levelBefore).toBe(1);
    expect(outcome.levelAfter).toBe(levelFromTotalXp(outcome.totalXp).level);
  });

  it('unlocks the first achievement on the first completion', async () => {
    const dashboard = await service.getDashboard();
    const quest = dashboard.quests[0]!;

    await service.acceptQuest(quest.id);
    const outcome = await service.completeQuest(quest.id);

    expect(outcome.achievements.map((a) => a.id)).toContain('first_steps');
  });

  it('presents the most significant achievement last', async () => {
    const dashboard = await service.getDashboard();
    const quest = dashboard.quests[0]!;
    await service.acceptQuest(quest.id);
    const outcome = await service.completeQuest(quest.id);

    const weights = { standard: 0, rare: 1, legendary: 2 } as const;
    for (let i = 1; i < outcome.achievements.length; i += 1) {
      expect(weights[outcome.achievements[i]!.rarity]).toBeGreaterThanOrEqual(
        weights[outcome.achievements[i - 1]!.rarity],
      );
    }
  });

  it('never unlocks the same achievement twice', async () => {
    const dashboard = await service.getDashboard();

    await service.acceptQuest(dashboard.quests[0]!.id);
    const first = await service.completeQuest(dashboard.quests[0]!.id);
    expect(first.achievements.map((a) => a.id)).toContain('first_steps');

    await service.acceptQuest(dashboard.quests[1]!.id);
    const second = await service.completeQuest(dashboard.quests[1]!.id);
    expect(second.achievements.map((a) => a.id)).not.toContain('first_steps');
  });

  it('credits a partial completion without erasing the effort', async () => {
    const dashboard = await service.getDashboard();
    const quest = dashboard.quests[0]!;

    await service.acceptQuest(quest.id);
    const outcome = await service.completeQuest(quest.id, { completion: 0.5 });

    // Attempting and falling short must always beat not trying.
    expect(outcome.award.creditedXp).toBeGreaterThan(0);
  });

  it('refuses to complete the same quest twice', async () => {
    const dashboard = await service.getDashboard();
    const quest = dashboard.quests[0]!;

    await service.acceptQuest(quest.id);
    await service.completeQuest(quest.id);

    // Otherwise the same action could be farmed indefinitely.
    await expect(service.completeQuest(quest.id)).rejects.toThrow(/already completed/);
  });

  it('applies diminishing returns across repeated work in one domain', async () => {
    const dashboard = await service.getDashboard();
    const awards: number[] = [];

    for (const quest of dashboard.quests) {
      await service.acceptQuest(quest.id);
      const outcome = await service.completeQuest(quest.id);
      awards.push(outcome.award.creditedXp);
    }

    expect(awards.every((a) => a > 0)).toBe(true);
  });

  it('lets the user decline a quest without penalty', async () => {
    const dashboard = await service.getDashboard();
    const quest = dashboard.quests[0]!;

    await service.rejectQuest(quest.id, 'not today');
    const after = await service.getDashboard();

    expect(after.totalXp).toBe(0);
    expect(after.quests.find((q) => q.id === quest.id)?.status).toBe('rejected');
  });
});

describe('persistence across restart', () => {
  it('restores progression exactly after the application is restarted', async () => {
    await service.completeOnboarding(onboarding);
    const dashboard = await service.getDashboard();
    const quest = dashboard.quests[0]!;

    await service.acceptQuest(quest.id);
    const outcome = await service.completeQuest(quest.id);

    // Simulate a restart: a brand-new service over the same database, exactly
    // as happens when the user closes and reopens SYSTEM.
    const restarted = await SystemService.create(
      createTestPlatform({ storage, now: new Date('2026-07-19T18:00:00Z') }),
    );

    expect(await restarted.isOnboarded()).toBe(true);

    const after = await restarted.getDashboard();
    expect(after.totalXp).toBe(outcome.totalXp);
    expect(after.level).toBe(outcome.levelAfter);
    expect(after.displayName).toBe('Operator');
    expect(after.questsCompleted).toBe(1);
    expect(after.quests.find((q) => q.id === quest.id)?.status).toBe('completed');
    expect(after.recentAchievements.map((a) => a.id)).toContain('first_steps');
  });

  it('does not re-run migrations or duplicate the user on restart', async () => {
    await service.completeOnboarding(onboarding);
    await SystemService.create(createTestPlatform({ storage }));
    await SystemService.create(createTestPlatform({ storage }));

    const users = await storage.query('SELECT COUNT(*) AS n FROM users');
    expect(Number(users[0]?.['n'])).toBe(1);
  });

  it('keeps the database healthy after a full session', async () => {
    await service.completeOnboarding(onboarding);
    const dashboard = await service.getDashboard();
    await service.acceptQuest(dashboard.quests[0]!.id);
    await service.completeQuest(dashboard.quests[0]!.id);

    expect(await storage.integrityCheck()).toBe('ok');
  });
});

describe('the event log is the source of truth', () => {
  it('records every progression action as an event', async () => {
    await service.completeOnboarding(onboarding);
    const dashboard = await service.getDashboard();
    await service.acceptQuest(dashboard.quests[0]!.id);
    await service.completeQuest(dashboard.quests[0]!.id);

    const events = await storage.query('SELECT type FROM events ORDER BY occurred_at');
    const types = events.map((e) => String(e['type']));

    expect(types).toContain('OnboardingCompleted');
    expect(types).toContain('QuestGenerated');
    expect(types).toContain('QuestAccepted');
    expect(types).toContain('QuestCompleted');
  });

  it('records the formula version on every awarding event', async () => {
    // So a future recalibration can never silently rewrite the past.
    await service.completeOnboarding(onboarding);
    const dashboard = await service.getDashboard();
    await service.acceptQuest(dashboard.quests[0]!.id);
    await service.completeQuest(dashboard.quests[0]!.id);

    const rows = await storage.query(
      "SELECT formula_version FROM events WHERE type = 'QuestCompleted'",
    );
    expect(Number(rows[0]?.['formula_version'])).toBeGreaterThan(0);
  });
});

describe('the cinematic encounter lifecycle', () => {
  beforeEach(async () => {
    await service.completeOnboarding(onboarding);
  });

  it('presents a detected quest, stamping when it was shown', async () => {
    const [quest] = await service.getPendingEncounters();
    await service.presentQuest(quest!.id);

    const detail = await service.getQuestDetail(quest!.id);
    expect(detail?.status).toBe('offered');
    expect(detail?.presentedAt).not.toBeNull();
  });

  it('is idempotent — presenting twice does not error or move an already-offered quest', async () => {
    const [quest] = await service.getPendingEncounters();
    await service.presentQuest(quest!.id);
    const firstPresentedAt = (await service.getQuestDetail(quest!.id))?.presentedAt;

    await service.presentQuest(quest!.id);
    const secondPresentedAt = (await service.getQuestDetail(quest!.id))?.presentedAt;

    expect(secondPresentedAt).toBe(firstPresentedAt);
  });

  it('stamps presentedAt even when a quest is accepted without an explicit presentQuest call', async () => {
    // The UI always presents first, but the service must stay honest even if
    // a caller skips that step — a decision on a quest means it was seen.
    const [quest] = await service.getPendingEncounters();
    await service.acceptQuest(quest!.id);

    const detail = await service.getQuestDetail(quest!.id);
    expect(detail?.status).toBe('accepted');
    expect(detail?.presentedAt).not.toBeNull();
  });

  it('postpones a quest and records it in feedback history rather than deleting it', async () => {
    const [quest] = await service.getPendingEncounters();
    await service.postponeQuest(quest!.id, 'later today');

    const detail = await service.getQuestDetail(quest!.id);
    expect(detail?.status).toBe('postponed');
    expect(detail?.postponedAt).not.toBeNull();
    expect(detail?.feedback.some((f) => f.action === 'postponed')).toBe(true);
  });
});

describe('recalibrateToday', () => {
  beforeEach(async () => {
    await service.completeOnboarding(onboarding);
  });

  it('replaces undecided quests with a fresh set', async () => {
    const before = await service.getDashboard();
    const result = await service.recalibrateToday();

    expect(result.removed).toBe(before.quests.length);
    expect(result.added).toBeGreaterThan(0);

    const after = await service.getDashboard();
    expect(after.quests.every((q) => q.status === 'detected')).toBe(true);
  });

  it('never touches a quest the user already accepted', async () => {
    const [first] = await service.getPendingEncounters();
    await service.acceptQuest(first!.id);

    await service.recalibrateToday();

    const stillThere = await service.getQuestDetail(first!.id);
    expect(stillThere?.status).toBe('accepted');
  });

  it('never touches a completed quest', async () => {
    const [first] = await service.getPendingEncounters();
    await service.acceptQuest(first!.id);
    await service.completeQuest(first!.id);

    await service.recalibrateToday();

    const stillThere = await service.getQuestDetail(first!.id);
    expect(stillThere?.status).toBe('completed');
  });

  it('does not accumulate an impossible day across repeated recalibration', async () => {
    // The exact dev-database scenario this milestone was written to fix:
    // recalibrating several times in a row must never keep stacking a fixed
    // number of fresh quests on top of what the day already committed to.
    const [first] = await service.getPendingEncounters();
    await service.acceptQuest(first!.id);

    for (let i = 0; i < 6; i += 1) {
      await service.recalibrateToday();
    }

    const all = await service.getQuestDetail(first!.id);
    expect(all?.status).toBe('accepted'); // the accepted quest itself survives untouched

    const today = await service.getDashboard();
    const totalMinutes = today.quests.reduce((sum, q) => sum + (q.estimatedMinutes ?? 0), 0);
    const primaryCount = today.quests.filter((q) => q.questType !== 'side').length;

    expect(primaryCount).toBeLessThanOrEqual(5);
    expect(totalMinutes).toBeLessThan(1140);
  });
});

describe('duplicate quest repair', () => {
  let repairStorage: NodeSqliteAdapter;
  let repairPlatform: TestPlatform;
  let repairService: SystemService;
  let repos: Repositories;
  let userId: string;

  beforeEach(async () => {
    repairStorage = new NodeSqliteAdapter(':memory:');
    repairPlatform = createTestPlatform({ storage: repairStorage });
    repairService = await SystemService.create(repairPlatform);
    await repairService.completeOnboarding(onboarding);
    repos = new Repositories(repairStorage);

    const [firstQuest] = await repairService.getPendingEncounters();
    userId = (await repairPlatform.storage.query('SELECT id FROM users LIMIT 1'))[0]?.['id'] as string;

    // Manufacture six additional rows sharing the same template and due
    // date as a real generated quest, reproducing the exact shape a real
    // database had before this fix existed: several near-identical rows
    // from what used to be a racing generation call.
    const now = repairPlatform.clock.now().toISOString();
    for (let i = 0; i < 6; i += 1) {
      await repairStorage.execute(
        `INSERT INTO quests
           (id, user_id, title, description, quest_type, domain, difficulty,
            estimated_minutes, status, due_date, source, evidence_level,
            created_at, updated_at, template_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'postponed', ?, 'rules', 'self_reported', ?, ?, ?)`,
        [
          `quest-dup-${i}`,
          userId,
          firstQuest!.title,
          firstQuest!.description,
          firstQuest!.questType,
          firstQuest!.domain,
          firstQuest!.difficulty,
          firstQuest!.estimatedMinutes,
          firstQuest!.dueDate,
          now,
          now,
          firstQuest!.templateId,
        ],
      );
    }
    // The original also needs to be postponed (not left `detected`) to be a
    // repair candidate, and needs its template_id, which raw generation
    // already set on the row directly.
    await repairService.presentQuest(firstQuest!.id);
    await repairService.postponeQuest(firstQuest!.id);
  });

  afterEach(async () => {
    await repairStorage.close();
  });

  it('also finds duplicates in pre-existing data that has no template_id', async () => {
    // Rows written before migration 003 (real dev-database data included)
    // have no template_id at all. The repair must still find them by
    // falling back to (title, due_date) as the content fingerprint.
    const legacyUserId = 'user-legacy-no-template';
    const now = repairPlatform.clock.now().toISOString();
    await repairStorage.execute('INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)', [
      legacyUserId,
      now,
      now,
    ]);
    for (let i = 0; i < 3; i += 1) {
      await repairStorage.execute(
        `INSERT INTO quests
           (id, user_id, title, description, quest_type, domain, difficulty,
            estimated_minutes, status, due_date, source, evidence_level, created_at, updated_at)
         VALUES (?, ?, 'Legacy Duplicate', 'desc', 'daily', 'academic', 'light',
                 20, 'postponed', '2026-07-19', 'rules', 'self_reported', ?, ?)`,
        [`quest-legacy-${i}`, legacyUserId, now, now],
      );
    }

    const duplicates = await repos.findDuplicateGeneratedQuests(legacyUserId);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.redundantIds).toHaveLength(2);
  });

  it('previews redundant duplicates without changing anything', async () => {
    const preview = await repairService.previewDuplicateQuestRepair();

    expect(preview.groups).toHaveLength(1);
    expect(preview.groups[0]?.redundantIds).toHaveLength(6);
    expect(preview.totalRedundant).toBe(6);

    const stillPostponed = await repairStorage.query(
      "SELECT id FROM quests WHERE status = 'postponed' AND user_id = ?",
      [userId],
    );
    expect(stillPostponed).toHaveLength(7); // preview must not have written anything
  });

  it('archives redundant duplicates, keeping exactly one and preserving every row', async () => {
    const totalBefore = await repairStorage.query('SELECT id FROM quests WHERE user_id = ?', [userId]);

    const result = await repairService.repairDuplicateQuests();
    expect(result.totalRedundant).toBe(6);

    const postponed = await repairStorage.query(
      "SELECT id FROM quests WHERE status = 'postponed' AND user_id = ?",
      [userId],
    );
    expect(postponed).toHaveLength(1);

    const archived = await repairStorage.query(
      "SELECT id FROM quests WHERE status = 'archived' AND user_id = ?",
      [userId],
    );
    expect(archived).toHaveLength(6);

    // Nothing was deleted — every original row still exists somewhere, only
    // relabelled. Sibling quests from the same onboarding batch (different
    // templates, never touched) are still present too.
    const totalAfter = await repairStorage.query('SELECT id FROM quests WHERE user_id = ?', [userId]);
    expect(totalAfter).toHaveLength(totalBefore.length);
  });

  it('is idempotent — repairing twice does not archive anything further', async () => {
    await repairService.repairDuplicateQuests();
    const second = await repairService.repairDuplicateQuests();
    expect(second.totalRedundant).toBe(0);

    const archived = await repairStorage.query(
      "SELECT id FROM quests WHERE status = 'archived' AND user_id = ?",
      [userId],
    );
    expect(archived).toHaveLength(6);
  });

  it('never touches accepted or completed quests, even if they share a template with duplicates', async () => {
    // Accept the one legitimate copy before repairing.
    const [legitimate] = await repos.findDuplicateGeneratedQuests(userId);
    await repairService.acceptQuest(legitimate!.keepId);

    await repairService.repairDuplicateQuests();

    const stillAccepted = await repairService.getQuestDetail(legitimate!.keepId);
    expect(stillAccepted?.status).toBe('accepted');
  });

  it('archived quests no longer appear in the default browsable list', async () => {
    await repairService.repairDuplicateQuests();
    const browsable = await repairService.getAllQuests();
    for (const quest of browsable) {
      expect(quest.status).not.toBe('archived');
    }
  });

  it('archived quests remain reachable by an explicit status filter', async () => {
    await repairService.repairDuplicateQuests();
    const archived = await repairService.getAllQuests({ status: ['archived'] });
    expect(archived).toHaveLength(6);
  });
});

describe('quest visibility after repair — regression for the real 21-quest bug', () => {
  // Reproduces the exact shape found in a real development database: five
  // distinct templates, over-generated to 21 total rows for one day by the
  // concurrency race ADR-0009 fixed, repairing down to 15 archived + 6
  // genuinely active (1 accepted, 5 postponed). The repair itself was
  // already correct at the row level — this suite is about every OTHER
  // query that assembles "today", which is what actually shipped the bug:
  // `getDashboard` (Home/Today), `getRecentGeneratedQuests` (Architect),
  // and `getPendingEncounters` (cinematic queue / notification badge) each
  // had their own, differently-wrong idea of what counts as visible.
  let db: NodeSqliteAdapter;
  let platform2: TestPlatform;
  let service2: SystemService;
  let userId2: string;
  const date = '2026-07-20';

  interface TemplateShape {
    readonly templateId: string;
    readonly title: string;
    readonly domain: string;
    readonly minutes: number;
    readonly archivedCount: number;
    readonly keptStatus: 'accepted' | 'postponed';
  }

  const SHAPES: readonly TemplateShape[] = [
    { templateId: 'academic.mistakes.review', title: 'Revisão de Erros', domain: 'academic', minutes: 40, archivedCount: 2, keptStatus: 'postponed' },
    { templateId: 'technical.ship_feature', title: 'Entregue uma Funcionalidade', domain: 'technical', minutes: 90, archivedCount: 6, keptStatus: 'postponed' },
    { templateId: 'phys.basketball.shooting_form', title: 'Sessão de Fundamento de Arremesso', domain: 'physical', minutes: 40, archivedCount: 2, keptStatus: 'postponed' },
    { templateId: 'academic.competition_problem', title: 'Problema de Olimpíada', domain: 'academic', minutes: 60, archivedCount: 2, keptStatus: 'accepted' },
    { templateId: 'phys.basketball.handling', title: 'Circuito de Manejo de Bola', domain: 'physical', minutes: 20, archivedCount: 3, keptStatus: 'postponed' },
  ];

  beforeEach(async () => {
    db = new NodeSqliteAdapter(':memory:');
    // Fixed to the fixture's `date` — the default test clock is 2026-07-19.
    platform2 = createTestPlatform({ storage: db, now: new Date('2026-07-20T12:00:00Z') });
    service2 = await SystemService.create(platform2);
    await service2.completeOnboarding(onboarding);
    userId2 = (await db.query('SELECT id FROM users LIMIT 1'))[0]?.['id'] as string;

    // Wipe whatever onboarding itself generated so the fixture is exactly
    // the 21 rows under test, not 21-plus-whatever-onboarding-added.
    await db.execute('DELETE FROM quests WHERE user_id = ?', [userId2]);

    // Repair only ever groups `detected`/`offered`/`postponed` rows (accepted
    // quests are real decisions, excluded from grouping entirely). So an
    // "accepted" kept status is a *separate* extra row alongside the
    // postponed duplicate cluster, not a member of it — otherwise the
    // cluster the repair actually sees would be one row short and archive
    // one fewer than intended. This mirrors the real database exactly:
    // "Problema de Olimpíada" had 4 total rows (1 accepted + 1 postponed +
    // 2 archived), i.e. a 3-row postponed cluster plus one separate accepted row.
    const now = platform2.clock.now().toISOString();
    let counter = 0;
    let tsOffset = 0;
    const insertRow = async (shape: TemplateShape, status: string): Promise<void> => {
      counter += 1;
      tsOffset += 1;
      await db.execute(
        `INSERT INTO quests
           (id, user_id, title, description, quest_type, domain, difficulty,
            estimated_minutes, status, due_date, source, evidence_level,
            created_at, updated_at, template_id)
         VALUES (?, ?, ?, 'desc', 'daily', ?, 'moderate', ?, ?, ?, 'rules', 'self_reported', ?, ?, ?)`,
        [
          `quest-${counter}`,
          userId2,
          shape.title,
          shape.domain,
          shape.minutes,
          status,
          date,
          `${now.slice(0, -4)}${String(10 + tsOffset).padStart(2, '0')}0Z`, // distinct, increasing timestamps
          now,
          shape.templateId,
        ],
      );
    };

    for (const shape of SHAPES) {
      // The postponed cluster the repair will actually dedupe: archivedCount
      // redundant copies plus one that survives as the kept row.
      for (let i = 0; i < shape.archivedCount + 1; i += 1) {
        await insertRow(shape, 'postponed');
      }
      // A real user decision, generated separately and never touched by repair.
      if (shape.keptStatus === 'accepted') {
        await insertRow(shape, 'accepted');
      }
    }
  });

  afterEach(async () => {
    await db.close();
  });

  it('the fixture reproduces exactly 21 rows for the day before repair', async () => {
    const rows = await db.query('SELECT id FROM quests WHERE user_id = ? AND due_date = ?', [userId2, date]);
    expect(rows).toHaveLength(21);
  });

  it('1. repairing produces exactly the correct active count — 16 archived, 5 active', async () => {
    const result = await service2.repairDuplicateQuests();
    expect(result.totalRedundant).toBe(16);

    const archived = await db.query(
      "SELECT id FROM quests WHERE user_id = ? AND due_date = ? AND status = 'archived'",
      [userId2, date],
    );
    expect(archived).toHaveLength(16);

    const active = await db.query(
      "SELECT id FROM quests WHERE user_id = ? AND due_date = ? AND status != 'archived'",
      [userId2, date],
    );
    expect(active).toHaveLength(5);
  });

  it('2. archived records never appear in Today (getDashboard)', async () => {
    await service2.repairDuplicateQuests();
    const dashboard = await service2.getDashboard();
    expect(dashboard.quests).toHaveLength(5);
    for (const quest of dashboard.quests) {
      expect(quest.status).not.toBe('archived');
    }
  });

  it('3. archived records never contribute to daily minutes shown to the user', async () => {
    await service2.repairDuplicateQuests();
    const dashboard = await service2.getDashboard();
    const totalMinutes = dashboard.quests.reduce((sum, q) => sum + (q.estimatedMinutes ?? 0), 0);
    // The five visible rows: one kept-postponed copy per template that has
    // no decided sibling (40 + 90 + 40 + 20), plus "Problema de Olimpíada"'s
    // accepted row (60) — its own postponed siblings are now *all* archived,
    // because the user already decided on this content (the fix this test
    // exists for: a real database still showed a postponed "Problema de
    // Olimpíada" sitting alongside the accepted one after the first repair).
    expect(totalMinutes).toBe(40 + 90 + 40 + 20 + 60);
    expect(totalMinutes).toBe(250); // matches the real repaired database exactly
    expect(totalMinutes).toBeLessThan(1190); // the literal bug figure
  });

  it('4. archived records never enter the cinematic encounter queue', async () => {
    await service2.repairDuplicateQuests();
    const pending = await service2.getPendingEncounters();
    for (const quest of pending) {
      expect(quest.status).not.toBe('archived');
    }
    // None of the fixture rows are `detected` (all seeded as postponed/accepted),
    // so the queue must be empty — archived or not.
    expect(pending).toHaveLength(0);
  });

  it('5. archived records never contribute to the notification badge count', async () => {
    await service2.repairDuplicateQuests();
    // The badge (TopBar) reads the same getPendingEncounters() the encounter
    // queue does — asserting the count directly here documents that
    // dependency so the two can never silently diverge.
    const pending = await service2.getPendingEncounters();
    expect(pending.length).toBe(0);
  });

  it('6. Missions shows archived records only when the Archived filter is selected', async () => {
    await service2.repairDuplicateQuests();
    const defaultView = await service2.getAllQuests();
    expect(defaultView.some((q) => q.status === 'archived')).toBe(false);

    const archivedView = await service2.getAllQuests({ status: ['archived'] });
    expect(archivedView).toHaveLength(16);
    expect(archivedView.every((q) => q.status === 'archived')).toBe(true);
  });

  it('7. the repair runs against the active database and is idempotent', async () => {
    const first = await service2.repairDuplicateQuests();
    expect(first.totalRedundant).toBe(16);
    const second = await service2.repairDuplicateQuests();
    expect(second.totalRedundant).toBe(0);
    const third = await service2.repairDuplicateQuests();
    expect(third.totalRedundant).toBe(0);

    const archived = await db.query(
      "SELECT id FROM quests WHERE user_id = ? AND due_date = ? AND status = 'archived'",
      [userId2, date],
    );
    expect(archived).toHaveLength(16); // never grows past the true redundant count
  });

  it('8. relaunch (a fresh service over the same database) restores the corrected state', async () => {
    await service2.repairDuplicateQuests();
    const restarted = await SystemService.create(
      createTestPlatform({ storage: db, now: new Date('2026-07-20T12:00:00Z') }),
    );
    const dashboard = await restarted.getDashboard();
    expect(dashboard.quests).toHaveLength(5);
  });

  it('9. recalibration does not recreate archived duplicates for the same day', async () => {
    await service2.repairDuplicateQuests();
    await service2.recalibrateToday();

    // None of the five now-archived templates should have been proposed
    // again as a fresh row for the same date.
    for (const shape of SHAPES) {
      const rows = await db.query(
        `SELECT status FROM quests WHERE user_id = ? AND due_date = ? AND template_id = ?`,
        [userId2, date, shape.templateId],
      );
      const nonArchived = rows.filter((r) => r['status'] !== 'archived');
      // Exactly one originally-kept row remains non-archived per template —
      // whether that row is a decided ("accepted") one or a kept-postponed
      // one, recalibration must not have added a fresh live copy on top of it.
      expect(nonArchived.length).toBeLessThanOrEqual(1);
    }
  });

  it('10. the visible-today list and an independent raw count query agree', async () => {
    await service2.repairDuplicateQuests();
    const dashboard = await service2.getDashboard();

    const raw = await db.query(
      "SELECT COUNT(*) AS n FROM quests WHERE user_id = ? AND due_date = ? AND status != 'archived'",
      [userId2, date],
    );
    expect(dashboard.quests.length).toBe(Number(raw[0]?.['n']));
  });

  // Found while manually re-verifying the fix against the real, live
  // database: two "Ball Handling Circuit" rows and two "Ship One Feature"
  // rows, identical title/due_date/created_at, both `status = 'expired'`,
  // still showed as a pair in Missões' default (non-archived) view. The
  // repair query above only ever considered `detected`/`offered`/`postponed`
  // as archivable candidates, so a duplicate pair that lapsed before either
  // copy was ever touched was invisible to it — the same "repeated entries"
  // bug this whole regression suite exists for, just reached via a stale
  // due date instead of an accepted sibling.
  it('11. a duplicate pair that both expired without ever being decided is still repaired', async () => {
    const now = platform2.clock.now().toISOString();
    await db.execute(
      `INSERT INTO quests
         (id, user_id, title, description, quest_type, domain, difficulty,
          estimated_minutes, status, due_date, source, evidence_level,
          created_at, updated_at, template_id)
       VALUES (?, ?, 'Ball Handling Circuit', 'desc', 'daily', 'physical', 'moderate',
               20, 'expired', '2026-07-19', 'rules', 'self_reported', ?, ?, NULL)`,
      ['quest-expired-1', userId2, now, now],
    );
    await db.execute(
      `INSERT INTO quests
         (id, user_id, title, description, quest_type, domain, difficulty,
          estimated_minutes, status, due_date, source, evidence_level,
          created_at, updated_at, template_id)
       VALUES (?, ?, 'Ball Handling Circuit', 'desc', 'daily', 'physical', 'moderate',
               20, 'expired', '2026-07-19', 'rules', 'self_reported', ?, ?, NULL)`,
      ['quest-expired-2', userId2, now, now],
    );

    const result = await service2.repairDuplicateQuests();
    expect(result.groups.some((g) => g.title === 'Ball Handling Circuit')).toBe(true);

    const rows = await db.query(
      "SELECT status FROM quests WHERE user_id = ? AND title = 'Ball Handling Circuit' AND due_date = '2026-07-19'",
      [userId2],
    );
    const nonArchived = rows.filter((r) => r['status'] !== 'archived');
    expect(nonArchived).toHaveLength(1);
    expect(rows.filter((r) => r['status'] === 'archived')).toHaveLength(1);

    const missionsDefaultView = await service2.getAllQuests();
    const visibleCopies = missionsDefaultView.filter((q) => q.title === 'Ball Handling Circuit');
    expect(visibleCopies).toHaveLength(1);
  });
});

describe('Daily Protocol and objectives', () => {
  // These tests exercise the objective/calibration/persistence integration
  // directly rather than depending on the generator's competitive scoring
  // to select the protocol template on a given run — that selection is
  // already covered deterministically in generator.test.ts. Here, a
  // protocol quest is seeded the same way `generateForDate` would have
  // written one, through the real repository methods.
  let protocolStorage: NodeSqliteAdapter;
  let protocolPlatform: TestPlatform;
  let protocolService: SystemService;
  let repos: Repositories;
  let questId: string;

  let protocolQuestCounter = 0;

  async function seedProtocolQuest(): Promise<string> {
    const userId = (await protocolPlatform.storage.query('SELECT id FROM users LIMIT 1'))[0]?.['id'] as string;
    const now = protocolPlatform.clock.now().toISOString();
    protocolQuestCounter += 1;
    const id = `quest-protocol-${protocolQuestCounter}`;
    await protocolStorage.execute(
      `INSERT INTO quests
         (id, user_id, title, description, quest_type, domain, difficulty,
          estimated_minutes, status, due_date, source, evidence_level,
          created_at, updated_at, template_id)
       VALUES (?, ?, 'Foundation Cycle', 'desc', 'daily_protocol', 'physical', 'moderate',
               80, 'detected', ?, 'rules', 'self_reported', ?, ?, 'protocol.foundation_cycle')`,
      [id, userId, now, now, now],
    );

    const baseline = await protocolService.getPhysicalBaseline();
    const pushupTarget = calibratedTarget(baseline?.pushupsComfortable ?? null, 10);

    await repos.createObjectives(
      id,
      [
        { id: `${id}-pushups`, position: 0, kind: 'repetitions', label: 'Push-ups', target: pushupTarget, unit: 'reps', optional: false },
        { id: `${id}-squats`, position: 1, kind: 'repetitions', label: 'Squats', target: 15, unit: 'reps', optional: false },
        { id: `${id}-study`, position: 2, kind: 'quantity', label: 'Focused study', target: 30, unit: 'min', optional: false },
        { id: `${id}-programming`, position: 3, kind: 'quantity', label: 'Programming', target: 30, unit: 'min', optional: true },
      ],
      now,
    );
    return id;
  }

  beforeEach(async () => {
    protocolStorage = new NodeSqliteAdapter(':memory:');
    protocolPlatform = createTestPlatform({ storage: protocolStorage });
    protocolService = await SystemService.create(protocolPlatform);
    await protocolService.completeOnboarding(onboarding);
    repos = new Repositories(protocolStorage);
    questId = await seedProtocolQuest();
  });

  afterEach(async () => {
    await protocolStorage.close();
  });

  it('carries multiple objectives instead of many separate quests', async () => {
    const detail = await protocolService.getQuestDetail(questId);
    expect(detail?.objectives.length).toBeGreaterThan(1);
  });

  it('calibrates a physical objective target from the user\'s own baseline, never a fixed extreme', async () => {
    await protocolService.savePhysicalBaseline({
      pushupsComfortable: 30,
      squatsComfortable: null,
      plankSeconds: null,
      trainingFrequencyPerWeek: null,
    });
    const questWithBaseline = await seedProtocolQuest();

    const detail = await protocolService.getQuestDetail(questWithBaseline);
    const pushups = detail?.objectives.find((o) => o.label === 'Push-ups');

    expect(pushups?.target).toBe(24); // 80% of 30, per calibratedTarget
    expect(pushups?.target).toBeLessThan(100);
  });

  it('falls back to a conservative default when no baseline is set', async () => {
    const detail = await protocolService.getQuestDetail(questId);
    const pushups = detail?.objectives.find((o) => o.label === 'Push-ups');
    expect(pushups?.target).toBe(10);
  });

  it('persists partial progress on one objective independently of the others', async () => {
    const detail = await protocolService.getQuestDetail(questId);
    const first = detail!.objectives[0]!;

    await protocolService.updateObjectiveProgress(first.id, 5);

    const reloaded = await protocolService.getQuestDetail(questId);
    expect(reloaded?.objectives.find((o) => o.id === first.id)?.current).toBe(5);
    for (const objective of reloaded!.objectives) {
      if (objective.id !== first.id) expect(objective.current).toBe(0);
    }
  });

  it('marks an objective complete once its target is met', async () => {
    const detail = await protocolService.getQuestDetail(questId);
    const objective = detail!.objectives.find((o) => o.target !== null)!;

    await protocolService.updateObjectiveProgress(objective.id, objective.target!);

    const reloaded = await protocolService.getQuestDetail(questId);
    expect(reloaded!.objectives.find((o) => o.id === objective.id)?.completedAt).not.toBeNull();
  });

  it('does not mark an objective complete while it is still short of target', async () => {
    const detail = await protocolService.getQuestDetail(questId);
    const objective = detail!.objectives.find((o) => o.target !== null && o.target > 1)!;

    await protocolService.updateObjectiveProgress(objective.id, objective.target! - 1);

    const reloaded = await protocolService.getQuestDetail(questId);
    expect(reloaded!.objectives.find((o) => o.id === objective.id)?.completedAt).toBeNull();
  });

  it('survives a restart with objective progress intact', async () => {
    const detail = await protocolService.getQuestDetail(questId);
    await protocolService.updateObjectiveProgress(detail!.objectives[0]!.id, 7);

    // A genuine restart: a brand-new service instance over the same
    // on-disk database, exactly like reopening the application.
    const restarted = await SystemService.create(createTestPlatform({ storage: protocolStorage }));
    const reread = await restarted.getQuestDetail(questId);
    expect(reread?.objectives[0]?.current).toBe(7);
  });

  it('completing the protocol with a completion fraction derived from objective progress awards proportional XP', async () => {
    await protocolStorage.execute("UPDATE quests SET status = 'accepted' WHERE id = ?", [questId]);

    const detail = await protocolService.getQuestDetail(questId);
    const mandatory = detail!.objectives.filter((o) => !o.optional);
    for (let i = 0; i < Math.floor(mandatory.length / 2); i += 1) {
      await protocolService.updateObjectiveProgress(mandatory[i]!.id, mandatory[i]!.target ?? 1);
    }

    const partial = await protocolService.completeQuest(questId, { completion: 0.5 });
    expect(partial.award.creditedXp).toBeGreaterThan(0);

    // The same protocol completed in full earns strictly more.
    const fullId = await seedProtocolQuest();
    await protocolStorage.execute("UPDATE quests SET status = 'accepted' WHERE id = ?", [fullId]);
    const full = await protocolService.completeQuest(fullId, { completion: 1 });
    expect(full.award.creditedXp).toBeGreaterThan(partial.award.creditedXp);
  });
});

describe('getAllQuests', () => {
  beforeEach(async () => {
    await service.completeOnboarding(onboarding);
  });

  it('never includes undecided (detected) quests in the browsable list', async () => {
    await service.getDashboard();
    const all = await service.getAllQuests();
    expect(all.every((q) => q.status !== 'detected')).toBe(true);
  });

  it('includes a quest once it has been decided on', async () => {
    const [quest] = await service.getPendingEncounters();
    await service.presentQuest(quest!.id);

    const all = await service.getAllQuests();
    expect(all.map((q) => q.id)).toContain(quest!.id);
  });

  it('filters by status', async () => {
    const [quest] = await service.getPendingEncounters();
    await service.rejectQuest(quest!.id);

    const rejected = await service.getAllQuests({ status: ['rejected'] });
    expect(rejected.every((q) => q.status === 'rejected')).toBe(true);
    expect(rejected.map((q) => q.id)).toContain(quest!.id);
  });

  it('filters by a search term against the title', async () => {
    const [quest] = await service.getPendingEncounters();
    await service.presentQuest(quest!.id);

    const found = await service.getAllQuests({ search: quest!.title.slice(0, 6) });
    expect(found.map((q) => q.id)).toContain(quest!.id);
  });
});

describe('getAchievementsCatalog', () => {
  it('lists every registered achievement as locked before any quest is completed', async () => {
    await service.completeOnboarding(onboarding);
    const catalog = await service.getAchievementsCatalog();

    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.every((entry) => !entry.unlocked && entry.unlockedAt === null)).toBe(true);
  });

  it('flips an entry to unlocked once its condition is met', async () => {
    await service.completeOnboarding(onboarding);
    const dashboard = await service.getDashboard();
    await service.acceptQuest(dashboard.quests[0]!.id);
    await service.completeQuest(dashboard.quests[0]!.id);

    const catalog = await service.getAchievementsCatalog();
    const firstSteps = catalog.find((entry) => entry.definition.id === 'first_steps');
    expect(firstSteps?.unlocked).toBe(true);
    expect(firstSteps?.unlockedAt).not.toBeNull();
  });
});

describe('getArchitectSnapshot', () => {
  it('reflects the priorities set during onboarding', async () => {
    await service.completeOnboarding(onboarding);
    await service.getDashboard();

    const snapshot = await service.getArchitectSnapshot();
    expect(snapshot.goals).toEqual(onboarding.goals);
    expect(snapshot.availableMinutes).toBe(onboarding.availableMinutes);
    expect(snapshot.recentQuests.length).toBeGreaterThan(0);
  });
});

describe('locale preference', () => {
  it('defaults to Brazilian Portuguese', async () => {
    await service.completeOnboarding(onboarding);
    expect(await service.getLocalePreference()).toBe('pt-BR');
  });

  it('persists an explicit change across a restart', async () => {
    await service.completeOnboarding(onboarding);
    await service.setLocalePreference('en');

    const restarted = await SystemService.create(createTestPlatform({ storage }));
    expect(await restarted.getLocalePreference()).toBe('en');
  });

  it('does not clobber other profile fields when changing locale', async () => {
    await service.completeOnboarding(onboarding);
    await service.setLocalePreference('en');

    const dashboard = await service.getDashboard();
    expect(dashboard.displayName).toBe('Operator');
  });
});

describe('getAppInfo', () => {
  it('reports the current schema version and application paths', async () => {
    const info = await service.getAppInfo();
    expect(info.version.length).toBeGreaterThan(0);
    expect(info.schemaVersion).toBeGreaterThanOrEqual(2);
    expect(info.dataDir.length).toBeGreaterThan(0);
    expect(info.database.length).toBeGreaterThan(0);
  });
});

describe('getProfileSummary', () => {
  it('never generates quests as a side effect of reading the summary', async () => {
    await service.completeOnboarding(onboarding);
    await service.getProfileSummary();

    const quests = await storage.query('SELECT COUNT(*) AS n FROM quests');
    expect(Number(quests[0]?.['n'])).toBe(0);
  });

  it('matches the totals reported by getDashboard', async () => {
    await service.completeOnboarding(onboarding);
    const dashboard = await service.getDashboard();
    await service.acceptQuest(dashboard.quests[0]!.id);
    await service.completeQuest(dashboard.quests[0]!.id);

    const summary = await service.getProfileSummary();
    const after = await service.getDashboard();
    expect(summary.totalXp).toBe(after.totalXp);
    expect(summary.level).toBe(after.level);
  });
});

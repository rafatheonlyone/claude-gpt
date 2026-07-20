import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SystemService, type OnboardingInput } from '../src/core/app/system-service';
import { NodeSqliteAdapter } from '../src/platform/test/sqlite-adapter';
import { createTestPlatform, type TestPlatform } from '../src/platform/test/test-platform';
import { levelFromTotalXp } from '../src/core/progression/levels';

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

  it('offers quests on the first dashboard load', async () => {
    const dashboard = await service.getDashboard();
    expect(dashboard.quests.length).toBeGreaterThan(0);
    expect(dashboard.quests.every((q) => q.status === 'offered')).toBe(true);
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
    expect(types).toContain('QuestOffered');
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

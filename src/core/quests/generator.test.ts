import { describe, it, expect } from 'vitest';
import { generateQuests, type GenerationContext } from './generator';
import { QUEST_TEMPLATES, templateById } from './templates';

function context(overrides: Partial<GenerationContext> = {}): GenerationContext {
  return {
    userId: 'user-1',
    date: '2026-07-19',
    availableMinutes: 180,
    goals: ['mathematics', 'programming', 'basketball'],
    domainLastActive: {},
    recentTemplateIds: [],
    completionRateByDomain: {},
    excludedDomains: [],
    injuredAreas: [],
    recoveryState: 'good',
    difficultyPreference: 'balanced',
    count: 3,
    ...overrides,
  };
}

describe('generateQuests — determinism', () => {
  it('produces identical output for identical inputs', () => {
    // Determinism is what makes generation testable, debuggable and honestly
    // explainable (docs/AI_ARCHITECT.md §3).
    const a = generateQuests(context());
    const b = generateQuests(context());
    expect(a).toEqual(b);
  });

  it('does not reroll when the app is merely reopened on the same day', () => {
    const first = generateQuests(context());
    const second = generateQuests(context());
    expect(first.map((q) => q.templateId)).toEqual(second.map((q) => q.templateId));
  });

  it('offers a different selection on a different day', () => {
    const monday = generateQuests(context({ date: '2026-07-20' }));
    const tuesday = generateQuests(context({ date: '2026-07-21' }));
    expect(monday).not.toEqual(tuesday);
  });

  it('offers different quests to different users', () => {
    const a = generateQuests(context({ userId: 'user-a' }));
    const b = generateQuests(context({ userId: 'user-b' }));
    expect(a.map((q) => q.templateId)).not.toEqual(b.map((q) => q.templateId));
  });
});

describe('generateQuests — the schedule is a hard constraint', () => {
  it('never offers a quest longer than the time available', () => {
    const quests = generateQuests(context({ availableMinutes: 25, count: 5 }));
    expect(quests.length).toBeGreaterThan(0);
    for (const quest of quests) {
      expect(quest.estimatedMinutes).toBeLessThanOrEqual(25);
    }
  });

  it('never proposes more total work than the day can hold', () => {
    const available = 120;
    const quests = generateQuests(context({ availableMinutes: available, count: 8 }));
    const total = quests.reduce((sum, q) => sum + q.estimatedMinutes, 0);
    // Deliberately below the full available time: filling every free minute
    // turns the tool into an obligation.
    expect(total).toBeLessThanOrEqual(available * 0.75);
  });

  it('still offers something on a very short day rather than nothing', () => {
    const quests = generateQuests(context({ availableMinutes: 20, count: 3 }));
    expect(quests.length).toBeGreaterThan(0);
  });

  it('offers nothing rather than something impossible when there is no time', () => {
    const quests = generateQuests(context({ availableMinutes: 2, count: 3 }));
    expect(quests).toHaveLength(0);
  });
});

describe('generateQuests — safety', () => {
  it('never loads an injured area', () => {
    const quests = generateQuests(
      context({ injuredAreas: ['shoulders', 'chest'], count: 8, availableMinutes: 300 }),
    );

    for (const quest of quests) {
      const template = templateById(quest.templateId);
      const areas = template?.bodyAreas ?? [];
      expect(areas).not.toContain('shoulders');
      expect(areas).not.toContain('chest');
    }
  });

  it('removes hard and moderate physical work on a low-recovery day', () => {
    const quests = generateQuests(
      context({ recoveryState: 'low', count: 8, availableMinutes: 300 }),
    );

    for (const quest of quests) {
      const template = templateById(quest.templateId);
      expect(template?.intensity).not.toBe('hard');
      expect(template?.intensity).not.toBe('moderate');
    }
  });

  it('proposes a lighter total load when recovery is low', () => {
    const good = generateQuests(context({ recoveryState: 'good', count: 6 }));
    const low = generateQuests(context({ recoveryState: 'low', count: 6 }));

    const total = (qs: ReturnType<typeof generateQuests>) =>
      qs.reduce((sum, q) => sum + q.estimatedMinutes, 0);

    // The system proposes less when the user is depleted; it never pushes through.
    expect(total(low)).toBeLessThan(total(good));
  });

  it('respects excluded domains', () => {
    const quests = generateQuests(
      context({ excludedDomains: ['physical', 'social'], count: 8, availableMinutes: 300 }),
    );
    for (const quest of quests) {
      expect(quest.domain).not.toBe('physical');
      expect(quest.domain).not.toBe('social');
    }
  });

  it('never proposes a rest day as hard work', () => {
    // Recovery quests must stay restful regardless of difficulty preference.
    const quests = generateQuests(
      context({ difficultyPreference: 'harder', count: 10, availableMinutes: 300 }),
    );
    for (const quest of quests) {
      if (quest.domain === 'recovery') {
        expect(['trivial', 'light', 'moderate']).toContain(quest.difficulty);
      }
    }
  });
});

describe('generateQuests — relevance', () => {
  it('favours quests aligned with stated goals', () => {
    const quests = generateQuests(
      context({ goals: ['chess'], count: 3, domainLastActive: { mental: '2026-07-18' } }),
    );
    expect(quests.some((q) => q.templateId.includes('chess'))).toBe(true);
  });

  it('surfaces neglected domains', () => {
    // Technical untouched for a month, everything else active yesterday.
    const quests = generateQuests(
      context({
        goals: [],
        count: 2,
        availableMinutes: 300,
        domainLastActive: {
          physical: '2026-07-18',
          academic: '2026-07-18',
          mental: '2026-07-18',
          creative: '2026-07-18',
          social: '2026-07-18',
          financial: '2026-07-18',
          recovery: '2026-07-18',
          technical: '2026-06-15',
        },
      }),
    );
    expect(quests.some((q) => q.domain === 'technical')).toBe(true);
  });

  it('prefers variety over repeating what was just offered', () => {
    const first = generateQuests(context({ count: 3 }));
    const repeated = generateQuests(
      context({ count: 3, recentTemplateIds: first.map((q) => q.templateId) }),
    );
    const overlap = repeated.filter((q) => first.some((f) => f.templateId === q.templateId)).length;
    expect(overlap).toBeLessThan(3);
  });

  it('spreads quests across domains rather than stacking one', () => {
    const quests = generateQuests(context({ count: 4, availableMinutes: 300 }));
    const domains = new Set(quests.map((q) => q.domain));
    expect(domains.size).toBe(quests.length);
  });

  it('always explains why a quest was generated', () => {
    // The user can always ask "why this?" and get the real decision input.
    const quests = generateQuests(context({ count: 4 }));
    for (const quest of quests) {
      expect(quest.rationale.trim().length).toBeGreaterThan(0);
    }
  });

  it('always states a purpose the user can evaluate', () => {
    const quests = generateQuests(context({ count: 4 }));
    for (const quest of quests) {
      expect(quest.purpose.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('generateQuests — workload budget awareness', () => {
  it('a normal day never proposes an impossible number of mandatory quests', () => {
    // The exact real-world symptom this milestone exists to prevent: 21
    // quests / 1,190 minutes generated for one day.
    const quests = generateQuests(context({ count: 21, availableMinutes: 120 }));
    expect(quests.length).toBeLessThanOrEqual(5);
    const totalMinutes = quests.reduce((sum, q) => sum + q.estimatedMinutes, 0);
    expect(totalMinutes).toBeLessThan(1140);
  });

  it('proposes nothing new once the day is already fully committed', () => {
    const quests = generateQuests(
      context({ count: 5, availableMinutes: 120, committedMinutes: 90, committedPrimaryCount: 3 }),
    );
    expect(quests).toHaveLength(0);
  });

  it('proposes fewer quests as more of the day is already committed', () => {
    const fresh = generateQuests(context({ count: 5, availableMinutes: 240 }));
    const partiallyCommitted = generateQuests(
      context({ count: 5, availableMinutes: 240, committedMinutes: 120, committedPrimaryCount: 2 }),
    );
    expect(partiallyCommitted.length).toBeLessThanOrEqual(fresh.length);
  });

  it('never proposes a second demanding or severe quest once one is already committed', () => {
    const quests = generateQuests(
      context({
        count: 8,
        availableMinutes: 300,
        difficultyPreference: 'harder',
        committedDemandingOrAbove: true,
      }),
    );
    for (const quest of quests) {
      expect(['trivial', 'light', 'moderate']).toContain(quest.difficulty);
    }
  });

  it('never selects more than one demanding or severe quest in a single fresh batch', () => {
    const quests = generateQuests(
      context({ count: 8, availableMinutes: 300, difficultyPreference: 'harder' }),
    );
    const demandingOrAbove = quests.filter((q) => q.difficulty === 'demanding' || q.difficulty === 'severe');
    expect(demandingOrAbove.length).toBeLessThanOrEqual(1);
  });
});

describe('generateQuests — hard duplicate exclusion', () => {
  it('never regenerates a template that is already active', () => {
    const first = generateQuests(context({ count: 3 }));
    const activeIds = first.map((q) => q.templateId);

    const second = generateQuests(context({ count: 8, availableMinutes: 300, excludedTemplateIds: activeIds }));

    for (const quest of second) {
      expect(activeIds).not.toContain(quest.templateId);
    }
  });

  it('still proposes something else when the top candidate is excluded', () => {
    const first = generateQuests(context({ count: 1 }));
    expect(first.length).toBeGreaterThan(0);
    const topId = first[0]!.templateId;

    const second = generateQuests(context({ count: 1, excludedTemplateIds: [topId] }));
    expect(second.length).toBeGreaterThan(0);
    expect(second[0]!.templateId).not.toBe(topId);
  });
});

describe('generateQuests — difficulty calibration', () => {
  it('offers easier work when the preference is lighter', () => {
    const order = ['trivial', 'light', 'moderate', 'demanding', 'severe'];
    const balanced = generateQuests(context({ difficultyPreference: 'balanced', count: 5 }));
    const lighter = generateQuests(context({ difficultyPreference: 'lighter', count: 5 }));

    const mean = (qs: ReturnType<typeof generateQuests>) =>
      qs.reduce((sum, q) => sum + order.indexOf(q.difficulty), 0) / Math.max(1, qs.length);

    expect(mean(lighter)).toBeLessThanOrEqual(mean(balanced));
  });
});

describe('generateQuests — Daily Protocol selection', () => {
  it('selects the Daily Protocol template when it is the only eligible physical-domain candidate', () => {
    // Domain diversity means only one physical-domain template can be
    // selected per day; excluding every other one makes selection of the
    // protocol deterministic without depending on the scoring engine's
    // relative weighting on a given run.
    const otherPhysicalIds = QUEST_TEMPLATES.filter(
      (t) => t.domain === 'physical' && t.id !== 'protocol.foundation_cycle',
    ).map((t) => t.id);

    const quests = generateQuests(
      context({ count: 5, availableMinutes: 300, excludedTemplateIds: otherPhysicalIds }),
    );

    const protocol = quests.find((q) => q.templateId === 'protocol.foundation_cycle');
    expect(protocol).toBeDefined();
    expect(protocol?.questType).toBe('daily_protocol');
    expect(protocol?.objectives?.length).toBeGreaterThan(1);
  });

  it('carries calibration metadata for physical objectives rather than a fixed number', () => {
    const otherPhysicalIds = QUEST_TEMPLATES.filter(
      (t) => t.domain === 'physical' && t.id !== 'protocol.foundation_cycle',
    ).map((t) => t.id);
    const quests = generateQuests(
      context({ count: 5, availableMinutes: 300, excludedTemplateIds: otherPhysicalIds }),
    );
    const protocol = quests.find((q) => q.templateId === 'protocol.foundation_cycle');

    const pushups = protocol?.objectives?.find((o) => o.baselineKey === 'pushups');
    expect(pushups).toBeDefined();
    expect(pushups?.target).toBeNull(); // calibrated later from the user's baseline, not fixed here
  });
});

describe('quest templates', () => {
  it('have unique ids', () => {
    const ids = QUEST_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all declare a purpose and at least one step', () => {
    for (const template of QUEST_TEMPLATES) {
      expect(template.purpose.trim().length).toBeGreaterThan(0);
      expect(template.steps.length).toBeGreaterThan(0);
    }
  });

  it('contain no language that shames the user or rewards excess', () => {
    // docs/GAME_SYSTEMS.md §12 — enforced, not merely intended.
    const forbidden = [
      'lazy',
      'excuse',
      'no pain',
      'all-nighter',
      'skip a meal',
      'skip meals',
      'starve',
      'push through the pain',
      'weakness',
      'pathetic',
    ];
    for (const template of QUEST_TEMPLATES) {
      const text =
        `${template.title} ${template.description} ${template.purpose} ${template.steps.join(' ')}`.toLowerCase();
      for (const phrase of forbidden) {
        expect(text).not.toContain(phrase);
      }
    }
  });

  it('covers every domain so no area is structurally unreachable', () => {
    const domains = new Set(QUEST_TEMPLATES.map((t) => t.domain));
    for (const domain of [
      'physical',
      'academic',
      'technical',
      'mental',
      'creative',
      'social',
      'financial',
      'recovery',
    ]) {
      expect(domains).toContain(domain);
    }
  });
});

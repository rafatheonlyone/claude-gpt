// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useQuestEncounterQueue } from './useQuestEncounterQueue';
import type { SystemService, DashboardQuest } from '../../core/app/system-service';

function quest(id: string, overrides: Partial<DashboardQuest> = {}): DashboardQuest {
  return {
    id,
    title: `Quest ${id}`,
    description: 'Description',
    purpose: 'Purpose',
    domain: 'academic',
    questType: 'daily',
    difficulty: 'light',
    estimatedMinutes: 20,
    status: 'detected',
    rationale: 'Because',
    awardedXp: null,
    dueDate: '2026-07-20',
    createdAt: '2026-07-20T00:00:00.000Z',
    presentedAt: null,
    postponedAt: null,
    completedAt: null,
    reflectionNote: null,
    evidenceNote: null,
    templateId: 'tpl.x',
    steps: [],
    ...overrides,
  };
}

/**
 * A fake covering only the methods the hook actually calls. The hook takes
 * a real `SystemService`, whose constructor is private, so a full instance
 * cannot be built in a unit test — this is the standard shape for testing
 * against a narrow slice of a larger service.
 */
function createFakeService(initialPending: DashboardQuest[]): SystemService & {
  presented: string[];
  pending: DashboardQuest[];
} {
  const fake = {
    pending: [...initialPending],
    presented: [] as string[],
    async getPendingEncounters() {
      return fake.pending.filter((q) => !fake.presented.includes(q.id));
    },
    async getAppPreferences() {
      return {};
    },
    async presentQuest(id: string) {
      fake.presented.push(id);
    },
    async acceptQuest(id: string) {
      fake.presented.push(id);
    },
    async rejectQuest(id: string) {
      fake.presented.push(id);
    },
    async postponeQuest(id: string) {
      fake.presented.push(id);
    },
  };
  return fake as unknown as SystemService & { presented: string[]; pending: DashboardQuest[] };
}

describe('useQuestEncounterQueue', () => {
  it('shows exactly one quest as the modal encounter', async () => {
    const service = createFakeService([quest('a'), quest('b'), quest('c')]);
    const { result } = renderHook(() => useQuestEncounterQueue(service));

    await waitFor(() => expect(result.current.current).not.toBeNull());
    expect(result.current.current?.id).toBe('a');
  });

  it('prepares every other detected quest silently instead of queuing more modals', async () => {
    // The exact behaviour this fixes: previously every detected quest queued
    // behind its own modal, so opening the app after onboarding's initial
    // batch could present several full-screen dialogs in a row.
    const service = createFakeService([quest('a'), quest('b'), quest('c')]);
    const { result } = renderHook(() => useQuestEncounterQueue(service));

    await waitFor(() => expect(result.current.current).not.toBeNull());
    await waitFor(() => expect(result.current.preparedCount).toBe(2));

    // The other two are presented (available on Missions/Today), not queued.
    expect(service.presented).toEqual(expect.arrayContaining(['b', 'c']));
    expect(result.current.queueRemaining).toBe(0);
  });

  it('does not show a second modal after the first is decided, even if more arrive', async () => {
    const service = createFakeService([quest('a')]);
    const { result } = renderHook(() => useQuestEncounterQueue(service));

    await waitFor(() => expect(result.current.current?.id).toBe('a'));

    // A new quest is detected mid-session (as if generation ran again).
    service.pending.push(quest('late'));

    await act(async () => {
      await result.current.accept();
    });

    // The session's one modal was already spent on "a"; "late" must be
    // prepared silently rather than becoming a second dialog.
    await waitFor(() => expect(result.current.current).toBeNull());
    expect(result.current.preparedCount).toBe(1);
    expect(service.presented).toContain('late');
  });

  it('presents everything silently with no modal at all in "off" mode', async () => {
    const service = createFakeService([quest('a'), quest('b')]);
    service.getAppPreferences = async () => ({ questEncounterMode: 'off' });

    const { result } = renderHook(() => useQuestEncounterQueue(service));

    await waitFor(() => expect(service.presented.length).toBe(2));
    expect(result.current.current).toBeNull();
  });

  it('dismissing the prepared summary resets its count', async () => {
    const service = createFakeService([quest('a'), quest('b')]);
    const { result } = renderHook(() => useQuestEncounterQueue(service));

    await waitFor(() => expect(result.current.preparedCount).toBe(1));

    act(() => {
      result.current.dismissPreparedSummary();
    });

    expect(result.current.preparedCount).toBe(0);
  });
});

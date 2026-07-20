import { useCallback, useEffect, useRef, useState } from 'react';
import type { SystemService, DashboardQuest } from '../../core/app/system-service';
import type { EncounterVariant } from './QuestEncounter';

export type QuestEncounterMode = 'full' | 'compact' | 'off';

/** Quest types significant enough to warrant the full cinematic sequence. */
const SIGNIFICANT_TYPES = new Set(['main', 'challenge', 'mastery', 'boss_preparation', 'milestone', 'project']);

function variantFor(quest: DashboardQuest, mode: QuestEncounterMode): EncounterVariant {
  if (mode === 'compact') return 'compact';
  const significant =
    SIGNIFICANT_TYPES.has(quest.questType) || quest.difficulty === 'demanding' || quest.difficulty === 'severe';
  return significant ? 'full' : 'compact';
}

export interface QuestEncounterQueueState {
  readonly current: DashboardQuest | null;
  readonly variant: EncounterVariant;
  readonly queueRemaining: number;
  /**
   * Quests auto-presented this session without a modal because the
   * one-cinematic-per-session budget (`docs/DESIGN_SYSTEM.md` §10) was
   * already spent. They are not lost — they are simply already available,
   * ready to review on Missions/Today, rather than queued behind more
   * interruptions.
   */
  readonly preparedCount: number;
  readonly accept: () => Promise<void>;
  readonly decline: () => Promise<void>;
  readonly postpone: () => Promise<void>;
  /** Presents the quest (so it will not re-queue) without deciding on it yet. */
  readonly viewDetails: () => Promise<void>;
  /** Session-only skip. The quest stays `detected` and may reappear later. */
  readonly dismiss: () => void;
  /** Clears the "N missions prepared" summary once the user has acknowledged it. */
  readonly dismissPreparedSummary: () => void;
  readonly refresh: () => Promise<void>;
}

/**
 * Owns the cinematic encounter queue at the shell level, so a newly detected
 * quest surfaces regardless of which page the user is looking at.
 *
 * Enforces the one-cinematic-per-session budget (`docs/DESIGN_SYSTEM.md`
 * §10, ADR-0011): at most one quest is ever shown as a modal encounter per
 * application session (full variant if significant, compact otherwise).
 * Every other detected quest is presented silently — marked `offered` so it
 * is immediately visible on Today/Missions — and counted in
 * `preparedCount` for a one-line summary instead of a second dialog. This
 * replaces the previous behaviour, which queued every detected quest behind
 * its own modal and could present seven in a row.
 *
 * When the user has set presentation to "silent" (`questEncounterMode ===
 * 'off'`), every pending quest is presented immediately without ever
 * rendering an overlay — new quests simply appear already available.
 */
export function useQuestEncounterQueue(service: SystemService): QuestEncounterQueueState {
  const [queue, setQueue] = useState<readonly DashboardQuest[]>([]);
  const [mode, setMode] = useState<QuestEncounterMode>('full');
  const [preparedCount, setPreparedCount] = useState(0);
  const dismissedThisSession = useRef<Set<string>>(new Set());
  /** Whether this session has already spent its one modal encounter. */
  const sessionBudgetSpent = useRef(false);
  /** The id of the quest currently occupying the one modal slot, if any. */
  const modalQuestId = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const [pending, appPrefs] = await Promise.all([
      service.getPendingEncounters(),
      service.getAppPreferences(),
    ]);
    const currentMode = (appPrefs['questEncounterMode'] as QuestEncounterMode | undefined) ?? 'full';
    setMode(currentMode);

    const visible = pending.filter((q) => !dismissedThisSession.current.has(q.id));

    if (currentMode === 'off') {
      for (const quest of visible) {
        await service.presentQuest(quest.id);
      }
      modalQuestId.current = null;
      setQueue([]);
      return;
    }

    if (sessionBudgetSpent.current) {
      // The one modal this session already happened (or is still in
      // progress). Everything else is prepared silently rather than queued
      // behind more interruptions.
      const stillCurrent = visible.find((q) => q.id === modalQuestId.current) ?? null;
      const toAutoPresent = visible.filter((q) => q.id !== modalQuestId.current);
      for (const quest of toAutoPresent) {
        await service.presentQuest(quest.id);
      }
      if (toAutoPresent.length > 0) {
        setPreparedCount((count) => count + toAutoPresent.length);
      }
      if (!stillCurrent) modalQuestId.current = null;
      setQueue(stillCurrent ? [stillCurrent] : []);
      return;
    }

    const [modalQuest, ...rest] = visible;
    if (modalQuest) {
      sessionBudgetSpent.current = true;
      modalQuestId.current = modalQuest.id;
      setQueue([modalQuest]);
      for (const quest of rest) {
        await service.presentQuest(quest.id);
      }
      if (rest.length > 0) setPreparedCount((count) => count + rest.length);
    } else {
      setQueue([]);
    }
  }, [service]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const current = queue[0] ?? null;

  const accept = useCallback(async () => {
    if (!current) return;
    await service.presentQuest(current.id);
    await service.acceptQuest(current.id);
    await refresh();
  }, [service, current, refresh]);

  const decline = useCallback(async () => {
    if (!current) return;
    await service.presentQuest(current.id);
    await service.rejectQuest(current.id);
    await refresh();
  }, [service, current, refresh]);

  const postpone = useCallback(async () => {
    if (!current) return;
    await service.presentQuest(current.id);
    await service.postponeQuest(current.id);
    await refresh();
  }, [service, current, refresh]);

  const viewDetails = useCallback(async () => {
    if (!current) return;
    await service.presentQuest(current.id);
    await refresh();
  }, [service, current, refresh]);

  const dismiss = useCallback(() => {
    if (!current) return;
    dismissedThisSession.current.add(current.id);
    setQueue((q) => q.filter((item) => item.id !== current.id));
  }, [current]);

  const dismissPreparedSummary = useCallback(() => {
    setPreparedCount(0);
  }, []);

  return {
    current,
    variant: current ? variantFor(current, mode) : 'compact',
    queueRemaining: Math.max(0, queue.length - 1),
    preparedCount,
    accept,
    decline,
    postpone,
    viewDetails,
    dismiss,
    dismissPreparedSummary,
    refresh,
  };
}

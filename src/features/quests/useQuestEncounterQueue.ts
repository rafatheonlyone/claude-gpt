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
  readonly accept: () => Promise<void>;
  readonly decline: () => Promise<void>;
  readonly postpone: () => Promise<void>;
  /** Presents the quest (so it will not re-queue) without deciding on it yet. */
  readonly viewDetails: () => Promise<void>;
  /** Session-only skip. The quest stays `detected` and may reappear later. */
  readonly dismiss: () => void;
  readonly refresh: () => Promise<void>;
}

/**
 * Owns the cinematic encounter queue at the shell level, so a newly detected
 * quest surfaces regardless of which page the user is looking at.
 *
 * When the user has set presentation to "silent" (`questEncounterMode ===
 * 'off'`), every pending quest is presented immediately without ever
 * rendering an overlay — new quests simply appear already available.
 */
export function useQuestEncounterQueue(service: SystemService): QuestEncounterQueueState {
  const [queue, setQueue] = useState<readonly DashboardQuest[]>([]);
  const [mode, setMode] = useState<QuestEncounterMode>('full');
  const dismissedThisSession = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const [pending, appPrefs] = await Promise.all([
      service.getPendingEncounters(),
      service.getAppPreferences(),
    ]);
    const currentMode = (appPrefs['questEncounterMode'] as QuestEncounterMode | undefined) ?? 'full';
    setMode(currentMode);

    if (currentMode === 'off') {
      for (const quest of pending) {
        await service.presentQuest(quest.id);
      }
      setQueue([]);
      return;
    }

    setQueue(pending.filter((q) => !dismissedThisSession.current.has(q.id)));
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

  return {
    current,
    variant: current ? variantFor(current, mode) : 'compact',
    queueRemaining: Math.max(0, queue.length - 1),
    accept,
    decline,
    postpone,
    viewDetails,
    dismiss,
    refresh,
  };
}

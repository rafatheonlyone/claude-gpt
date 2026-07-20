import { useCallback, useState } from 'react';
import type { SystemService, DashboardQuest, CompletionOutcome } from '../../core/app/system-service';
import { audio } from '../../audio/engine';

export interface QuestActionsState {
  readonly busyQuestId: string | null;
  readonly completingQuest: DashboardQuest | null;
  readonly error: string | null;
  readonly accept: (questId: string) => Promise<void>;
  readonly decline: (questId: string) => Promise<void>;
  readonly postpone: (questId: string) => Promise<void>;
  readonly requestComplete: (quest: DashboardQuest) => void;
  readonly closeCompleteDialog: () => void;
  readonly handleCompleted: (outcome: CompletionOutcome) => void;
}

/**
 * Shared accept/decline/postpone/complete logic for any page that renders
 * `QuestCard` — Home, Today and Quests all need the identical behaviour, so
 * it lives here once rather than three times.
 */
export function useQuestActions(service: SystemService, onChanged: () => void | Promise<void>): QuestActionsState {
  const [busyQuestId, setBusyQuestId] = useState<string | null>(null);
  const [completingQuest, setCompletingQuest] = useState<DashboardQuest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (questId: string, action: () => Promise<void>, sound: Parameters<typeof audio.play>[0]) => {
      setBusyQuestId(questId);
      setError(null);
      try {
        await action();
        audio.play(sound);
        await onChanged();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setBusyQuestId(null);
      }
    },
    [onChanged],
  );

  const accept = useCallback(
    (questId: string) => run(questId, () => service.acceptQuest(questId), 'questAccepted'),
    [service, run],
  );

  const decline = useCallback(
    (questId: string) => run(questId, () => service.rejectQuest(questId), 'interact'),
    [service, run],
  );

  const postpone = useCallback(
    (questId: string) => run(questId, () => service.postponeQuest(questId), 'interact'),
    [service, run],
  );

  const requestComplete = useCallback((quest: DashboardQuest) => {
    setCompletingQuest(quest);
  }, []);

  const closeCompleteDialog = useCallback(() => {
    setCompletingQuest(null);
  }, []);

  const handleCompleted = useCallback(
    (_outcome: CompletionOutcome) => {
      setCompletingQuest(null);
      void onChanged();
    },
    [onChanged],
  );

  return {
    busyQuestId,
    completingQuest,
    error,
    accept,
    decline,
    postpone,
    requestComplete,
    closeCompleteDialog,
    handleCompleted,
  };
}

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type {
  SystemService,
  DashboardState,
  CompletionOutcome,
} from '../../core/app/system-service';
import type { AchievementDefinition } from '../../core/achievements/definitions';
import { QuestCard } from './QuestCard';
import { AchievementToast } from './AchievementToast';
import { LevelBar } from './LevelBar';
import { audio } from '../../audio/engine';
import { t } from '../../i18n';
import './dashboard.css';

interface Props {
  readonly service: SystemService;
}

interface Celebration {
  readonly id: string;
  readonly achievement: AchievementDefinition;
}

export function Dashboard({ service }: Props): React.ReactElement {
  const [state, setState] = useState<DashboardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyQuestId, setBusyQuestId] = useState<string | null>(null);
  const [celebrations, setCelebrations] = useState<readonly Celebration[]>([]);
  const [levelFlash, setLevelFlash] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await service.getDashboard());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [service]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAccept = useCallback(
    async (questId: string) => {
      setBusyQuestId(questId);
      try {
        await service.acceptQuest(questId);
        audio.play('questAccepted');
        await refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setBusyQuestId(null);
      }
    },
    [service, refresh],
  );

  const handleDecline = useCallback(
    async (questId: string) => {
      setBusyQuestId(questId);
      try {
        await service.rejectQuest(questId);
        audio.play('interact');
        await refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setBusyQuestId(null);
      }
    },
    [service, refresh],
  );

  const handleComplete = useCallback(
    async (questId: string, completion: number) => {
      setBusyQuestId(questId);
      try {
        const outcome: CompletionOutcome = await service.completeQuest(questId, { completion });

        audio.play('questCompleted');
        await refresh();

        if (outcome.leveledUp) {
          setLevelFlash(outcome.levelAfter);
          window.setTimeout(() => audio.play('levelGained'), 320);
          window.setTimeout(() => setLevelFlash(null), 2600);
        }

        // Achievements queue rather than stacking on screen, so a burst of
        // unlocks never buries the interface.
        if (outcome.achievements.length > 0) {
          setCelebrations((current) => [
            ...current,
            ...outcome.achievements.map((achievement) => ({
              id: `${achievement.id}-${Date.now()}`,
              achievement,
            })),
          ]);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setBusyQuestId(null);
      }
    },
    [service, refresh],
  );

  const dismissCelebration = useCallback((id: string) => {
    setCelebrations((current) => current.filter((c) => c.id !== id));
  }, []);

  if (error && !state) {
    return (
      <div className="dashboard dashboard--error" role="alert">
        <p>{t('error.body')}</p>
        <pre data-selectable>{error}</pre>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="dashboard dashboard--loading" aria-busy="true">
        <span className="visually-hidden">{t('app.loading')}</span>
      </div>
    );
  }

  const open = state.quests.filter((q) => q.status === 'offered' || q.status === 'accepted');
  const settled = state.quests.filter((q) => q.status === 'completed' || q.status === 'rejected');

  return (
    <div className="dashboard">
      <div className="dashboard__ambient" aria-hidden="true" />

      <header className="dashboard__header">
        <div className="dashboard__identity">
          <p className="dashboard__eyebrow">{t('app.name')}</p>
          <h1 className="dashboard__greeting">
            {t(state.questsCompleted === 0 ? 'dashboard.greetingFirst' : 'dashboard.greeting', {
              name: state.displayName,
            })}
          </h1>
        </div>

        <dl className="dashboard__stats">
          <div className="stat">
            <dt className="stat__label">{t('dashboard.rank')}</dt>
            <dd className="stat__value">{t(`rank.${state.rank}`)}</dd>
          </div>
          <div className="stat">
            <dt className="stat__label">{t('dashboard.totalXp')}</dt>
            <dd className="stat__value numeric">{state.totalXp.toLocaleString()}</dd>
          </div>
          <div className="stat">
            <dt className="stat__label">{t('dashboard.completed')}</dt>
            <dd className="stat__value numeric">{state.questsCompleted}</dd>
          </div>
          <div className="stat">
            <dt className="stat__label">{t('dashboard.activeDays')}</dt>
            <dd className="stat__value numeric">{state.activeDays}</dd>
          </div>
        </dl>
      </header>

      <LevelBar
        level={state.level}
        xpIntoLevel={state.xpIntoLevel}
        xpForNextLevel={state.xpForNextLevel}
        fraction={state.fraction}
      />

      <main className="dashboard__main">
        <h2 className="dashboard__section-title">{t('dashboard.todayTitle')}</h2>

        {open.length === 0 ? (
          <div className="dashboard__empty">
            <p className="dashboard__empty-title">{t('dashboard.todayEmpty')}</p>
            <p className="dashboard__empty-body">{t('dashboard.todayEmptyBody')}</p>
          </div>
        ) : (
          <ul className="quest-list">
            <AnimatePresence initial={false}>
              {open.map((quest, index) => (
                <motion.li
                  key={quest.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3, delay: index * 0.04, ease: [0.32, 0.72, 0, 1] }}
                >
                  <QuestCard
                    quest={quest}
                    busy={busyQuestId === quest.id}
                    onAccept={() => void handleAccept(quest.id)}
                    onDecline={() => void handleDecline(quest.id)}
                    onComplete={(completion) => void handleComplete(quest.id, completion)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        {settled.length > 0 && (
          <ul className="quest-list quest-list--settled">
            {settled.map((quest) => (
              <li key={quest.id}>
                <QuestCard quest={quest} busy={false} />
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Announced politely to screen readers rather than interrupting. */}
      <div className="visually-hidden" role="status" aria-live="polite">
        {levelFlash !== null && t('progression.levelUp', { level: levelFlash })}
      </div>

      <AnimatePresence>
        {levelFlash !== null && (
          <motion.div
            className="level-flash"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          >
            <span className="level-flash__label">{t('dashboard.level')}</span>
            <span className="level-flash__value numeric">{levelFlash}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="toast-stack">
        <AnimatePresence>
          {celebrations.slice(0, 3).map((celebration) => (
            <AchievementToast
              key={celebration.id}
              achievement={celebration.achievement}
              onDismiss={() => dismissCelebration(celebration.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

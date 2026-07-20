import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { DashboardState, DashboardQuest } from '../../core/app/system-service';
import { useSystem } from '../../app/SystemContext';
import { QuestCard } from '../../ui/QuestCard';
import { useQuestActions } from '../quests/useQuestActions';
import { QuestCompletionDialog } from '../quests/QuestCompletionDialog';
import { t } from '../../i18n';
import './today.css';

type Filter = 'all' | 'active' | 'available' | 'completed';

const FILTER_STATUSES: Record<Filter, readonly string[] | null> = {
  all: null,
  active: ['accepted'],
  available: ['offered'],
  completed: ['completed'],
};

export function TodayPage(): React.ReactElement {
  const { service } = useSystem();
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const refresh = useCallback(async () => {
    setDashboard(await service.getDashboard());
  }, [service]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const actions = useQuestActions(service, refresh);

  const visible = useMemo(() => {
    if (!dashboard) return [];
    const statuses = FILTER_STATUSES[filter];
    return statuses ? dashboard.quests.filter((q) => statuses.includes(q.status)) : dashboard.quests;
  }, [dashboard, filter]);

  if (!dashboard) {
    return (
      <div className="today today--loading" aria-busy="true">
        <span className="visually-hidden">{t('app.loading')}</span>
      </div>
    );
  }

  const total = dashboard.quests.length;
  const completed = dashboard.quests.filter((q) => q.status === 'completed').length;
  const totalMinutes = dashboard.quests.reduce((sum, q) => sum + (q.estimatedMinutes ?? 0), 0);
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="today">
      <header className="today__header">
        <h1 className="today__title">{t('today.title')}</h1>

        {total > 0 && (
          <div className="today__progress">
            <span className="today__progress-label">
              {t('today.dailyProgress')} · {completed}/{total}
            </span>
            <div
              className="today__progress-track"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <motion.div
                className="today__progress-fill"
                initial={false}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              />
            </div>
            {totalMinutes > 0 && (
              <span className="today__effort numeric">
                {t('today.effortToday')}: {t('quest.estimated', { minutes: totalMinutes })}
              </span>
            )}
          </div>
        )}
      </header>

      {total > 0 && (
        <div className="today__filters" role="group" aria-label={t('quests.filterStatus')}>
          {(['all', 'active', 'available', 'completed'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className="today__filter"
              data-active={filter === f}
              onClick={() => setFilter(f)}
            >
              {t(`common.filter${f.charAt(0).toUpperCase()}${f.slice(1)}`)}
            </button>
          ))}
        </div>
      )}

      {actions.error && (
        <p className="today__error" role="alert">
          {t('quest.actionError')}
        </p>
      )}

      {total === 0 ? (
        <div className="empty-state">
          <p className="empty-state__title">{t('today.empty')}</p>
          <p className="empty-state__body">{t('today.emptyBody')}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state__title">{t('quests.empty')}</p>
        </div>
      ) : (
        <ul className="quest-list">
          <AnimatePresence initial={false}>
            {visible.map((quest: DashboardQuest, index) => (
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
                  busy={actions.busyQuestId === quest.id}
                  onAccept={() => void actions.accept(quest.id)}
                  onDecline={() => void actions.decline(quest.id)}
                  onPostpone={() => void actions.postpone(quest.id)}
                  onCompleteRequest={() => actions.requestComplete(quest)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <AnimatePresence>
        {actions.completingQuest && (
          <QuestCompletionDialog
            quest={actions.completingQuest}
            onClose={actions.closeCompleteDialog}
            onCompleted={actions.handleCompleted}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

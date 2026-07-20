import { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useSystem } from './SystemContext';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { QuestEncounter } from '../features/quests/QuestEncounter';
import { useQuestEncounterQueue } from '../features/quests/useQuestEncounterQueue';
import { ErrorBoundary } from './ErrorBoundary';
import { t } from '../i18n';
import './shell.css';

const SIDEBAR_PREF_KEY = 'sidebarCollapsed';

export function Shell(): React.ReactElement {
  const { service } = useSystem();
  const [collapsed, setCollapsed] = useState(false);
  const encounters = useQuestEncounterQueue(service);

  useEffect(() => {
    let cancelled = false;
    void service.getAppPreferences().then((prefs) => {
      if (!cancelled && typeof prefs[SIDEBAR_PREF_KEY] === 'boolean') {
        setCollapsed(prefs[SIDEBAR_PREF_KEY]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [service]);

  const toggleCollapsed = (): void => {
    setCollapsed((current) => {
      const next = !current;
      void service.setAppPreference(SIDEBAR_PREF_KEY, next);
      return next;
    });
  };

  return (
    <div className="shell">
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />

      <div className="shell__main">
        <TopBar />
        <AnimatePresence>
          {encounters.preparedCount > 0 && (
            <motion.div
              className="shell__prepared-banner"
              role="status"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <span>
                {encounters.preparedCount === 1
                  ? t('questEncounter.preparedSummaryOne')
                  : t('questEncounter.preparedSummaryMany', { count: encounters.preparedCount })}
              </span>
              <Link to="/missoes" className="link-button" onClick={encounters.dismissPreparedSummary}>
                {t('questEncounter.preparedSummaryReview')}
              </Link>
              <button type="button" className="shell__prepared-dismiss" onClick={encounters.dismissPreparedSummary}>
                {t('questEncounter.preparedSummaryDismiss')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <main className="shell__content">
          <ErrorBoundary region="route">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <AnimatePresence>
        {encounters.current && (
          <QuestEncounter
            key={encounters.current.id}
            quest={encounters.current}
            variant={encounters.variant}
            queueRemaining={encounters.queueRemaining}
            onAccept={() => void encounters.accept()}
            onDecline={() => void encounters.decline()}
            onPostpone={() => void encounters.postpone()}
            onViewDetails={() => void encounters.viewDetails()}
            onDismiss={encounters.dismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

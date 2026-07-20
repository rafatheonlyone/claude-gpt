import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import type { DashboardState } from '../../core/app/system-service';
import { useSystem } from '../../app/SystemContext';
import { QuestCard } from '../../ui/QuestCard';
import { LevelBar } from '../../ui/LevelBar';
import { AchievementGlyph } from '../../ui/AchievementGlyph';
import { achievementById, localizeAchievement } from '../../core/achievements/definitions';
import { useQuestActions } from '../quests/useQuestActions';
import { QuestCompletionDialog } from '../quests/QuestCompletionDialog';
import { t, formatNumber } from '../../i18n';
import './home.css';

/**
 * Central de Comando — the primary overview.
 *
 * Hierarchy, deliberately in this order (docs/MASTER_SPEC.md §3): current
 * priority, current progression, today's quests, recent evolution, Architect
 * insight. Not a grid of unrelated cards.
 */
export function HomePage(): React.ReactElement {
  const { service, locale } = useSystem();
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDashboard(await service.getDashboard());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [service]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const actions = useQuestActions(service, refresh);

  if (error && !dashboard) {
    return (
      <div className="home home--error" role="alert">
        <p>{t('error.body')}</p>
        <pre data-selectable>{error}</pre>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="home home--loading" aria-busy="true">
        <span className="visually-hidden">{t('app.loading')}</span>
      </div>
    );
  }

  const priorityQuest =
    dashboard.quests.find((q) => q.status === 'accepted') ??
    dashboard.quests.find((q) => q.status === 'offered') ??
    null;

  const recentUnlock = dashboard.recentAchievements[0];
  const recentDefinition = recentUnlock ? achievementById(recentUnlock.id) : null;

  return (
    <div className="home">
      <div className="home__ambient" aria-hidden="true" />

      <header className="home__header">
        <p className="home__eyebrow">{t('app.name')}</p>
        <h1 className="home__greeting">
          {t(dashboard.questsCompleted === 0 ? 'home.greetingFirst' : 'home.greeting', {
            name: dashboard.displayName,
          })}
        </h1>
      </header>

      {/* 1. Current priority */}
      <section className="home__section">
        <h2 className="home__section-title">{t('home.priorityTitle')}</h2>
        {priorityQuest ? (
          <QuestCard
            quest={priorityQuest}
            busy={actions.busyQuestId === priorityQuest.id}
            onAccept={() => void actions.accept(priorityQuest.id)}
            onDecline={() => void actions.decline(priorityQuest.id)}
            onPostpone={() => void actions.postpone(priorityQuest.id)}
            onCompleteRequest={() => actions.requestComplete(priorityQuest)}
          />
        ) : (
          <div className="empty-state">
            <p className="empty-state__title">{t('home.noActiveQuest')}</p>
            <Link to="/hoje" className="link-button">
              {t('home.viewAllQuests')}
            </Link>
          </div>
        )}
      </section>

      {/* 2. Current progression */}
      <section className="home__section">
        <h2 className="home__section-title">{t('home.progressTitle')}</h2>
        <LevelBar
          level={dashboard.level}
          xpIntoLevel={dashboard.xpIntoLevel}
          xpForNextLevel={dashboard.xpForNextLevel}
          fraction={dashboard.fraction}
        />
        <dl className="home__stats">
          <div className="stat">
            <dt className="stat__label">{t('topbar.rank')}</dt>
            <dd className="stat__value">{t(`rank.${dashboard.rank}`)}</dd>
          </div>
          <div className="stat">
            <dt className="stat__label">{t('status.totalXpLabel')}</dt>
            <dd className="stat__value numeric">{formatNumber(dashboard.totalXp)}</dd>
          </div>
          <div className="stat">
            <dt className="stat__label">{t('status.completedQuestsLabel')}</dt>
            <dd className="stat__value numeric">{formatNumber(dashboard.questsCompleted)}</dd>
          </div>
          <div className="stat">
            <dt className="stat__label">{t('home.focusDomain')}</dt>
            <dd className="stat__value">
              {priorityQuest ? t(`domain.${priorityQuest.domain}`) : t('home.noFocusDomain')}
            </dd>
          </div>
        </dl>
      </section>

      {/* 3. Today's quests */}
      <section className="home__section">
        <div className="home__section-head">
          <h2 className="home__section-title">{t('home.questsTitle')}</h2>
          <Link to="/hoje" className="link-button">
            {t('home.viewAllQuests')}
          </Link>
        </div>
        <p className="home__quest-count numeric">
          {t('home.questCountToday', { count: dashboard.quests.length })}
        </p>
      </section>

      {/* 4. Recent evolution */}
      <section className="home__section">
        <h2 className="home__section-title">{t('home.evolutionTitle')}</h2>
        {recentUnlock && recentDefinition ? (
          <div className="home__achievement">
            <span className="home__achievement-glyph" aria-hidden="true">
              <AchievementGlyph icon={recentDefinition.icon} />
            </span>
            <div>
              <p className="home__achievement-label">{t('home.recentAchievement')}</p>
              <p className="home__achievement-name">
                {localizeAchievement(recentDefinition, locale).name}
              </p>
            </div>
          </div>
        ) : (
          <p className="empty-state__body">{t('home.noRecentAchievement')}</p>
        )}
      </section>

      {/* 5. Architect insight */}
      <section className="home__section home__section--architect">
        <h2 className="home__section-title">{t('home.architectTitle')}</h2>
        <p className="home__architect-message">{t('home.architectDefaultMessage')}</p>
        <div className="home__architect-actions">
          <Link to="/arquiteto" className="link-button">
            {t('nav.architect')}
          </Link>
          <button
            type="button"
            className="link-button"
            onClick={() => void service.recalibrateToday().then(refresh)}
          >
            {t('home.recalibrate')}
          </button>
        </div>
      </section>

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

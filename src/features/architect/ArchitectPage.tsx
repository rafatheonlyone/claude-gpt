import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ArchitectSnapshot } from '../../core/app/system-service';
import { useSystem } from '../../app/SystemContext';
import { t, formatDate } from '../../i18n';
import './architect-page.css';

export function ArchitectPage(): React.ReactElement {
  const { service } = useSystem();
  const [snapshot, setSnapshot] = useState<ArchitectSnapshot | null>(null);
  const [recalibrating, setRecalibrating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const refresh = useCallback(async () => {
    setSnapshot(await service.getArchitectSnapshot());
  }, [service]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleRecalibrate(): Promise<void> {
    setRecalibrating(true);
    setConfirmed(false);
    try {
      await service.recalibrateToday();
      await refresh();
      setConfirmed(true);
    } finally {
      setRecalibrating(false);
    }
  }

  if (!snapshot) {
    return (
      <div className="architect-page architect-page--loading" aria-busy="true">
        <span className="visually-hidden">{t('app.loading')}</span>
      </div>
    );
  }

  const current = snapshot.recentQuests[0] ?? null;

  return (
    <div className="architect-page">
      <header className="architect-page__header">
        <h1 className="architect-page__title">{t('architect.title')}</h1>
        <p className="architect-page__subtitle">{t('architect.subtitle')}</p>
      </header>

      <section className="architect-page__section">
        <h2 className="architect-page__section-title">{t('architect.recommendationTitle')}</h2>
        {current ? (
          <div className="architect-page__recommendation">
            <p className="architect-page__recommendation-title">{current.title}</p>
            <p className="architect-page__recommendation-rationale">
              {current.rationale || t('questDetail.noRationale')}
            </p>
            <Link to={`/missoes/${current.id}`} className="link-button">
              {t('quest.viewDetails')}
            </Link>
          </div>
        ) : (
          <p className="empty-state__body">{t('home.noActiveQuest')}</p>
        )}
      </section>

      <section className="architect-page__section">
        <div className="architect-page__section-head">
          <h2 className="architect-page__section-title">{t('architect.recentQuestsTitle')}</h2>
          <button type="button" className="button" onClick={() => void handleRecalibrate()} disabled={recalibrating}>
            {t('architect.recalibrateButton')}
          </button>
        </div>
        {confirmed && (
          <p className="architect-page__confirmed" role="status">
            {t('architect.recalibrateConfirm')} {t('architect.recalibrateBody')}
          </p>
        )}
        <ul className="architect-page__quest-list">
          {snapshot.recentQuests.map((quest) => (
            <li key={quest.id} className="architect-page__quest-row">
              <span className="quest-card__badge" data-status={quest.status}>
                {t(`quest.states.${quest.status}`)}
              </span>
              <span className="architect-page__quest-title">{quest.title}</span>
              <span className="architect-page__quest-date numeric">{formatDate(quest.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="architect-page__section">
        <h2 className="architect-page__section-title">{t('architect.prioritiesTitle')}</h2>
        {snapshot.goals.length > 0 ? (
          <div className="architect-page__goals">
            {snapshot.goals.map((goal) => (
              <span key={goal} className="architect-page__goal-chip">
                {goal.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        ) : (
          <p className="empty-state__body">{t('architect.noPriorities')}</p>
        )}
      </section>

      <section className="architect-page__section architect-page__section--info">
        <div className="architect-page__info-block">
          <h2 className="architect-page__section-title">{t('architect.offlineTitle')}</h2>
          <p>{t('architect.offlineExplanation')}</p>
        </div>
        <div className="architect-page__info-block">
          <h2 className="architect-page__section-title">{t('architect.aiStatusTitle')}</h2>
          <p>{t('architect.aiStatusOffline')}</p>
        </div>
        <div className="architect-page__info-block">
          <h2 className="architect-page__section-title">{t('architect.privacyTitle')}</h2>
          <p>{t('architect.privacyBody')}</p>
        </div>
      </section>
    </div>
  );
}

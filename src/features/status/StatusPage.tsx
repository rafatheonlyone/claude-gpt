import { useEffect, useState } from 'react';
import type { StatusSummary } from '../../core/app/system-service';
import { useSystem } from '../../app/SystemContext';
import { t, formatNumber, formatDate } from '../../i18n';
import './status.css';

function ageFromBirthDate(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export function StatusPage(): React.ReactElement {
  const { service } = useSystem();
  const [status, setStatus] = useState<StatusSummary | null>(null);

  useEffect(() => {
    void service.getStatusSummary().then(setStatus);
  }, [service]);

  if (!status) {
    return (
      <div className="status status--loading" aria-busy="true">
        <span className="visually-hidden">{t('app.loading')}</span>
      </div>
    );
  }

  return (
    <div className="status">
      <header className="status__header">
        <h1 className="status__title">{t('status.title')}</h1>
      </header>

      <section className="status__section">
        <h2 className="status__section-title">{t('status.profileSection')}</h2>
        <dl className="status__grid">
          <div className="status__stat">
            <dt>{t('status.levelLabel')}</dt>
            <dd className="numeric">{status.level}</dd>
          </div>
          <div className="status__stat">
            <dt>{t('topbar.rank')}</dt>
            <dd>{t(`rank.${status.rank}`)}</dd>
          </div>
          <div className="status__stat">
            <dt>{t('status.totalXpLabel')}</dt>
            <dd className="numeric">{formatNumber(status.totalXp)}</dd>
          </div>
          <div className="status__stat">
            <dt>{t('status.ageLabel')}</dt>
            <dd className="numeric">{status.birthDate ? ageFromBirthDate(status.birthDate) : t('status.ageUnknown')}</dd>
          </div>
          <div className="status__stat">
            <dt>{t('status.joinedLabel')}</dt>
            <dd>{formatDate(status.joinedAt)}</dd>
          </div>
          <div className="status__stat">
            <dt>{t('status.completedQuestsLabel')}</dt>
            <dd className="numeric">{formatNumber(status.questsCompleted)}</dd>
          </div>
          <div className="status__stat">
            <dt>{t('status.achievementsUnlockedLabel')}</dt>
            <dd className="numeric">
              {status.achievementsUnlocked} / {status.achievementsTotal}
            </dd>
          </div>
        </dl>
      </section>

      <section className="status__section">
        <h2 className="status__section-title">{t('status.domainsSection')}</h2>
        {status.domains.length > 0 ? (
          <ul className="status__domains">
            {status.domains.map((domain) => (
              <li key={domain.domain} className="status__domain" data-domain={domain.domain}>
                <span className="status__domain-spine" aria-hidden="true" />
                <span className="status__domain-name">{t(`domain.${domain.domain}`)}</span>
                <span className="status__domain-level numeric">
                  {t('topbar.level')} {domain.level}
                </span>
                <span className="status__domain-xp numeric">{formatNumber(domain.totalXp)} XP</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state__body">{t('home.noFocusDomain')}</p>
        )}
      </section>

      <section className="status__section">
        <h2 className="status__section-title">{t('status.attributesSection')}</h2>
        <div className="status__coming-soon">
          <p>{t('status.attributesComingSoon')}</p>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSystem } from './SystemContext';
import { t, formatNumber, formatDate } from '../i18n';
import './topbar.css';

export function TopBar(): React.ReactElement {
  const { service, profileSummary } = useSystem();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function checkPending(): Promise<void> {
      const pending = await service.getPendingEncounters();
      if (!cancelled) setPendingCount(pending.length);
    }

    // Re-checks whenever the profile summary refreshes, which happens after
    // every quest action — a reasonable proxy for "something may have changed".
    void checkPending();
    return () => {
      cancelled = true;
    };
  }, [service, profileSummary]);

  const today = new Date().toISOString();

  return (
    <header className="topbar">
      <div className="topbar__date">{formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</div>

      <div className="topbar__center">
        {profileSummary && (
          <div className="topbar__progress">
            <span className="topbar__level numeric">
              {t('topbar.level')} {profileSummary.level}
            </span>
            <div className="topbar__track" aria-hidden="true">
              <div
                className="topbar__fill"
                style={{ width: `${Math.max(2, profileSummary.fraction * 100)}%` }}
              />
            </div>
            <span className="topbar__xp numeric">{formatNumber(profileSummary.totalXp)} XP</span>
            <span className="topbar__rank">{t(`rank.${profileSummary.rank}`)}</span>
          </div>
        )}
      </div>

      <div className="topbar__actions">
        <Link
          to="/arquiteto"
          className="topbar__architect"
          data-active={pendingCount > 0}
          aria-label={
            pendingCount > 0
              ? t('questEncounter.queueRemaining', { count: pendingCount })
              : t('nav.architect')
          }
          title={t('nav.architect')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5c-5 0-8.5 4-9.5 7 1 3 4.5 7 9.5 7s8.5-4 9.5-7c-1-3-4.5-7-9.5-7zM12 9a3 3 0 100 6 3 3 0 000-6z" />
          </svg>
          {pendingCount > 0 && <span className="topbar__badge numeric">{pendingCount}</span>}
        </Link>

        <Link to="/configuracoes" className="topbar__icon-link" aria-label={t('topbar.settings')} title={t('topbar.settings')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 00-2-1.2L14 3h-4l-.5 2.5a7 7 0 00-2 1.2l-2.4-.9-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-.9a7 7 0 002 1.2L10 21h4l.5-2.5a7 7 0 002-1.2l2.4.9 2-3.4-2-1.6c.07-.4.1-.8.1-1.2z" />
          </svg>
        </Link>

        <Link to="/status" className="topbar__profile" aria-label={t('topbar.profile')} title={t('topbar.profile')}>
          <span className="topbar__profile-initial">{(profileSummary?.displayName ?? '?').charAt(0).toUpperCase()}</span>
        </Link>
      </div>
    </header>
  );
}

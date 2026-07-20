import { useEffect, useMemo, useState } from 'react';
import type { AchievementCatalogEntry } from '../../core/app/system-service';
import { localizeAchievement } from '../../core/achievements/definitions';
import { useSystem } from '../../app/SystemContext';
import { AchievementGlyph } from '../../ui/AchievementGlyph';
import { t, formatDate } from '../../i18n';
import './achievements-page.css';

type Tab = 'all' | 'unlocked' | 'locked';

export function AchievementsPage(): React.ReactElement {
  const { service, locale } = useSystem();
  const [catalog, setCatalog] = useState<readonly AchievementCatalogEntry[] | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    void service.getAchievementsCatalog().then(setCatalog);
  }, [service]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    return catalog.filter((entry) => {
      if (tab === 'unlocked' && !entry.unlocked) return false;
      if (tab === 'locked' && entry.unlocked) return false;
      if (search.trim()) {
        const showsRealName = entry.unlocked || !entry.definition.secret;
        const name = showsRealName ? localizeAchievement(entry.definition, locale).name : '';
        if (!name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [catalog, tab, search, locale]);

  if (!catalog) {
    return (
      <div className="achievements-page achievements-page--loading" aria-busy="true">
        <span className="visually-hidden">{t('app.loading')}</span>
      </div>
    );
  }

  return (
    <div className="achievements-page">
      <header className="achievements-page__header">
        <h1 className="achievements-page__title">{t('achievements.title')}</h1>
        <p className="achievements-page__count numeric">
          {catalog.filter((e) => e.unlocked).length} / {catalog.length}
        </p>
      </header>

      <div className="achievements-page__controls">
        <div className="achievements-page__tabs" role="group" aria-label={t('achievements.title')}>
          {(['all', 'unlocked', 'locked'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className="achievements-page__tab"
              data-active={tab === option}
              onClick={() => setTab(option)}
            >
              {t(`achievements.tab${option.charAt(0).toUpperCase()}${option.slice(1)}`)}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="achievements-page__search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('achievements.searchPlaceholder')}
          aria-label={t('achievements.searchPlaceholder')}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state__title">{t('achievements.noResults')}</p>
        </div>
      ) : (
        <ul className="achievements-page__grid">
          {filtered.map((entry) => {
            const hideContent = entry.definition.secret && !entry.unlocked;
            const content = hideContent
              ? { name: t('achievements.secretName'), description: t('achievements.secretDescription') }
              : localizeAchievement(entry.definition, locale);

            return (
              <li key={entry.definition.id}>
                <article
                  className="achievement-card"
                  data-rarity={entry.definition.rarity}
                  data-unlocked={entry.unlocked}
                >
                  <span className="achievement-card__glyph" aria-hidden="true">
                    <AchievementGlyph icon={hideContent ? 'unknown' : entry.definition.icon} />
                  </span>
                  <div className="achievement-card__body">
                    <p className="achievement-card__rarity">{t(`achievements.rarity.${entry.definition.rarity}`)}</p>
                    <h2 className="achievement-card__name">{content.name}</h2>
                    <p className="achievement-card__description">{content.description}</p>
                    <p className="achievement-card__status numeric">
                      {entry.unlockedAt ? t('achievements.unlockedOn', { date: formatDate(entry.unlockedAt) }) : t('achievements.stillLocked')}
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

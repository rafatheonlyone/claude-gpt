import { NavLink } from 'react-router-dom';
import { NavIcon, type NavIconName } from './NavIcon';
import { t } from '../i18n';
import { audio } from '../audio/engine';
import './sidebar.css';

interface NavItem {
  readonly path: string;
  readonly icon: NavIconName;
  readonly labelKey: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { path: '/', icon: 'home', labelKey: 'nav.home' },
  { path: '/hoje', icon: 'today', labelKey: 'nav.today' },
  { path: '/missoes', icon: 'quests', labelKey: 'nav.quests' },
  { path: '/status', icon: 'status', labelKey: 'nav.status' },
  { path: '/habilidades', icon: 'skills', labelKey: 'nav.skills' },
  { path: '/conquistas', icon: 'achievements', labelKey: 'nav.achievements' },
  { path: '/chefes', icon: 'bosses', labelKey: 'nav.bosses' },
  { path: '/linha-do-tempo', icon: 'timeline', labelKey: 'nav.timeline' },
  { path: '/arquiteto', icon: 'architect', labelKey: 'nav.architect' },
];

interface Props {
  readonly collapsed: boolean;
  readonly onToggleCollapsed: () => void;
}

export function Sidebar({ collapsed, onToggleCollapsed }: Props): React.ReactElement {
  return (
    <nav className="sidebar" data-collapsed={collapsed} aria-label={t('app.name')}>
      <div className="sidebar__brand">
        <span className="sidebar__mark" aria-hidden="true" />
        {!collapsed && <span className="sidebar__wordmark">{t('app.name')}</span>}
      </div>

      <ul className="sidebar__list">
        {NAV_ITEMS.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className="sidebar__link"
              title={collapsed ? t(item.labelKey) : undefined}
              onClick={() => audio.play('interact')}
            >
              <span className="sidebar__icon">
                <NavIcon name={item.icon} />
              </span>
              {!collapsed && <span className="sidebar__label">{t(item.labelKey)}</span>}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="sidebar__footer">
        <NavLink
          to="/configuracoes"
          className="sidebar__link"
          title={collapsed ? t('nav.settings') : undefined}
          onClick={() => audio.play('interact')}
        >
          <span className="sidebar__icon">
            <NavIcon name="settings" />
          </span>
          {!collapsed && <span className="sidebar__label">{t('nav.settings')}</span>}
        </NavLink>

        <button
          type="button"
          className="sidebar__collapse"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
          title={collapsed ? t('nav.expand') : t('nav.collapse')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            {collapsed ? <path d="M9 5l7 7-7 7" /> : <path d="M15 5l-7 7 7 7" />}
          </svg>
        </button>
      </div>
    </nav>
  );
}

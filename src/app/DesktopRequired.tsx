import { t } from '../i18n';

/**
 * Shown when the frontend runs in a plain browser rather than the desktop host.
 *
 * `npm run dev` exists to serve the frontend to Tauri; opening that URL
 * directly has no database behind it. An explicit explanation beats a wall of
 * failed IPC calls.
 */
export function DesktopRequired(): React.ReactElement {
  return (
    <div className="desktop-required">
      <div className="desktop-required__panel">
        <h1 className="desktop-required__title">{t('desktopOnly.title')}</h1>
        <p className="desktop-required__body">{t('desktopOnly.body')}</p>
        <code className="desktop-required__command numeric" data-selectable>
          {t('desktopOnly.command')}
        </code>
      </div>
    </div>
  );
}

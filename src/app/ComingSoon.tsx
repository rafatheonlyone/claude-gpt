import { t } from '../i18n';
import './comingsoon.css';

interface Props {
  readonly titleKey: string;
  readonly bodyKey: string;
}

/**
 * Honest placeholder for a module that is fully specified but not yet built.
 *
 * No fake statistics, no buttons that do nothing. States plainly what the
 * module will do and, where relevant, what it depends on — matching the
 * corresponding entries in `docs/ROADMAP.md`.
 */
export function ComingSoon({ titleKey, bodyKey }: Props): React.ReactElement {
  return (
    <div className="coming-soon">
      <div className="coming-soon__panel">
        <span className="coming-soon__badge">{t('comingSoon.badge')}</span>
        <h1 className="coming-soon__title">{t(titleKey)}</h1>
        <p className="coming-soon__body">{t(bodyKey)}</p>
      </div>
    </div>
  );
}

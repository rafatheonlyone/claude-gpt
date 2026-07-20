import { motion } from 'motion/react';
import { t } from '../../i18n';

interface Props {
  readonly level: number;
  readonly xpIntoLevel: number;
  readonly xpForNextLevel: number;
  readonly fraction: number;
}

export function LevelBar({
  level,
  xpIntoLevel,
  xpForNextLevel,
  fraction,
}: Props): React.ReactElement {
  const percent = Math.round(fraction * 100);

  return (
    <section className="level-bar" aria-label={`${t('dashboard.level')} ${level}`}>
      <div className="level-bar__head">
        <div className="level-bar__level">
          <span className="level-bar__level-label">{t('dashboard.level')}</span>
          <span className="level-bar__level-value numeric">{level}</span>
        </div>
        <span className="level-bar__detail numeric">
          {t('dashboard.xpToNext', {
            current: xpIntoLevel.toLocaleString(),
            required: xpForNextLevel.toLocaleString(),
            next: level + 1,
          })}
        </span>
      </div>

      <div
        className="level-bar__track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${percent}%`}
      >
        <motion.div
          className="level-bar__fill"
          initial={false}
          animate={{ width: `${Math.max(1.5, fraction * 100)}%` }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
        />
      </div>
    </section>
  );
}

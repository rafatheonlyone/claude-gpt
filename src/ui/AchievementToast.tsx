import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { localizeAchievement, type AchievementDefinition } from '../core/achievements/definitions';
import type { Locale } from '../i18n';
import { audio } from '../audio/engine';
import { t } from '../i18n';
import { AchievementGlyph } from './AchievementGlyph';
import './ui.css';

interface Props {
  readonly achievement: AchievementDefinition;
  readonly locale: Locale;
  readonly onDismiss: () => void;
}

/** Auto-dismiss timings scale with significance, so rarity is felt as duration. */
const DISMISS_MS = { standard: 5200, rare: 7000, legendary: 9500 } as const;

export function AchievementToast({ achievement, locale, onDismiss }: Props): React.ReactElement {
  const played = useRef(false);
  const content = localizeAchievement(achievement, locale);

  useEffect(() => {
    if (!played.current) {
      played.current = true;
      audio.play(
        achievement.rarity === 'legendary'
          ? 'achievementLegendary'
          : achievement.rarity === 'rare'
            ? 'achievementRare'
            : 'achievementStandard',
      );
    }

    const timer = window.setTimeout(onDismiss, DISMISS_MS[achievement.rarity]);
    return () => window.clearTimeout(timer);
  }, [achievement.rarity, onDismiss]);

  const label =
    achievement.rarity === 'legendary'
      ? t('achievement.legendaryUnlocked')
      : achievement.rarity === 'rare'
        ? t('achievement.rareUnlocked')
        : t('achievement.unlocked');

  return (
    <motion.div
      className="achievement-toast"
      data-rarity={achievement.rarity}
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.98 }}
      transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
    >
      <div className="achievement-toast__glyph" aria-hidden="true">
        <AchievementGlyph icon={achievement.icon} />
      </div>

      <div className="achievement-toast__content">
        <p className="achievement-toast__label">{label}</p>
        <p className="achievement-toast__name">{content.name}</p>
        <p className="achievement-toast__description">{content.description}</p>
      </div>

      <button
        type="button"
        className="achievement-toast__dismiss"
        onClick={onDismiss}
        aria-label={t('achievement.dismiss')}
      >
        <span aria-hidden="true">×</span>
      </button>
    </motion.div>
  );
}

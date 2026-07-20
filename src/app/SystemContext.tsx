import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { SystemService, ProfileSummary } from '../core/app/system-service';
import type { AchievementDefinition } from '../core/achievements/definitions';
import { setLocale as setActiveLocale, type Locale, t } from '../i18n';
import { AchievementToast } from '../ui/AchievementToast';
import { audio } from '../audio/engine';

interface Celebration {
  readonly id: string;
  readonly achievement: AchievementDefinition;
}

interface SystemContextValue {
  readonly service: SystemService;
  readonly locale: Locale;
  readonly changeLocale: (locale: Locale) => Promise<void>;
  readonly profileSummary: ProfileSummary | null;
  readonly refreshProfileSummary: () => Promise<void>;
  /** Queues achievement toasts, rendered once at the shell root regardless of the active page. */
  readonly celebrate: (achievements: readonly AchievementDefinition[]) => void;
  readonly flashLevel: (level: number) => void;
}

const SystemContext = createContext<SystemContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with the provider it reads
export function useSystem(): SystemContextValue {
  const value = useContext(SystemContext);
  if (!value) throw new Error('useSystem must be used within SystemProvider');
  return value;
}

interface Props {
  readonly service: SystemService;
  readonly initialLocale: Locale;
  readonly children: ReactNode;
}

/**
 * Owns state that must survive navigation between pages: the profile summary
 * the top bar shows, the active locale, and the achievement/level celebration
 * queue. Rendered once around the whole shell so a quest completed on one
 * page can still surface its reward while the user has already moved on.
 */
export function SystemProvider({ service, initialLocale, children }: Props): React.ReactElement {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [celebrations, setCelebrations] = useState<readonly Celebration[]>([]);
  const [levelFlash, setLevelFlash] = useState<number | null>(null);
  const flashTimer = useRef<number | null>(null);

  const refreshProfileSummary = useCallback(async () => {
    setProfileSummary(await service.getProfileSummary());
  }, [service]);

  useEffect(() => {
    void refreshProfileSummary();
  }, [refreshProfileSummary]);

  const changeLocale = useCallback(
    async (next: Locale) => {
      setActiveLocale(next);
      await service.setLocalePreference(next);
      // Triggers a re-render of this provider's subtree; every t() call made
      // during that render reads the module-level locale already updated
      // above, so the whole shell re-renders in the new language at once.
      setLocaleState(next);
    },
    [service],
  );

  const celebrate = useCallback((achievements: readonly AchievementDefinition[]) => {
    if (achievements.length === 0) return;
    setCelebrations((current) => [
      ...current,
      ...achievements.map((achievement) => ({
        id: `${achievement.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        achievement,
      })),
    ]);
  }, []);

  const flashLevel = useCallback((level: number) => {
    setLevelFlash(level);
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    window.setTimeout(() => audio.play('levelGained'), 320);
    flashTimer.current = window.setTimeout(() => setLevelFlash(null), 2600);
  }, []);

  const dismissCelebration = useCallback((id: string) => {
    setCelebrations((current) => current.filter((c) => c.id !== id));
  }, []);

  return (
    <SystemContext.Provider
      value={{ service, locale, changeLocale, profileSummary, refreshProfileSummary, celebrate, flashLevel }}
    >
      {children}

      <div className="visually-hidden" role="status" aria-live="polite">
        {levelFlash !== null && t('progression.levelUp', { level: levelFlash })}
      </div>

      <AnimatePresence>
        {levelFlash !== null && (
          <motion.div
            className="level-flash"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          >
            <span className="level-flash__label">{t('topbar.level')}</span>
            <span className="level-flash__value numeric">{levelFlash}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="toast-stack">
        <AnimatePresence>
          {celebrations.slice(0, 3).map((celebration) => (
            <AchievementToast
              key={celebration.id}
              achievement={celebration.achievement}
              locale={locale}
              onDismiss={() => dismissCelebration(celebration.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </SystemContext.Provider>
  );
}

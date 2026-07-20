import { useEffect, useState, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SystemService } from '../core/app/system-service';
import { createTauriPlatform, isTauri } from '../platform/tauri';
import { ErrorBoundary } from './ErrorBoundary';
import { Onboarding } from '../features/onboarding/Onboarding';
import { DesktopRequired } from './DesktopRequired';
import { SystemProvider } from './SystemContext';
import { Shell } from './Shell';
import { HomePage } from '../features/home/HomePage';
import { TodayPage } from '../features/today/TodayPage';
import { QuestsPage } from '../features/quests/QuestsPage';
import { StatusPage } from '../features/status/StatusPage';
import { AchievementsPage } from '../features/achievements/AchievementsPage';
import { ArchitectPage } from '../features/architect/ArchitectPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { ComingSoon } from './ComingSoon';
import { audio } from '../audio/engine';
import { setLocale, isLocale, DEFAULT_LOCALE, type Locale, t } from '../i18n';
import './app.css';

type Phase =
  | { kind: 'booting' }
  | { kind: 'desktop-required' }
  | { kind: 'onboarding'; service: SystemService }
  | { kind: 'ready'; service: SystemService; locale: Locale }
  | { kind: 'failed'; error: Error };

export function App(): React.ReactElement {
  const [phase, setPhase] = useState<Phase>({ kind: 'booting' });

  useEffect(() => {
    let cancelled = false;

    async function initialise(): Promise<void> {
      // SYSTEM's data lives in a database owned by the desktop host, so a plain
      // browser cannot run it. Say so plainly instead of failing obscurely.
      if (!isTauri()) {
        if (!cancelled) setPhase({ kind: 'desktop-required' });
        dismissBootLayer();
        return;
      }

      try {
        const platform = createTauriPlatform();
        const service = await SystemService.create(platform);
        const onboarded = await service.isOnboarded();

        const locale = await applyStoredPreferences(service, onboarded);

        if (cancelled) return;
        setPhase(
          onboarded ? { kind: 'ready', service, locale } : { kind: 'onboarding', service },
        );

        await platform.info.ready();
        dismissBootLayer();
      } catch (error) {
        if (cancelled) return;
        setPhase({
          kind: 'failed',
          error: error instanceof Error ? error : new Error(String(error)),
        });
        dismissBootLayer();
      }
    }

    void initialise();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOnboarded = useCallback(async (service: SystemService) => {
    const locale = await applyStoredPreferences(service, true);
    setPhase({ kind: 'ready', service, locale });
  }, []);

  if (phase.kind === 'booting') {
    return <div className="app app--booting" aria-busy="true" aria-label={t('app.loading')} />;
  }

  if (phase.kind === 'desktop-required') {
    return <DesktopRequired />;
  }

  if (phase.kind === 'failed') {
    return (
      <div className="app">
        <div className="error-boundary" role="alert">
          <div className="error-boundary__panel">
            <h2 className="error-boundary__title">{t('error.title')}</h2>
            <p className="error-boundary__body">{t('error.body')}</p>
            <details className="error-boundary__detail">
              <summary>{t('error.detail')}</summary>
              <pre data-selectable>{phase.error.message}</pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  if (phase.kind === 'onboarding') {
    return (
      <div className="app">
        <ErrorBoundary region="onboarding">
          <Onboarding service={phase.service} onComplete={() => void handleOnboarded(phase.service)} />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="app">
      <ErrorBoundary region="shell">
        <HashRouter>
          <SystemProvider service={phase.service} initialLocale={phase.locale}>
            <Routes>
              <Route element={<Shell />}>
                <Route index element={<HomePage />} />
                <Route path="hoje" element={<TodayPage />} />
                <Route path="missoes" element={<QuestsPage />} />
                <Route path="missoes/:questId" element={<QuestsPage />} />
                <Route path="status" element={<StatusPage />} />
                <Route
                  path="habilidades"
                  element={<ComingSoon titleKey="comingSoon.skillsTitle" bodyKey="comingSoon.skillsBody" />}
                />
                <Route path="conquistas" element={<AchievementsPage />} />
                <Route
                  path="chefes"
                  element={<ComingSoon titleKey="comingSoon.bossesTitle" bodyKey="comingSoon.bossesBody" />}
                />
                <Route
                  path="linha-do-tempo"
                  element={<ComingSoon titleKey="comingSoon.timelineTitle" bodyKey="comingSoon.timelineBody" />}
                />
                <Route path="arquiteto" element={<ArchitectPage />} />
                <Route path="configuracoes" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </SystemProvider>
        </HashRouter>
      </ErrorBoundary>
    </div>
  );
}

/** Remove the plain-HTML boot layer once React has painted. */
function dismissBootLayer(): void {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.classList.add('dismissed');
  window.setTimeout(() => boot.remove(), 500);
}

/**
 * Applies every stored presentation preference to the document and the audio
 * engine, and resolves the active locale.
 *
 * The OS reduced-motion request wins on first run and is never silently
 * overridden — only an explicit user choice can override it.
 */
async function applyStoredPreferences(service: SystemService, onboarded: boolean): Promise<Locale> {
  const [profile, appPrefs, storedLocale] = await Promise.all([
    onboarded ? service.getPreferences() : Promise.resolve<Record<string, unknown>>({}),
    onboarded ? service.getAppPreferences() : Promise.resolve<Record<string, unknown>>({}),
    service.getLocalePreference(),
  ]);

  const locale: Locale = isLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE;
  setLocale(locale);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const storedIntensity = profile['animationIntensity'];
  const intensity = typeof storedIntensity === 'string' ? storedIntensity : prefersReduced ? 'reduced' : 'full';
  document.documentElement.dataset['animation'] = intensity;

  const performanceMode = appPrefs['performanceMode'];
  document.documentElement.dataset['performance'] = String(performanceMode === true);

  const soundEnabled = profile['soundEnabled'];
  audio.configure({
    muted: soundEnabled === false,
    ...(typeof appPrefs['masterVolume'] === 'number' ? { master: appPrefs['masterVolume'] } : {}),
    ...(typeof appPrefs['interfaceVolume'] === 'number' ? { interface: appPrefs['interfaceVolume'] } : {}),
    ...(typeof appPrefs['eventsVolume'] === 'number' ? { events: appPrefs['eventsVolume'] } : {}),
    ...(typeof appPrefs['cinematicVolume'] === 'number' ? { cinematic: appPrefs['cinematicVolume'] } : {}),
  });

  return locale;
}

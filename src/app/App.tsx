import { useEffect, useState, useCallback } from 'react';
import { SystemService } from '../core/app/system-service';
import { createTauriPlatform, isTauri } from '../platform/tauri';
import { ErrorBoundary } from './ErrorBoundary';
import { Onboarding } from '../features/onboarding/Onboarding';
import { Dashboard } from '../features/dashboard/Dashboard';
import { DesktopRequired } from './DesktopRequired';
import { audio } from '../audio/engine';
import { t } from '../i18n';
import './app.css';

type Phase =
  | { kind: 'booting' }
  | { kind: 'desktop-required' }
  | { kind: 'onboarding'; service: SystemService }
  | { kind: 'ready'; service: SystemService }
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

        const preferences = onboarded ? await service.getPreferences() : {};
        applyPresentationPreferences(preferences);

        if (cancelled) return;
        setPhase(onboarded ? { kind: 'ready', service } : { kind: 'onboarding', service });

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

  const handleOnboarded = useCallback((service: SystemService) => {
    setPhase({ kind: 'ready', service });
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

  return (
    <div className="app">
      <ErrorBoundary region={phase.kind}>
        {phase.kind === 'onboarding' ? (
          <Onboarding service={phase.service} onComplete={() => handleOnboarded(phase.service)} />
        ) : (
          <Dashboard service={phase.service} />
        )}
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
 * Apply stored presentation preferences to the document root.
 *
 * The OS reduced-motion request wins on first run and is never silently
 * overridden — only an explicit user choice can override it.
 */
function applyPresentationPreferences(preferences: Record<string, unknown>): void {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stored = preferences['animationIntensity'];

  const intensity = typeof stored === 'string' ? stored : prefersReduced ? 'reduced' : 'full';

  document.documentElement.dataset['animation'] = intensity;

  const soundEnabled = preferences['soundEnabled'];
  audio.configure({ muted: soundEnabled === false });
}

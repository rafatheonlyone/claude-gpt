import { useEffect, useState } from 'react';
import type { AppInfo, DuplicateRepairPreview } from '../../core/app/system-service';
import type { PhysicalBaselineRecord } from '../../core/app/repositories';
import type { Locale } from '../../i18n';
import { useSystem } from '../../app/SystemContext';
import { audio, type AudioSettings } from '../../audio/engine';
import { t } from '../../i18n';
import './settings-page.css';

type AnimationIntensity = 'full' | 'reduced' | 'minimal' | 'off';
type QuestEncounterMode = 'full' | 'compact' | 'off';

export function SettingsPage(): React.ReactElement {
  const { service, locale, changeLocale } = useSystem();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volumes, setVolumes] = useState<AudioSettings>({
    muted: false,
    master: 0.7,
    interface: 0.6,
    events: 1,
    cinematic: 1,
  });
  const [animation, setAnimation] = useState<AnimationIntensity>('full');
  const [performanceMode, setPerformanceMode] = useState(false);
  const [encounterMode, setEncounterMode] = useState<QuestEncounterMode>('full');
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [backupError, setBackupError] = useState(false);
  const [duplicatePreview, setDuplicatePreview] = useState<DuplicateRepairPreview | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [repairStatus, setRepairStatus] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [baseline, setBaseline] = useState<PhysicalBaselineRecord>({
    pushupsComfortable: null,
    squatsComfortable: null,
    plankSeconds: null,
    trainingFrequencyPerWeek: null,
  });
  const [baselineStatus, setBaselineStatus] = useState<string | null>(null);
  const [savingBaseline, setSavingBaseline] = useState(false);

  useEffect(() => {
    void Promise.all([service.getPreferences(), service.getAppPreferences(), service.getAppInfo()]).then(
      ([profile, app, info]) => {
        if (typeof profile['soundEnabled'] === 'boolean') setSoundEnabled(profile['soundEnabled']);
        if (typeof profile['animationIntensity'] === 'string') {
          setAnimation(profile['animationIntensity'] as AnimationIntensity);
        }
        setVolumes((v) => ({
          ...v,
          master: typeof app['masterVolume'] === 'number' ? app['masterVolume'] : v.master,
          interface: typeof app['interfaceVolume'] === 'number' ? app['interfaceVolume'] : v.interface,
          events: typeof app['eventsVolume'] === 'number' ? app['eventsVolume'] : v.events,
          cinematic: typeof app['cinematicVolume'] === 'number' ? app['cinematicVolume'] : v.cinematic,
        }));
        if (typeof app['performanceMode'] === 'boolean') setPerformanceMode(app['performanceMode']);
        if (typeof app['questEncounterMode'] === 'string') {
          setEncounterMode(app['questEncounterMode'] as QuestEncounterMode);
        }
        setAppInfo(info);
      },
    );
    void service.getPhysicalBaseline().then((record) => {
      if (record) setBaseline(record);
    });
  }, [service]);

  async function updateSoundEnabled(enabled: boolean): Promise<void> {
    setSoundEnabled(enabled);
    audio.configure({ muted: !enabled });
    await service.setProfilePreference('soundEnabled', enabled);
  }

  async function updateVolume(key: keyof AudioSettings, value: number): Promise<void> {
    const next = { ...volumes, [key]: value };
    setVolumes(next);
    audio.configure({ [key]: value });
    await service.setAppPreference(`${key}Volume`, value);
  }

  async function updateAnimation(value: AnimationIntensity): Promise<void> {
    setAnimation(value);
    document.documentElement.dataset['animation'] = value;
    await service.setProfilePreference('animationIntensity', value);
  }

  async function updatePerformanceMode(value: boolean): Promise<void> {
    setPerformanceMode(value);
    document.documentElement.dataset['performance'] = String(value);
    await service.setAppPreference('performanceMode', value);
  }

  async function updateEncounterMode(value: QuestEncounterMode): Promise<void> {
    setEncounterMode(value);
    await service.setAppPreference('questEncounterMode', value);
  }

  async function handleBackup(): Promise<void> {
    setBackupError(false);
    setBackupStatus(null);
    try {
      const path = await service.runBackupNow();
      setBackupStatus(t('settings.backupSuccess', { path }));
    } catch {
      setBackupError(true);
      setBackupStatus(t('settings.backupError'));
    }
  }

  async function handleCheckDuplicates(): Promise<void> {
    setCheckingDuplicates(true);
    setRepairStatus(null);
    try {
      setDuplicatePreview(await service.previewDuplicateQuestRepair());
    } finally {
      setCheckingDuplicates(false);
    }
  }

  async function handleRepairDuplicates(): Promise<void> {
    setRepairing(true);
    try {
      const result = await service.repairDuplicateQuests();
      setRepairStatus(t('settings.maintenanceRepaired', { count: result.totalRedundant }));
      setDuplicatePreview(null);
    } finally {
      setRepairing(false);
    }
  }

  function updateBaselineField(key: keyof PhysicalBaselineRecord, raw: string): void {
    const parsed = raw.trim() === '' ? null : Number(raw);
    setBaseline((current) => ({
      ...current,
      [key]: parsed === null || Number.isFinite(parsed) ? parsed : current[key],
    }));
  }

  async function handleSaveBaseline(): Promise<void> {
    setSavingBaseline(true);
    setBaselineStatus(null);
    try {
      await service.savePhysicalBaseline(baseline);
      setBaselineStatus(t('settings.baselineSaved'));
    } finally {
      setSavingBaseline(false);
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1 className="settings-page__title">{t('settings.title')}</h1>
      </header>

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">{t('settings.languageSection')}</h2>
        <div className="settings-page__row">
          <span className="settings-page__label">{t('settings.languageLabel')}</span>
          <div className="settings-page__options">
            {(['pt-BR', 'en'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className="settings-page__option"
                data-selected={locale === option}
                onClick={() => void changeLocale(option as Locale)}
              >
                {option === 'pt-BR' ? t('settings.localePtBR') : t('settings.localeEn')}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">{t('settings.soundSection')}</h2>
        <div className="settings-page__row">
          <span className="settings-page__label">{t('settings.soundEnabledLabel')}</span>
          <div className="settings-page__options">
            {[true, false].map((value) => (
              <button
                key={String(value)}
                type="button"
                className="settings-page__option"
                data-selected={soundEnabled === value}
                onClick={() => void updateSoundEnabled(value)}
              >
                {value ? t('common.yes') : t('common.no')}
              </button>
            ))}
          </div>
        </div>

        {soundEnabled && (
          <>
            <VolumeSlider label={t('settings.masterVolumeLabel')} value={volumes.master} onChange={(v) => void updateVolume('master', v)} />
            <VolumeSlider label={t('settings.interfaceVolumeLabel')} value={volumes.interface} onChange={(v) => void updateVolume('interface', v)} />
            <VolumeSlider label={t('settings.eventsVolumeLabel')} value={volumes.events} onChange={(v) => void updateVolume('events', v)} />
            <VolumeSlider label={t('settings.cinematicVolumeLabel')} value={volumes.cinematic} onChange={(v) => void updateVolume('cinematic', v)} />
          </>
        )}
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">{t('settings.presentationSection')}</h2>
        <div className="settings-page__row">
          <span className="settings-page__label">{t('settings.animationLabel')}</span>
          <div className="settings-page__options">
            {(['full', 'reduced', 'minimal', 'off'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className="settings-page__option"
                data-selected={animation === value}
                onClick={() => void updateAnimation(value)}
              >
                {t(`settings.animation${value.charAt(0).toUpperCase()}${value.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-page__row">
          <div>
            <span className="settings-page__label">{t('settings.performanceModeLabel')}</span>
            <p className="settings-page__help">{t('settings.performanceModeHelp')}</p>
          </div>
          <div className="settings-page__options">
            {[true, false].map((value) => (
              <button
                key={String(value)}
                type="button"
                className="settings-page__option"
                data-selected={performanceMode === value}
                onClick={() => void updatePerformanceMode(value)}
              >
                {value ? t('common.yes') : t('common.no')}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">{t('settings.questPresentationSection')}</h2>
        <div className="settings-page__radio-group">
          {(['full', 'compact', 'off'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="settings-page__radio"
              data-selected={encounterMode === value}
              onClick={() => void updateEncounterMode(value)}
            >
              <span className="settings-page__radio-title">
                {t(`settings.questPresentation${value.charAt(0).toUpperCase()}${value.slice(1)}`)}
              </span>
              <span className="settings-page__radio-help">
                {t(`settings.questPresentation${value.charAt(0).toUpperCase()}${value.slice(1)}Help`)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">{t('settings.baselineSection')}</h2>
        <p className="settings-page__help">{t('settings.baselineBody')}</p>

        <div className="settings-page__baseline-grid">
          <label className="settings-page__baseline-field">
            <span className="settings-page__label">{t('settings.baselinePushups')}</span>
            <input
              type="number"
              min={0}
              className="settings-page__baseline-input"
              placeholder={t('settings.baselineNotSet')}
              value={baseline.pushupsComfortable ?? ''}
              onChange={(e) => updateBaselineField('pushupsComfortable', e.target.value)}
            />
          </label>
          <label className="settings-page__baseline-field">
            <span className="settings-page__label">{t('settings.baselineSquats')}</span>
            <input
              type="number"
              min={0}
              className="settings-page__baseline-input"
              placeholder={t('settings.baselineNotSet')}
              value={baseline.squatsComfortable ?? ''}
              onChange={(e) => updateBaselineField('squatsComfortable', e.target.value)}
            />
          </label>
          <label className="settings-page__baseline-field">
            <span className="settings-page__label">{t('settings.baselinePlank')}</span>
            <input
              type="number"
              min={0}
              className="settings-page__baseline-input"
              placeholder={t('settings.baselineNotSet')}
              value={baseline.plankSeconds ?? ''}
              onChange={(e) => updateBaselineField('plankSeconds', e.target.value)}
            />
          </label>
          <label className="settings-page__baseline-field">
            <span className="settings-page__label">{t('settings.baselineFrequency')}</span>
            <input
              type="number"
              min={0}
              max={7}
              className="settings-page__baseline-input"
              placeholder={t('settings.baselineNotSet')}
              value={baseline.trainingFrequencyPerWeek ?? ''}
              onChange={(e) => updateBaselineField('trainingFrequencyPerWeek', e.target.value)}
            />
          </label>
        </div>

        <button
          type="button"
          className="button button--primary"
          onClick={() => void handleSaveBaseline()}
          disabled={savingBaseline}
        >
          {savingBaseline ? t('common.loading') : t('settings.baselineSave')}
        </button>
        {baselineStatus && (
          <p className="settings-page__success" role="status">
            {baselineStatus}
          </p>
        )}
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">{t('settings.privacySection')}</h2>
        <p className="settings-page__static-text">{t('settings.privacyBody')}</p>
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">{t('settings.dataSection')}</h2>
        {appInfo && (
          <p className="settings-page__mono">
            <span className="settings-page__label">{t('settings.dataLocationLabel')}</span>
            <br />
            {appInfo.database}
          </p>
        )}
        <button type="button" className="button" onClick={() => void handleBackup()}>
          {t('settings.backupNowButton')}
        </button>
        {backupStatus && (
          <p className={backupError ? 'settings-page__error' : 'settings-page__success'} role="status">
            {backupStatus}
          </p>
        )}
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">{t('settings.maintenanceSection')}</h2>
        <p className="settings-page__help">{t('settings.maintenanceBody')}</p>
        <button
          type="button"
          className="button"
          onClick={() => void handleCheckDuplicates()}
          disabled={checkingDuplicates}
        >
          {checkingDuplicates ? t('common.loading') : t('settings.maintenanceCheckButton')}
        </button>

        {duplicatePreview && (
          <div className="settings-page__maintenance-preview">
            {duplicatePreview.totalRedundant === 0 ? (
              <p role="status">{t('settings.maintenanceNoneFound')}</p>
            ) : (
              <>
                <p role="status">
                  {t('settings.maintenancePreviewSummary', { count: duplicatePreview.totalRedundant })}
                </p>
                <ul className="settings-page__maintenance-list">
                  {duplicatePreview.groups.map((group) => (
                    <li key={`${group.templateId}-${group.dueDate ?? ''}`}>
                      {t('settings.maintenanceGroupLine', {
                        title: group.title,
                        count: group.redundantIds.length,
                      })}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => void handleRepairDuplicates()}
                  disabled={repairing}
                >
                  {repairing ? t('common.loading') : t('settings.maintenanceRepairButton')}
                </button>
              </>
            )}
          </div>
        )}

        {repairStatus && (
          <p className="settings-page__success" role="status">
            {repairStatus}
          </p>
        )}
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">{t('settings.aboutSection')}</h2>
        {appInfo && (
          <dl className="settings-page__about">
            <div>
              <dt>{t('settings.versionLabel')}</dt>
              <dd className="numeric">{appInfo.version}</dd>
            </div>
            <div>
              <dt>{t('settings.schemaVersionLabel')}</dt>
              <dd className="numeric">{appInfo.schemaVersion}</dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
}): React.ReactElement {
  return (
    <div className="settings-page__row">
      <span className="settings-page__label">{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="settings-page__slider"
        aria-label={label}
      />
    </div>
  );
}

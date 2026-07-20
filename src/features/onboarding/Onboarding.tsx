import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { SystemService, OnboardingInput } from '../../core/app/system-service';
import type { Domain } from '../../core/domain/types';
import { audio } from '../../audio/engine';
import { t } from '../../i18n';
import './onboarding.css';

interface Props {
  readonly service: SystemService;
  readonly onComplete: () => void;
}

type StepId =
  'intro' | 'identity' | 'focus' | 'capacity' | 'intensity' | 'presentation' | 'complete';

const STEPS: readonly StepId[] = [
  'intro',
  'identity',
  'focus',
  'capacity',
  'intensity',
  'presentation',
  'complete',
];

/** Goal tags offered at onboarding, matched against quest template tags. */
const FOCUS_OPTIONS: ReadonlyArray<{ tag: string; label: string; domain: Domain }> = [
  { tag: 'mathematics', label: 'Mathematics', domain: 'academic' },
  { tag: 'english', label: 'English', domain: 'academic' },
  { tag: 'school', label: 'School', domain: 'academic' },
  { tag: 'competition', label: 'Competitions', domain: 'academic' },
  { tag: 'programming', label: 'Programming', domain: 'technical' },
  { tag: 'frontend', label: 'Front-end', domain: 'technical' },
  { tag: 'security', label: 'Cybersecurity', domain: 'technical' },
  { tag: 'basketball', label: 'Basketball', domain: 'physical' },
  { tag: 'boxing', label: 'Boxing', domain: 'physical' },
  { tag: 'calisthenics', label: 'Calisthenics', domain: 'physical' },
  { tag: 'strength', label: 'Strength', domain: 'physical' },
  { tag: 'chess', label: 'Chess', domain: 'mental' },
  { tag: 'reading', label: 'Reading', domain: 'mental' },
  { tag: 'focus', label: 'Focus', domain: 'mental' },
  { tag: 'creativity', label: 'Creating', domain: 'creative' },
  { tag: 'communication', label: 'Communication', domain: 'social' },
  { tag: 'finance', label: 'Financial literacy', domain: 'financial' },
  { tag: 'recovery', label: 'Recovery', domain: 'recovery' },
];

const CAPACITY_OPTIONS = [30, 60, 90, 120, 180, 240] as const;

export function Onboarding({ service, onComplete }: Props): React.ReactElement {
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prefersReduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [availableMinutes, setAvailableMinutes] = useState<number>(120);
  const [difficulty, setDifficulty] = useState<'lighter' | 'balanced' | 'harder'>('balanced');
  const [animation, setAnimation] = useState<'full' | 'reduced' | 'minimal' | 'off'>(
    prefersReduced ? 'reduced' : 'full',
  );
  const [soundEnabled, setSoundEnabled] = useState(true);

  const step = STEPS[stepIndex] ?? 'intro';

  const advance = useCallback(() => {
    audio.play('interact');
    setStepIndex((index) => Math.min(STEPS.length - 1, index + 1));
  }, []);

  const goBack = useCallback(() => {
    audio.play('interact');
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const toggleGoal = useCallback((tag: string) => {
    audio.play('interact');
    setGoals((current) =>
      current.includes(tag) ? current.filter((g) => g !== tag) : [...current, tag],
    );
  }, []);

  const activate = useCallback(async () => {
    setSaving(true);
    setError(null);

    const input: OnboardingInput = {
      displayName: displayName.trim() || 'Operator',
      birthDate: birthDate || null,
      country: null,
      goals,
      availableMinutes,
      difficultyPreference: difficulty,
      excludedDomains: [],
      injuredAreas: [],
      animationIntensity: animation,
      soundEnabled,
    };

    try {
      await service.completeOnboarding(input);
      document.documentElement.dataset['animation'] = animation;
      audio.configure({ muted: !soundEnabled });
      audio.play('levelGained');
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setSaving(false);
    }
  }, [
    service,
    displayName,
    birthDate,
    goals,
    availableMinutes,
    difficulty,
    animation,
    soundEnabled,
    onComplete,
  ]);

  const showProgress = step !== 'intro' && step !== 'complete';

  return (
    <div className="onboarding">
      <div className="onboarding__field" aria-hidden="true" />

      <div className="onboarding__stage">
        {showProgress && (
          <div className="onboarding__progress">
            <span className="onboarding__step-label numeric">
              {t('onboarding.stepOf', { current: stepIndex, total: STEPS.length - 2 })}
            </span>
            <div
              className="onboarding__progress-track"
              role="progressbar"
              aria-valuenow={stepIndex}
              aria-valuemin={0}
              aria-valuemax={STEPS.length - 2}
            >
              <div
                className="onboarding__progress-fill"
                style={{ width: `${(stepIndex / (STEPS.length - 2)) * 100}%` }}
              />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="onboarding__panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
          >
            {step === 'intro' && (
              <section className="step">
                <p className="step__eyebrow">{t('app.name')}</p>
                <h1 className="step__title step__title--cinematic">
                  {t('onboarding.intro.title')}
                </h1>
                <p className="step__body step__body--wide">{t('onboarding.intro.body')}</p>
                <p className="step__note">{t('onboarding.intro.note')}</p>
              </section>
            )}

            {step === 'identity' && (
              <section className="step">
                <h1 className="step__title">{t('onboarding.identity.title')}</h1>
                <p className="step__body">{t('onboarding.identity.body')}</p>

                <label className="field">
                  <span className="field__label">{t('onboarding.identity.nameLabel')}</span>
                  <input
                    className="field__input"
                    type="text"
                    value={displayName}
                    autoFocus
                    maxLength={60}
                    placeholder={t('onboarding.identity.namePlaceholder')}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                </label>

                <label className="field">
                  <span className="field__label">{t('onboarding.identity.birthLabel')}</span>
                  <input
                    className="field__input"
                    type="date"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                  />
                  <span className="field__help">{t('onboarding.identity.birthHelp')}</span>
                </label>
              </section>
            )}

            {step === 'focus' && (
              <section className="step">
                <h1 className="step__title">{t('onboarding.focus.title')}</h1>
                <p className="step__body">{t('onboarding.focus.body')}</p>

                <div className="chips" role="group" aria-label={t('onboarding.focus.title')}>
                  {FOCUS_OPTIONS.map((option) => {
                    const selected = goals.includes(option.tag);
                    return (
                      <button
                        key={option.tag}
                        type="button"
                        className="chip"
                        data-selected={selected}
                        aria-pressed={selected}
                        onClick={() => toggleGoal(option.tag)}
                      >
                        <span
                          className="chip__dot"
                          style={{ background: `var(--domain-${option.domain})` }}
                          aria-hidden="true"
                        />
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <p className="step__note">{t('onboarding.focus.help')}</p>
              </section>
            )}

            {step === 'capacity' && (
              <section className="step">
                <h1 className="step__title">{t('onboarding.capacity.title')}</h1>
                <p className="step__body">{t('onboarding.capacity.body')}</p>

                <div
                  className="options"
                  role="radiogroup"
                  aria-label={t('onboarding.capacity.title')}
                >
                  {CAPACITY_OPTIONS.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      role="radio"
                      aria-checked={availableMinutes === minutes}
                      className="option option--compact"
                      data-selected={availableMinutes === minutes}
                      onClick={() => {
                        audio.play('interact');
                        setAvailableMinutes(minutes);
                      }}
                    >
                      <span className="option__title numeric">
                        {minutes < 60
                          ? t('onboarding.capacity.minutes', { value: minutes })
                          : t('onboarding.capacity.hours', { value: minutes / 60 })}
                      </span>
                    </button>
                  ))}
                </div>

                <p className="step__note">{t('onboarding.capacity.help')}</p>
              </section>
            )}

            {step === 'intensity' && (
              <section className="step">
                <h1 className="step__title">{t('onboarding.intensity.title')}</h1>
                <p className="step__body">{t('onboarding.intensity.body')}</p>

                <div
                  className="options"
                  role="radiogroup"
                  aria-label={t('onboarding.intensity.title')}
                >
                  {(['lighter', 'balanced', 'harder'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={difficulty === level}
                      className="option"
                      data-selected={difficulty === level}
                      onClick={() => {
                        audio.play('interact');
                        setDifficulty(level);
                      }}
                    >
                      <span className="option__title">{t(`onboarding.intensity.${level}`)}</span>
                      <span className="option__help">{t(`onboarding.intensity.${level}Help`)}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {step === 'presentation' && (
              <section className="step">
                <h1 className="step__title">{t('onboarding.presentation.title')}</h1>
                <p className="step__body">{t('onboarding.presentation.body')}</p>

                <fieldset className="fieldset">
                  <legend className="field__label">{t('onboarding.presentation.animation')}</legend>
                  <div className="options options--row">
                    {(['full', 'reduced', 'minimal', 'off'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        role="radio"
                        aria-checked={animation === level}
                        className="option option--compact"
                        data-selected={animation === level}
                        onClick={() => {
                          audio.play('interact');
                          setAnimation(level);
                          document.documentElement.dataset['animation'] = level;
                        }}
                      >
                        <span className="option__title">
                          {t(
                            `onboarding.presentation.animation${level.charAt(0).toUpperCase()}${level.slice(1)}`,
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                  {prefersReduced && (
                    <p className="field__help">
                      {t('onboarding.presentation.reducedMotionDetected')}
                    </p>
                  )}
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="field__label">{t('onboarding.presentation.sound')}</legend>
                  <div className="options options--row">
                    {[true, false].map((enabled) => (
                      <button
                        key={String(enabled)}
                        type="button"
                        role="radio"
                        aria-checked={soundEnabled === enabled}
                        className="option option--compact"
                        data-selected={soundEnabled === enabled}
                        onClick={() => {
                          setSoundEnabled(enabled);
                          audio.configure({ muted: !enabled });
                          if (enabled) audio.play('questAccepted');
                        }}
                      >
                        <span className="option__title">
                          {enabled
                            ? t('onboarding.presentation.soundOn')
                            : t('onboarding.presentation.soundOff')}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              </section>
            )}

            {step === 'complete' && (
              <section className="step">
                <div className="step__sigil" aria-hidden="true" />
                <h1 className="step__title step__title--cinematic">
                  {t('onboarding.complete.title')}
                </h1>
                <p className="step__body step__body--wide">{t('onboarding.complete.body')}</p>
              </section>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="onboarding__error" role="alert">
            {error}
          </p>
        )}

        <div className="onboarding__actions">
          {stepIndex > 0 && step !== 'complete' && (
            <button type="button" className="button" onClick={goBack} disabled={saving}>
              {t('onboarding.back')}
            </button>
          )}

          {step !== 'complete' ? (
            <button
              type="button"
              className="button button--primary"
              onClick={advance}
              disabled={saving}
            >
              {step === 'intro' ? t('boot.begin') : t('onboarding.next')}
            </button>
          ) : (
            <button
              type="button"
              className="button button--primary button--wide"
              onClick={() => void activate()}
              disabled={saving}
            >
              {saving ? t('app.loading') : t('onboarding.complete.enter')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

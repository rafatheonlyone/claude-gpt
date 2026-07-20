import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { DashboardQuest, CompletionOutcome } from '../../core/app/system-service';
import { useSystem } from '../../app/SystemContext';
import { useFocusTrap } from '../../app/useFocusTrap';
import { audio } from '../../audio/engine';
import { t, formatNumber } from '../../i18n';
import './quest-completion-dialog.css';

interface Props {
  readonly quest: DashboardQuest;
  readonly onClose: () => void;
  /** Called once the quest is genuinely persisted as complete. */
  readonly onCompleted: (outcome: CompletionOutcome) => void;
}

type Phase = 'form' | 'submitting' | 'result';

/**
 * The completion flow: capture completion degree and an optional reflection
 * or evidence note, persist through the real progression engine, then reveal
 * the reward. Mastery is never awarded here — only XP. The documented
 * separation between effort and demonstrated skill (`docs/GAME_SYSTEMS.md`
 * §1) survives until the mastery milestone actually implements the other
 * side of it.
 */
export function QuestCompletionDialog({ quest, onClose, onCompleted }: Props): React.ReactElement {
  const { service, celebrate, flashLevel, refreshProfileSummary } = useSystem();
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('form');
  const [degree, setDegree] = useState<'full' | 'partial'>('full');
  const [reflection, setReflection] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CompletionOutcome | null>(null);

  useFocusTrap(containerRef, true);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setPhase('submitting');
    setError(null);

    try {
      const result = await service.completeQuest(quest.id, {
        completion: degree === 'full' ? 1 : 0.5,
        ...(reflection.trim() ? { reflection: reflection.trim() } : {}),
        ...(evidenceNote.trim() ? { evidenceNote: evidenceNote.trim() } : {}),
      });

      audio.play('questCompleted');
      setOutcome(result);
      setPhase('result');

      if (result.leveledUp) flashLevel(result.levelAfter);
      if (result.achievements.length > 0) celebrate(result.achievements);
      await refreshProfileSummary();
      onCompleted(result);
    } catch (cause) {
      audio.play('error');
      setError(cause instanceof Error ? cause.message : t('completion.errorSaving'));
      setPhase('form');
    }
  }

  function handleKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Escape' && phase !== 'submitting') {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div className="quest-completion" onKeyDown={handleKeyDown}>
      <motion.div
        className="quest-completion__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={phase === 'form' ? onClose : undefined}
      />

      <motion.div
        ref={containerRef}
        className="quest-completion__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="completion-title"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.99 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      >
        <AnimatePresence mode="wait">
          {phase !== 'result' ? (
            <motion.form
              key="form"
              onSubmit={(e) => void handleSubmit(e)}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 id="completion-title" className="quest-completion__title">
                {t('completion.dialogTitle')}
              </h2>
              <p className="quest-completion__quest-title">{quest.title}</p>

              <fieldset className="quest-completion__fieldset">
                <legend className="quest-completion__label">{t('completion.degreeLabel')}</legend>
                <div className="quest-completion__degree">
                  {(['full', 'partial'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="quest-completion__degree-option"
                      data-selected={degree === option}
                      onClick={() => setDegree(option)}
                    >
                      {t(`completion.${option}`)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="quest-completion__field">
                <span className="quest-completion__label">{t('completion.reflectionLabel')}</span>
                <textarea
                  className="quest-completion__textarea"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder={t('completion.reflectionPlaceholder')}
                  rows={2}
                  maxLength={500}
                />
              </label>

              <label className="quest-completion__field">
                <span className="quest-completion__label">{t('completion.evidenceLabel')}</span>
                <input
                  type="text"
                  className="quest-completion__input"
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  placeholder={t('completion.evidencePlaceholder')}
                  maxLength={200}
                />
              </label>

              {error && (
                <p className="quest-completion__error" role="alert">
                  {error}
                </p>
              )}

              <div className="quest-completion__actions">
                <button
                  type="submit"
                  className="button button--primary"
                  disabled={phase === 'submitting'}
                >
                  {phase === 'submitting' ? t('common.loading') : t('completion.submit')}
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={onClose}
                  disabled={phase === 'submitting'}
                >
                  {t('completion.cancel')}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="result"
              className="quest-completion__result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
            >
              <p className="quest-completion__result-title">{t('completion.resultTitle')}</p>
              <p className="quest-completion__result-quest">{quest.title}</p>

              <div className="quest-completion__result-xp">
                <span className="quest-completion__result-xp-label">{t('completion.xpGained')}</span>
                <span className="quest-completion__result-xp-value numeric">
                  +{formatNumber(outcome?.award.creditedXp ?? 0)}
                </span>
              </div>

              <p className="quest-completion__result-saved">{t('completion.progressSaved')}</p>

              <button type="button" className="button button--primary" onClick={onClose}>
                {t('common.close')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

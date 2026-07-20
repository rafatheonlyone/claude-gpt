import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import type { DashboardQuest } from '../../core/app/system-service';
import { DIFFICULTY_BASE_XP, type Difficulty } from '../../core/progression/xp';
import { useFocusTrap } from '../../app/useFocusTrap';
import { audio } from '../../audio/engine';
import { t, formatDate, formatNumber } from '../../i18n';
import './quest-encounter.css';

export type EncounterVariant = 'full' | 'compact';

interface Props {
  readonly quest: DashboardQuest;
  readonly variant: EncounterVariant;
  readonly queueRemaining: number;
  readonly onAccept: () => void;
  readonly onDecline: () => void;
  readonly onPostpone: () => void;
  /** Marks the quest presented and navigates to its detail view. */
  readonly onViewDetails: () => void;
  /** Escape: close without deciding. The quest stays `detected` for next time. */
  readonly onDismiss: () => void;
}

type Stage = 'reveal' | 'decision' | 'confirmed';

/**
 * Cinematic quest encounter.
 *
 * An original presentation — dimmed backdrop, staged reveal, a restrained
 * sound cue — inspired by the atmosphere of mysterious progression systems
 * without reproducing any protected layout, dialogue, or asset (see
 * `docs/DESIGN_SYSTEM.md`). Daily/routine quests use the compact variant;
 * significant ones (see `useQuestEncounterQueue`) use the full sequence.
 */
export function QuestEncounter({
  quest,
  variant,
  queueRemaining,
  onAccept,
  onDecline,
  onPostpone,
  onViewDetails,
  onDismiss,
}: Props): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage>('reveal');
  const [confirmedLabel, setConfirmedLabel] = useState('');
  const played = useRef(false);
  const navigate = useNavigate();

  const reduced =
    document.documentElement.dataset['animation'] === 'off' ||
    document.documentElement.dataset['animation'] === 'minimal';

  useFocusTrap(containerRef, stage !== 'confirmed');

  if (!played.current) {
    played.current = true;
    audio.play('questAccepted');
    window.setTimeout(() => setStage('decision'), reduced ? 60 : variant === 'full' ? 900 : 260);
  }

  function confirmAndClose(label: string, action: () => void): void {
    setConfirmedLabel(label);
    setStage('confirmed');
    window.setTimeout(action, reduced ? 120 : 620);
  }

  function handleAccept(): void {
    audio.play('questCompleted');
    confirmAndClose(t('questEncounter.acceptedConfirm'), onAccept);
  }

  function handleDecline(): void {
    audio.play('interact');
    confirmAndClose(t('questEncounter.declinedConfirm'), onDecline);
  }

  function handlePostpone(): void {
    audio.play('interact');
    confirmAndClose(t('questEncounter.postponedConfirm'), onPostpone);
  }

  function handleViewDetails(): void {
    onViewDetails();
    navigate(`/missoes/${quest.id}`);
  }

  function handleKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Escape' && stage !== 'confirmed') {
      event.preventDefault();
      onDismiss();
    }
  }

  const baseXp = DIFFICULTY_BASE_XP[quest.difficulty as Difficulty] ?? null;
  const titleId = `encounter-title-${quest.id}`;

  return (
    <div className="quest-encounter" data-variant={variant} onKeyDown={handleKeyDown}>
      <motion.div
        className="quest-encounter__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0.1 : 0.4 }}
      />

      <motion.div
        ref={containerRef}
        className="quest-encounter__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: variant === 'full' ? 24 : -16, scale: variant === 'full' ? 0.98 : 1 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: variant === 'full' ? 12 : -12, scale: 0.99 }}
        transition={{ duration: reduced ? 0.12 : 0.5, ease: [0.32, 0.72, 0, 1] }}
      >
        <AnimatePresence mode="wait">
          {stage === 'confirmed' ? (
            <motion.div
              key="confirmed"
              className="quest-encounter__confirmed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduced ? 0.08 : 0.3 }}
            >
              <p className="quest-encounter__confirmed-text">{confirmedLabel}</p>
            </motion.div>
          ) : (
            <motion.div key="content" initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
              <p className="quest-encounter__eyebrow">{t('questEncounter.eyebrow')}</p>
              <h2 id={titleId} className="quest-encounter__title">
                {quest.title}
              </h2>

              <motion.div
                className="quest-encounter__detail"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: stage === 'decision' || variant === 'compact' ? 1 : 0, y: 0 }}
                transition={{ duration: reduced ? 0.08 : 0.4, delay: reduced ? 0 : 0.1 }}
              >
                <p className="quest-encounter__description">{quest.description}</p>

                {quest.purpose && (
                  <p className="quest-encounter__purpose">
                    <span className="quest-encounter__label">{t('questEncounter.purposeLabel')}</span>
                    {quest.purpose}
                  </p>
                )}

                <dl className="quest-encounter__facts">
                  <div>
                    <dt>{t('questEncounter.difficultyLabel')}</dt>
                    <dd>{t(`quest.difficulty.${quest.difficulty}`)}</dd>
                  </div>
                  {quest.dueDate && (
                    <div>
                      <dt>{t('questEncounter.deadlineLabel')}</dt>
                      <dd>{formatDate(quest.dueDate)}</dd>
                    </div>
                  )}
                  {baseXp !== null && (
                    <div>
                      <dt>{t('questEncounter.rewardsLabel')}</dt>
                      <dd className="numeric">~{formatNumber(baseXp)} XP</dd>
                    </div>
                  )}
                </dl>
              </motion.div>

              <motion.div
                className="quest-encounter__decision"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: stage === 'decision' || variant === 'compact' ? 1 : 0 }}
                transition={{ duration: reduced ? 0.08 : 0.3, delay: reduced ? 0 : 0.15 }}
              >
                <p className="quest-encounter__prompt">{t('questEncounter.decisionPrompt')}</p>
                <div className="quest-encounter__actions">
                  <button type="button" className="button button--primary" onClick={handleAccept}>
                    {t('questEncounter.accept')}
                  </button>
                  <button type="button" className="button" onClick={handleViewDetails}>
                    {t('questEncounter.viewDetails')}
                  </button>
                  <button type="button" className="button" onClick={handlePostpone}>
                    {t('questEncounter.postpone')}
                  </button>
                  <button type="button" className="button" onClick={handleDecline}>
                    {t('questEncounter.decline')}
                  </button>
                </div>
                {queueRemaining > 0 && (
                  <p className="quest-encounter__queue">
                    {t('questEncounter.queueRemaining', { count: queueRemaining })}
                  </p>
                )}
                <p className="visually-hidden">{t('questEncounter.dismissHint')}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

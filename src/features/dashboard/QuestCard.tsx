import { useState, useId } from 'react';
import type { DashboardQuest } from '../../core/app/system-service';
import { t } from '../../i18n';

interface Props {
  readonly quest: DashboardQuest;
  readonly busy: boolean;
  readonly onAccept?: () => void;
  readonly onDecline?: () => void;
  readonly onComplete?: (completion: number) => void;
}

export function QuestCard({
  quest,
  busy,
  onAccept,
  onDecline,
  onComplete,
}: Props): React.ReactElement {
  const [showRationale, setShowRationale] = useState(false);
  const rationaleId = useId();

  const settled = quest.status === 'completed' || quest.status === 'rejected';

  return (
    <article
      className="quest-card"
      data-domain={quest.domain}
      data-status={quest.status}
      aria-busy={busy}
    >
      <span className="quest-card__spine" aria-hidden="true" />

      <div className="quest-card__body">
        <div className="quest-card__meta">
          <span className="quest-card__domain">{t(`domain.${quest.domain}`)}</span>
          <span className="quest-card__separator" aria-hidden="true">
            ·
          </span>
          <span className="quest-card__difficulty">
            {t(`quest.difficulty.${quest.difficulty}`)}
          </span>
          {quest.estimatedMinutes !== null && (
            <>
              <span className="quest-card__separator" aria-hidden="true">
                ·
              </span>
              <span className="quest-card__minutes numeric">
                {t('quest.estimated', { minutes: quest.estimatedMinutes })}
              </span>
            </>
          )}
          {quest.status === 'accepted' && (
            <span className="quest-card__badge quest-card__badge--accepted">
              {t('quest.accepted')}
            </span>
          )}
          {quest.status === 'completed' && (
            <span className="quest-card__badge quest-card__badge--complete">
              {t('quest.completedLabel')}
              {quest.awardedXp !== null && (
                <span className="numeric"> {t('quest.awarded', { xp: quest.awardedXp })}</span>
              )}
            </span>
          )}
          {quest.status === 'rejected' && (
            <span className="quest-card__badge">{t('quest.declinedLabel')}</span>
          )}
        </div>

        <h3 className="quest-card__title">{quest.title}</h3>
        <p className="quest-card__description">{quest.description}</p>

        {quest.purpose && !settled && (
          <p className="quest-card__purpose">
            <span className="quest-card__purpose-label">{t('quest.purpose')}</span>
            {quest.purpose}
          </p>
        )}

        {quest.steps.length > 0 && !settled && (
          <ol className="quest-card__steps">
            {quest.steps.map((step) => (
              <li key={step.id}>{step.description}</li>
            ))}
          </ol>
        )}

        {quest.rationale && !settled && (
          <div className="quest-card__rationale">
            <button
              type="button"
              className="link-button"
              aria-expanded={showRationale}
              aria-controls={rationaleId}
              onClick={() => setShowRationale((v) => !v)}
            >
              {t('quest.whyThis')}
            </button>
            {showRationale && (
              <p id={rationaleId} className="quest-card__rationale-text">
                {quest.rationale}
              </p>
            )}
          </div>
        )}

        {!settled && (
          <div className="quest-card__actions">
            {quest.status === 'offered' && (
              <>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={onAccept}
                  disabled={busy}
                >
                  {t('quest.accept')}
                </button>
                <button type="button" className="button" onClick={onDecline} disabled={busy}>
                  {t('quest.decline')}
                </button>
              </>
            )}

            {quest.status === 'accepted' && (
              <>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => onComplete?.(1)}
                  disabled={busy}
                >
                  {t('quest.complete')}
                </button>
                {/* Partial completion is a first-class outcome, not a failure. */}
                <button
                  type="button"
                  className="button"
                  onClick={() => onComplete?.(0.5)}
                  disabled={busy}
                >
                  {t('quest.completePartial')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

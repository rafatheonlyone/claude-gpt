import { useState, useId } from 'react';
import type { DashboardQuest } from '../core/app/system-service';
import { t, formatNumber } from '../i18n';
import './ui.css';

interface Props {
  readonly quest: DashboardQuest;
  readonly busy: boolean;
  readonly onAccept?: () => void;
  readonly onDecline?: () => void;
  readonly onPostpone?: () => void;
  /** Opens the completion dialog; QuestCard never completes a quest directly. */
  readonly onCompleteRequest?: () => void;
  readonly onOpenDetail?: () => void;
}

const SETTLED_STATUSES = new Set(['completed', 'rejected', 'expired', 'postponed']);

export function QuestCard({
  quest,
  busy,
  onAccept,
  onDecline,
  onPostpone,
  onCompleteRequest,
  onOpenDetail,
}: Props): React.ReactElement {
  const [showRationale, setShowRationale] = useState(false);
  const rationaleId = useId();

  const settled = SETTLED_STATUSES.has(quest.status);

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
          <span className="quest-card__badge" data-status={quest.status}>
            {t(`quest.states.${quest.status}`)}
            {quest.status === 'completed' && quest.awardedXp !== null && (
              <span className="numeric"> {t('quest.awarded', { xp: formatNumber(quest.awardedXp) })}</span>
            )}
          </span>
        </div>

        {onOpenDetail ? (
          <button type="button" className="quest-card__title-button" onClick={onOpenDetail}>
            <h3 className="quest-card__title">{quest.title}</h3>
          </button>
        ) : (
          <h3 className="quest-card__title">{quest.title}</h3>
        )}
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
                <button type="button" className="button" onClick={onPostpone} disabled={busy}>
                  {t('quest.postpone')}
                </button>
                <button type="button" className="button" onClick={onDecline} disabled={busy}>
                  {t('quest.decline')}
                </button>
              </>
            )}

            {quest.status === 'accepted' && (
              <button
                type="button"
                className="button button--primary"
                onClick={onCompleteRequest}
                disabled={busy}
              >
                {t('quest.complete')}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

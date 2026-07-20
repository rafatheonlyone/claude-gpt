import { useEffect, useState } from 'react';
import type { SystemService, QuestDetail, DashboardQuest } from '../../core/app/system-service';
import { ObjectiveList } from './ObjectiveList';
import { t, formatDate, formatDateTime, formatNumber } from '../../i18n';
import './quest-detail-panel.css';

interface Props {
  readonly service: SystemService;
  readonly questId: string;
  readonly version: number;
  readonly busy: boolean;
  readonly onAccept: () => void;
  readonly onDecline: () => void;
  readonly onPostpone: () => void;
  readonly onCompleteRequest: (quest: DashboardQuest) => void;
}

const SETTLED = new Set(['completed', 'rejected', 'expired', 'postponed']);

export function QuestDetailPanel({
  service,
  questId,
  version,
  busy,
  onAccept,
  onDecline,
  onPostpone,
  onCompleteRequest,
}: Props): React.ReactElement {
  const [detail, setDetail] = useState<QuestDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    void service.getQuestDetail(questId).then((result) => {
      if (!cancelled) setDetail(result);
    });
    return () => {
      cancelled = true;
    };
  }, [service, questId, version]);

  if (!detail) {
    return <div className="quest-detail" aria-busy="true" />;
  }

  const settled = SETTLED.has(detail.status);

  return (
    <article className="quest-detail" data-domain={detail.domain}>
      <div className="quest-detail__meta">
        <span className="quest-card__badge" data-status={detail.status}>
          {t(`quest.states.${detail.status}`)}
        </span>
        <span className="quest-detail__domain">{t(`domain.${detail.domain}`)}</span>
      </div>

      <h1 className="quest-detail__title">{detail.title}</h1>

      <dl className="quest-detail__facts">
        <div>
          <dt>{t('questDetail.type')}</dt>
          <dd>{t(`questType.${detail.questType}`)}</dd>
        </div>
        <div>
          <dt>{t('questDetail.difficulty')}</dt>
          <dd>{t(`quest.difficulty.${detail.difficulty}`)}</dd>
        </div>
        {detail.estimatedMinutes !== null && (
          <div>
            <dt>{t('questDetail.estimatedTime')}</dt>
            <dd className="numeric">{t('quest.estimated', { minutes: detail.estimatedMinutes })}</dd>
          </div>
        )}
        {detail.dueDate && (
          <div>
            <dt>{t('questDetail.deadline')}</dt>
            <dd>{formatDate(detail.dueDate)}</dd>
          </div>
        )}
        {detail.status === 'completed' && detail.awardedXp !== null && (
          <div>
            <dt>{t('questDetail.rewards')}</dt>
            <dd className="numeric">{t('quest.awarded', { xp: formatNumber(detail.awardedXp) })}</dd>
          </div>
        )}
      </dl>

      <section className="quest-detail__section">
        <h2 className="quest-detail__section-title">{t('questDetail.description')}</h2>
        <p className="quest-detail__text">{detail.description}</p>
      </section>

      {detail.purpose && (
        <section className="quest-detail__section">
          <h2 className="quest-detail__section-title">{t('questDetail.why')}</h2>
          <p className="quest-detail__text">{detail.purpose}</p>
        </section>
      )}

      <section className="quest-detail__section">
        <h2 className="quest-detail__section-title">{t('questDetail.rationale')}</h2>
        <p className="quest-detail__text quest-detail__text--muted">
          {detail.rationale || t('questDetail.noRationale')}
        </p>
      </section>

      {detail.objectives.length > 0 ? (
        <ObjectiveList service={service} detail={detail} readOnly={settled} onChanged={setDetail} />
      ) : (
        <section className="quest-detail__section">
          <h2 className="quest-detail__section-title">{t('questDetail.steps')}</h2>
          {detail.steps.length > 0 ? (
            <ol className="quest-detail__steps">
              {detail.steps.map((step) => (
                <li key={step.id}>{step.description}</li>
              ))}
            </ol>
          ) : (
            <p className="quest-detail__text quest-detail__text--muted">{t('questDetail.noSteps')}</p>
          )}
        </section>
      )}

      {(detail.reflectionNote || detail.evidenceNote) && (
        <section className="quest-detail__section">
          {detail.reflectionNote && (
            <>
              <h2 className="quest-detail__section-title">{t('questDetail.reflection')}</h2>
              <p className="quest-detail__text">{detail.reflectionNote}</p>
            </>
          )}
          {detail.evidenceNote && (
            <>
              <h2 className="quest-detail__section-title">{t('questDetail.evidence')}</h2>
              <p className="quest-detail__text">{detail.evidenceNote}</p>
            </>
          )}
        </section>
      )}

      {!settled && (
        <div className="quest-detail__actions">
          {detail.status === 'offered' && (
            <>
              <button type="button" className="button button--primary" onClick={onAccept} disabled={busy}>
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
          {detail.status === 'accepted' && (
            <button
              type="button"
              className="button button--primary"
              onClick={() => onCompleteRequest(detail)}
              disabled={busy}
            >
              {t('quest.complete')}
            </button>
          )}
        </div>
      )}

      {detail.feedback.length > 0 && (
        <section className="quest-detail__section">
          <h2 className="quest-detail__section-title">{t('quests.history')}</h2>
          <ul className="quest-detail__history">
            {detail.feedback.map((entry, index) => (
              <li key={index}>
                <span className="numeric">{formatDateTime(entry.recordedAt)}</span> — {entry.action}
                {entry.reason ? ` (${entry.reason})` : ''}
              </li>
            ))}
            {detail.completedAt && (
              <li>
                <span className="numeric">{formatDateTime(detail.completedAt)}</span> —{' '}
                {t('quest.states.completed')}
              </li>
            )}
          </ul>
        </section>
      )}
    </article>
  );
}

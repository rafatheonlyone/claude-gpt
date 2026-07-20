import { useState } from 'react';
import type { SystemService, QuestDetail } from '../../core/app/system-service';
import { isObjectiveComplete, protocolProgress, type ObjectiveKind } from '../../core/quests/objectives';
import { t, formatNumber } from '../../i18n';
import './objective-list.css';

interface Props {
  readonly service: SystemService;
  readonly detail: QuestDetail;
  readonly readOnly: boolean;
  /** Called with the freshly-reloaded detail after any objective update commits. */
  readonly onChanged: (detail: QuestDetail) => void;
}

const ZERO_TARGET_KINDS = new Set(['checklist', 'binary']);

export function ObjectiveList({ service, detail, readOnly, onChanged }: Props): React.ReactElement | null {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (detail.objectives.length === 0) return null;

  // `kind` is DB-constrained to ObjectiveKind's values (migration 005's
  // CHECK constraint); the repository layer types it as `string` because it
  // is a raw column read, so it is asserted here rather than re-validated.
  const progress = protocolProgress(
    detail.objectives.map((o) => ({ ...o, kind: o.kind as ObjectiveKind })),
  );

  async function commit(objectiveId: string, current: number): Promise<void> {
    setPendingId(objectiveId);
    try {
      await service.updateObjectiveProgress(objectiveId, current);
      const reloaded = await service.getQuestDetail(detail.id);
      if (reloaded) onChanged(reloaded);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="quest-detail__section objective-list">
      <div className="objective-list__header">
        <h2 className="quest-detail__section-title">{t('questDetail.objectives')}</h2>
        <span className="objective-list__progress numeric">
          {t('questDetail.objectivesProgress', { completed: progress.completed, total: progress.total })}
        </span>
      </div>

      <ul className="objective-list__items">
        {detail.objectives.map((objective) => {
          const zeroTarget = ZERO_TARGET_KINDS.has(objective.kind);
          const complete = isObjectiveComplete({
            kind: objective.kind as ObjectiveKind,
            target: objective.target,
            current: objective.current,
          });
          const busy = pendingId === objective.id;
          const draft = drafts[objective.id] ?? String(objective.current);

          return (
            <li key={objective.id} className="objective-list__item" data-complete={complete}>
              <div className="objective-list__meta">
                <span className="objective-list__label">{objective.label}</span>
                {objective.optional && (
                  <span className="objective-list__optional-tag">{t('questDetail.objectiveOptional')}</span>
                )}
              </div>

              {zeroTarget ? (
                <button
                  type="button"
                  className="button objective-list__toggle"
                  data-complete={complete}
                  disabled={readOnly || busy}
                  onClick={() => void commit(objective.id, complete ? 0 : 1)}
                >
                  {complete ? t('questDetail.objectiveDone') : t('questDetail.objectiveMarkDone')}
                </button>
              ) : (
                <div className="objective-list__numeric">
                  <div className="objective-list__track" aria-hidden="true">
                    <div
                      className="objective-list__fill"
                      style={{
                        width: `${objective.target ? Math.min(100, (objective.current / objective.target) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="objective-list__count numeric">
                    {formatNumber(objective.current)} / {objective.target !== null ? formatNumber(objective.target) : '—'}
                    {objective.unit ? ` ${objective.unit}` : ''}
                  </span>
                  {!readOnly && (
                    <form
                      className="objective-list__form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const parsed = Number(draft);
                        if (Number.isFinite(parsed)) void commit(objective.id, parsed);
                      }}
                    >
                      <label className="visually-hidden" htmlFor={`objective-${objective.id}`}>
                        {objective.label}
                      </label>
                      <input
                        id={`objective-${objective.id}`}
                        type="number"
                        min={0}
                        step="any"
                        className="objective-list__input"
                        value={draft}
                        disabled={busy}
                        onChange={(event) =>
                          setDrafts((current) => ({ ...current, [objective.id]: event.target.value }))
                        }
                      />
                      <button type="submit" className="button" disabled={busy}>
                        {t('questDetail.objectiveSave')}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

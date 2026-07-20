import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import type { DashboardQuest } from '../../core/app/system-service';
import type { QuestListFilter } from '../../core/app/repositories';
import type { Domain } from '../../core/domain/types';
import { DIFFICULTY_BASE_XP } from '../../core/progression/xp';
import { useSystem } from '../../app/SystemContext';
import { useQuestActions } from './useQuestActions';
import { QuestDetailPanel } from './QuestDetailPanel';
import { QuestCompletionDialog } from './QuestCompletionDialog';
import { t } from '../../i18n';
import './quests-page.css';

type Sort = 'newest' | 'difficulty' | 'deadline';

const DIFFICULTY_ORDER = Object.keys(DIFFICULTY_BASE_XP);

const DOMAINS: readonly Domain[] = [
  'physical',
  'academic',
  'technical',
  'mental',
  'creative',
  'social',
  'financial',
  'recovery',
];

const STATUSES = ['offered', 'accepted', 'completed', 'rejected', 'postponed', 'expired'];

export function QuestsPage(): React.ReactElement {
  const { service } = useSystem();
  const { questId } = useParams();
  const navigate = useNavigate();

  const [quests, setQuests] = useState<DashboardQuest[] | null>(null);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<Domain | ''>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    const filter: QuestListFilter = {};
    if (domainFilter) filter.domain = domainFilter;
    if (statusFilter) filter.status = [statusFilter];
    if (search.trim()) filter.search = search.trim();
    setQuests(await service.getAllQuests(filter));
    setVersion((v) => v + 1);
  }, [service, domainFilter, statusFilter, search]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const actions = useQuestActions(service, refresh);

  const sorted = useMemo(() => {
    if (!quests) return [];
    const copy = [...quests];
    if (sort === 'difficulty') {
      copy.sort((a, b) => DIFFICULTY_ORDER.indexOf(b.difficulty) - DIFFICULTY_ORDER.indexOf(a.difficulty));
    } else if (sort === 'deadline') {
      copy.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
    }
    return copy;
  }, [quests, sort]);

  const selected = questId ? (sorted.find((q) => q.id === questId) ?? null) : null;

  return (
    <div className="quests-page" data-has-detail={Boolean(questId)}>
      <div className="quests-page__list-pane">
        <header className="quests-page__header">
          <h1 className="quests-page__title">{t('quests.title')}</h1>
        </header>

        <div className="quests-page__controls">
          <input
            type="search"
            className="quests-page__search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('quests.searchPlaceholder')}
            aria-label={t('quests.searchPlaceholder')}
          />

          <div className="quests-page__selects">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value as Domain | '')}
              aria-label={t('quests.filterDomain')}
            >
              <option value="">{t('quests.filterDomain')}</option>
              {DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {t(`domain.${d}`)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label={t('quests.filterStatus')}
            >
              <option value="">{t('quests.filterStatus')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`quest.states.${s}`)}
                </option>
              ))}
            </select>

            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t('quests.sortNewest')}>
              <option value="newest">{t('quests.sortNewest')}</option>
              <option value="difficulty">{t('quests.sortDifficulty')}</option>
              <option value="deadline">{t('quests.sortDeadline')}</option>
            </select>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">{t('quests.empty')}</p>
            <p className="empty-state__body">{t('quests.emptyBody')}</p>
          </div>
        ) : (
          <ul className="quests-page__rows">
            {sorted.map((quest) => (
              <li key={quest.id}>
                <button
                  type="button"
                  className="quests-page__row"
                  data-selected={quest.id === questId}
                  data-domain={quest.domain}
                  onClick={() => navigate(`/missoes/${quest.id}`)}
                >
                  <span className="quests-page__row-spine" aria-hidden="true" />
                  <span className="quests-page__row-body">
                    <span className="quests-page__row-title">{quest.title}</span>
                    <span className="quests-page__row-meta">
                      {t(`domain.${quest.domain}`)} · {t(`quest.states.${quest.status}`)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="quests-page__detail-pane">
        {selected ? (
          <>
            <button type="button" className="quests-page__back link-button" onClick={() => navigate('/missoes')}>
              ← {t('quests.title')}
            </button>
            <QuestDetailPanel
              service={service}
              questId={selected.id}
              version={version}
              busy={actions.busyQuestId === selected.id}
              onAccept={() => void actions.accept(selected.id)}
              onDecline={() => void actions.decline(selected.id)}
              onPostpone={() => void actions.postpone(selected.id)}
              onCompleteRequest={actions.requestComplete}
            />
          </>
        ) : (
          <div className="empty-state">
            <p className="empty-state__title">{t('quests.selectPrompt')}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {actions.completingQuest && (
          <QuestCompletionDialog
            quest={actions.completingQuest}
            onClose={actions.closeCompleteDialog}
            onCompleted={actions.handleCompleted}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

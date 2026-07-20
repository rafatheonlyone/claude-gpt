import type { Domain } from '../domain/types';
import type { ContentLocale } from '../content-locale';

/**
 * Phrases used to build a quest's `rationale` — the Architect's stated reason
 * for proposing it (see `docs/AI_ARCHITECT.md` §3: the rationale shown to the
 * user is the real decision input, not a story reconstructed afterwards).
 *
 * Kept local to the quest engine rather than in `src/i18n` (ADR-0007, ADR-0003):
 * the portable core must not depend on the application's UI message catalogue.
 */
interface RationalePhrases {
  readonly domainLabels: Readonly<Record<Domain, string>>;
  readonly supportsGoal: (goal: string) => string;
  readonly neverRecorded: (domain: string) => string;
  readonly quietFor: (domain: string, days: number) => string;
  readonly repeatedDeliberately: string;
  readonly broadDevelopment: string;
}

export const RATIONALE_PHRASES: Readonly<Record<ContentLocale, RationalePhrases>> = {
  'pt-BR': {
    domainLabels: {
      physical: 'físico',
      academic: 'acadêmico',
      technical: 'técnico',
      mental: 'mental',
      creative: 'criativo',
      social: 'social',
      financial: 'financeiro',
      recovery: 'recuperação',
    },
    supportsGoal: (goal) => `Apoia sua prioridade de ${goal}.`,
    neverRecorded: (domain) => `Você ainda não registrou atividade no domínio ${domain}.`,
    quietFor: (domain, days) => `O domínio ${domain} está parado há ${days} dias.`,
    repeatedDeliberately: 'Repetida de propósito — consistência importa aqui.',
    broadDevelopment: 'Selecionada para manter seu desenvolvimento amplo.',
  },
  en: {
    domainLabels: {
      physical: 'physical',
      academic: 'academic',
      technical: 'technical',
      mental: 'mental',
      creative: 'creative',
      social: 'social',
      financial: 'financial',
      recovery: 'recovery',
    },
    supportsGoal: (goal) => `Supports your ${goal} goal.`,
    neverRecorded: (domain) => `You have not recorded ${domain} work yet.`,
    quietFor: (domain, days) => `${domain} has been quiet for ${days} days.`,
    repeatedDeliberately: 'Repeated deliberately — consistency matters here.',
    broadDevelopment: 'Selected to keep your development broad.',
  },
};

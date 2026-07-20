/**
 * Locale for domain-generated content (quest templates, achievements).
 *
 * Deliberately independent of `src/i18n` (ADR-0007): the portable core must
 * stay self-contained (ADR-0003), so it carries its own minimal locale
 * concept rather than importing the application's UI message catalogues.
 * `SystemService` reads the user's actual locale preference and passes it in
 * as this type.
 */
export type ContentLocale = 'pt-BR' | 'en';

export const DEFAULT_CONTENT_LOCALE: ContentLocale = 'pt-BR';

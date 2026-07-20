import { en, type Messages } from './en';
import { ptBR } from './pt-BR';

/**
 * Locale identifiers used throughout SYSTEM's data and preferences.
 *
 * Brazilian Portuguese is the default (ADR-0007). English remains fully
 * supported as a selectable secondary locale — the architecture must not
 * assume a single language, so a third locale is a catalogue away.
 */
export type Locale = 'pt-BR' | 'en';

export const LOCALES: readonly Locale[] = ['pt-BR', 'en'];
export const DEFAULT_LOCALE: Locale = 'pt-BR';

const CATALOGUES: Record<Locale, Messages> = { 'pt-BR': ptBR, en };

/** BCP-47 tags for `Intl` formatting, distinct from the app's locale identifiers. */
const INTL_TAG: Record<Locale, string> = { 'pt-BR': 'pt-BR', en: 'en-US' };

let activeLocale: Locale = DEFAULT_LOCALE;

/**
 * Change the active locale.
 *
 * This mutates module state synchronously. The UI layer (`LocaleContext`)
 * pairs a call to this with a React state update so the whole tree re-renders
 * and every `t()` call made during that render reads the new value — no
 * subscription plumbing is needed here because plain function calls during
 * render always see the current module state.
 */
export function setLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getLocale(): Locale {
  return activeLocale;
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve a dotted message key, substituting `{placeholder}` values.
 *
 * Returns the key itself when a message is missing rather than throwing: a
 * missing translation should degrade to a visible oddity, never take down a
 * screen the user was relying on.
 */
export function t(key: string, params?: Readonly<Record<string, string | number>>): string {
  const message = resolve(CATALOGUES[activeLocale], key);

  if (typeof message !== 'string') {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] missing message: ${key}`);
    }
    return key;
  }

  if (!params) return message;

  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

function resolve(catalogue: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      catalogue,
    );
}

/** Format an integer or decimal using the active locale's grouping and decimal marks. */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(INTL_TAG[activeLocale], options).format(value);
}

/** Format an ISO date or timestamp as a short localized date, e.g. "19 de jul. de 2026". */
export function formatDate(iso: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(
    INTL_TAG[activeLocale],
    options ?? { day: 'numeric', month: 'short', year: 'numeric' },
  ).format(date);
}

/** Format an ISO date/timestamp including time, e.g. "19 de jul. de 2026, 14:32". */
export function formatDateTime(iso: string): string {
  return formatDate(iso, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

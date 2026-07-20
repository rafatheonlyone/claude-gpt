import { en } from './en';

export type Locale = 'en';

const CATALOGUES = { en } as const;

let activeLocale: Locale = 'en';

export function setLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getLocale(): Locale {
  return activeLocale;
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

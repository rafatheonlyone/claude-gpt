import { describe, it, expect, afterEach } from 'vitest';
import { t, setLocale, getLocale, isLocale, formatNumber, formatDate, DEFAULT_LOCALE } from './index';
import { en } from './en';
import { ptBR } from './pt-BR';

afterEach(() => {
  setLocale(DEFAULT_LOCALE);
});

describe('default locale', () => {
  it('is Brazilian Portuguese', () => {
    expect(getLocale()).toBe('pt-BR');
    expect(DEFAULT_LOCALE).toBe('pt-BR');
  });

  it('resolves messages in Portuguese by default', () => {
    expect(t('app.name')).toBe('SYSTEM');
    expect(t('nav.quests')).toBe('Missões');
    expect(t('questEncounter.decisionPrompt')).toBe('Deseja aceitar esta missão?');
  });
});

describe('locale switching', () => {
  it('switches to English and back', () => {
    setLocale('en');
    expect(t('nav.quests')).toBe('Quests');

    setLocale('pt-BR');
    expect(t('nav.quests')).toBe('Missões');
  });

  it('recognises valid locale strings and rejects invalid ones', () => {
    expect(isLocale('pt-BR')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('')).toBe(false);
  });
});

describe('parameter interpolation', () => {
  it('substitutes named placeholders', () => {
    expect(t('home.greeting', { name: 'Rafa' })).toBe('Bem-vindo de volta, Rafa');
  });

  it('leaves an unmatched placeholder untouched rather than throwing', () => {
    expect(t('home.greeting', {})).toBe('Bem-vindo de volta, {name}');
  });

  it('supports numeric parameters', () => {
    setLocale('en');
    expect(t('quest.awarded', { xp: 120 })).toBe('+120 XP');
  });
});

describe('missing message fallback', () => {
  it('returns the key itself rather than throwing or returning undefined', () => {
    expect(t('this.key.does.not.exist')).toBe('this.key.does.not.exist');
  });

  it('does not crash on a key that resolves to a non-string node', () => {
    // 'quest' is an object, not a string — must degrade gracefully.
    expect(t('quest')).toBe('quest');
  });
});

describe('catalogue parity', () => {
  it('gives pt-BR exactly the same key shape as en', () => {
    // A missing translation should be caught here, not discovered by a user
    // switching locales and finding raw keys on screen.
    expect(collectKeys(ptBR)).toEqual(collectKeys(en));
  });

  it('has no empty string values in either catalogue', () => {
    for (const [key, value] of collectLeaves(en)) {
      expect(value.length, `en.${key} is empty`).toBeGreaterThan(0);
    }
    for (const [key, value] of collectLeaves(ptBR)) {
      expect(value.length, `pt-BR.${key} is empty`).toBeGreaterThan(0);
    }
  });
});

describe('number formatting', () => {
  it('uses Portuguese grouping by default', () => {
    expect(formatNumber(12345)).toBe('12.345');
  });

  it('uses English grouping once switched', () => {
    setLocale('en');
    expect(formatNumber(12345)).toBe('12,345');
  });
});

describe('date formatting', () => {
  it('formats an ISO date without throwing', () => {
    const formatted = formatDate('2026-07-19T12:00:00.000Z');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('returns the original string for an invalid date rather than "Invalid Date"', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('produces different output for pt-BR and en month names', () => {
    setLocale('pt-BR');
    const pt = formatDate('2026-07-19T12:00:00.000Z');
    setLocale('en');
    const enFormatted = formatDate('2026-07-19T12:00:00.000Z');
    expect(pt).not.toBe(enFormatted);
  });
});

function collectKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj === 'string') return [prefix];
  if (obj && typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
      collectKeys(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

function collectLeaves(obj: unknown, prefix = ''): Array<[string, string]> {
  if (typeof obj === 'string') return [[prefix, obj]];
  if (obj && typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
      collectLeaves(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

import { describe, it, expect } from 'vitest';
import { QUEST_TEMPLATES, localizeTemplate } from './templates';

// Mirrors the English list in generator.test.ts, translated. Kept independent
// so either scan can catch a regression the other might phrase differently.
const FORBIDDEN_PT = [
  'preguiç',
  'desculpa',
  'sem dor',
  'virada de noite',
  'pule uma refeição',
  'pule refeições',
  'passe fome',
  'ignore a dor',
  'fraqueza',
  'patético',
];

describe('quest template localization', () => {
  it('gives every template non-empty Portuguese content', () => {
    for (const template of QUEST_TEMPLATES) {
      expect(template.titlePt.trim().length, `${template.id}.titlePt`).toBeGreaterThan(0);
      expect(template.descriptionPt.trim().length, `${template.id}.descriptionPt`).toBeGreaterThan(0);
      expect(template.purposePt.trim().length, `${template.id}.purposePt`).toBeGreaterThan(0);
      expect(template.stepsPt.length, `${template.id}.stepsPt`).toBe(template.steps.length);
      for (const step of template.stepsPt) {
        expect(step.trim().length, `${template.id} step`).toBeGreaterThan(0);
      }
    }
  });

  it('resolves pt-BR content by default field selection', () => {
    const template = QUEST_TEMPLATES[0]!;
    const content = localizeTemplate(template, 'pt-BR');
    expect(content.title).toBe(template.titlePt);
    expect(content.description).toBe(template.descriptionPt);
    expect(content.purpose).toBe(template.purposePt);
    expect(content.steps).toBe(template.stepsPt);
  });

  it('resolves English content when requested', () => {
    const template = QUEST_TEMPLATES[0]!;
    const content = localizeTemplate(template, 'en');
    expect(content.title).toBe(template.title);
    expect(content.description).toBe(template.description);
  });

  it('contains no shaming or excess-promoting language in Portuguese', () => {
    // docs/GAME_SYSTEMS.md §12, enforced in both languages.
    for (const template of QUEST_TEMPLATES) {
      const text =
        `${template.titlePt} ${template.descriptionPt} ${template.purposePt} ${template.stepsPt.join(' ')}`.toLowerCase();
      for (const phrase of FORBIDDEN_PT) {
        expect(text).not.toContain(phrase);
      }
    }
  });
});

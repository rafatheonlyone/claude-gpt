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

  it('gives every objective non-empty English and Portuguese labels', () => {
    for (const template of QUEST_TEMPLATES) {
      if (!template.objectives) continue;
      for (const objective of template.objectives) {
        expect(objective.label.trim().length, `${template.id} objective label`).toBeGreaterThan(0);
        expect(objective.labelPt.trim().length, `${template.id} objective labelPt`).toBeGreaterThan(0);
      }
    }
  });

  it('resolves objectives through localizeTemplate in both locales', () => {
    const protocol = QUEST_TEMPLATES.find((t) => t.questType === 'daily_protocol');
    expect(protocol).toBeDefined();
    expect(protocol!.objectives!.length).toBeGreaterThan(0);

    const en = localizeTemplate(protocol!, 'en');
    const pt = localizeTemplate(protocol!, 'pt-BR');
    expect(en.objectives).toHaveLength(protocol!.objectives!.length);
    expect(pt.objectives).toHaveLength(protocol!.objectives!.length);
    expect(en.objectives![0]!.label).toBe(protocol!.objectives![0]!.label);
    expect(pt.objectives![0]!.label).toBe(protocol!.objectives![0]!.labelPt);
  });

  it('never prescribes a fixed extreme physical benchmark as a template default', () => {
    // The milestone's explicit example of what not to do: 100 push-ups, 100
    // squats, or a 10 km run baked in as a template constant.
    for (const template of QUEST_TEMPLATES) {
      if (!template.objectives) continue;
      for (const objective of template.objectives) {
        if (objective.baselineKey) {
          // Calibrated at generation time from the user's own baseline —
          // never a fixed number in the template itself.
          expect(objective.target).toBeNull();
        }
      }
    }
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

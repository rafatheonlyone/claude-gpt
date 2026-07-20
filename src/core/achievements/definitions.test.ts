import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, localizeAchievement } from './definitions';

describe('achievement localization', () => {
  it('gives every achievement non-empty Portuguese content', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.namePt.trim().length, `${achievement.id}.namePt`).toBeGreaterThan(0);
      expect(
        achievement.descriptionPt.trim().length,
        `${achievement.id}.descriptionPt`,
      ).toBeGreaterThan(0);
    }
  });

  it('resolves pt-BR content by default field selection', () => {
    const achievement = ACHIEVEMENTS[0]!;
    const content = localizeAchievement(achievement, 'pt-BR');
    expect(content.name).toBe(achievement.namePt);
    expect(content.description).toBe(achievement.descriptionPt);
  });

  it('resolves English content when requested', () => {
    const achievement = ACHIEVEMENTS[0]!;
    const content = localizeAchievement(achievement, 'en');
    expect(content.name).toBe(achievement.name);
    expect(content.description).toBe(achievement.description);
  });

  it('never rewards a perfect seven-day week, in either language', () => {
    // Rewarding an unbroken streak would reward the absence of rest.
    const balanced = ACHIEVEMENTS.find((a) => a.id === 'balanced_week');
    expect(balanced?.description.toLowerCase()).not.toContain('every day');
    expect(balanced?.descriptionPt.toLowerCase()).not.toContain('todos os dias sem parar');
  });
});

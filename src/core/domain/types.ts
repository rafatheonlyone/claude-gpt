/** Shared domain vocabulary. Kept in one place so terminology never drifts. */

export const DOMAINS = [
  'physical',
  'academic',
  'technical',
  'mental',
  'creative',
  'social',
  'financial',
  'recovery',
] as const;

export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_LABELS: Readonly<Record<Domain, string>> = {
  physical: 'Physical',
  academic: 'Academic',
  technical: 'Technical',
  mental: 'Mental',
  creative: 'Creative',
  social: 'Social',
  financial: 'Financial',
  recovery: 'Recovery',
};

export const QUEST_TYPES = [
  'daily',
  'weekly',
  'monthly',
  'main',
  'side',
  'hidden',
  'chain',
  'recovery',
  'exploration',
  'mastery',
  'challenge',
  'social',
  'project',
  'boss_preparation',
  'seasonal',
  'milestone',
  'experiment',
  'user',
  /** One meaningful daily mission carrying several measurable objectives, rather than many single-purpose quests. */
  'daily_protocol',
] as const;

export type QuestType = (typeof QUEST_TYPES)[number];

export type QuestStatus = 'offered' | 'accepted' | 'completed' | 'skipped' | 'expired' | 'rejected';

export type ContentSource = 'user' | 'rules' | 'ai' | 'system';

/**
 * Rank progression. Original nomenclature for SYSTEM — see
 * `docs/GAME_SYSTEMS.md` §7. Rank is never granted by XP alone.
 */
export const RANKS = [
  'dormant',
  'threshold',
  'emergent',
  'ascendant',
  'vanguard',
  'paragon',
  'sovereign',
  'transcendent',
] as const;

export type Rank = (typeof RANKS)[number];

export const RANK_LABELS: Readonly<Record<Rank, string>> = {
  dormant: 'Dormant',
  threshold: 'Threshold',
  emergent: 'Emergent',
  ascendant: 'Ascendant',
  vanguard: 'Vanguard',
  paragon: 'Paragon',
  sovereign: 'Sovereign',
  transcendent: 'Transcendent',
};

export const MASTERY_TIERS = [
  'novice',
  'apprentice',
  'practitioner',
  'adept',
  'expert',
  'authority',
] as const;

export type MasteryTier = (typeof MASTERY_TIERS)[number];

/** Class describes current identity. It never restricts what the user may do. */
export const CLASSES = [
  'scholar',
  'developer',
  'athlete',
  'strategist',
  'creator',
  'builder',
  'explorer',
  'hybrid',
] as const;

export type ClassId = (typeof CLASSES)[number];

export const CLASS_LABELS: Readonly<Record<ClassId, string>> = {
  scholar: 'Scholar',
  developer: 'Developer',
  athlete: 'Athlete',
  strategist: 'Strategist',
  creator: 'Creator',
  builder: 'Builder',
  explorer: 'Explorer',
  hybrid: 'Hybrid',
};

export function isDomain(value: string): value is Domain {
  return (DOMAINS as readonly string[]).includes(value);
}

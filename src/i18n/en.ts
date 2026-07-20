/**
 * English message catalogue.
 *
 * All user-facing copy lives here (ADR-0006) so Brazilian Portuguese can be
 * added later without touching a single component. Nested keys are addressed
 * with dots: `t('onboarding.welcome.title')`.
 *
 * Voice rules for anything written here (docs/AI_ARCHITECT.md §9): calm,
 * concise, precise. Never flattering, never shaming, never urgent.
 */
export const en = {
  app: {
    name: 'SYSTEM',
    loading: 'Initialising',
    ready: 'Ready',
  },

  boot: {
    detecting: 'Scanning',
    detected: 'Compatible user detected',
    establishing: 'Establishing local record',
    begin: 'Begin',
  },

  onboarding: {
    stepOf: 'Step {current} of {total}',
    back: 'Back',
    next: 'Continue',
    finish: 'Activate',
    skip: 'Prefer not to answer',

    intro: {
      title: 'Compatible user detected',
      body: 'SYSTEM records real development. Not time spent here — work you actually do.\n\nEverything stays on this machine. Nothing is uploaded, and nothing is shared unless you choose it.',
      note: 'This takes about two minutes. You can change every answer later.',
    },

    identity: {
      title: 'Identification',
      body: 'What should SYSTEM call you?',
      nameLabel: 'Display name',
      namePlaceholder: 'Your name',
      birthLabel: 'Date of birth',
      birthHelp:
        'Used only to keep recommendations appropriate for your age. Stored locally, never shared.',
    },

    focus: {
      title: 'Current priorities',
      body: 'Select what you are actually working on right now. These shape what SYSTEM proposes.',
      help: 'Choose as many as apply. You can change these at any time.',
    },

    capacity: {
      title: 'Available time',
      body: 'Roughly how much time do you have on a normal day for deliberate development?',
      help: 'SYSTEM will never propose more than you have. It deliberately leaves room for the rest of your life.',
      minutes: '{value} minutes',
      hours: '{value} hours',
    },

    intensity: {
      title: 'Calibration',
      body: 'How should SYSTEM pitch difficulty?',
      lighter: 'Lighter',
      lighterHelp: 'Build the habit first. Difficulty grows as consistency does.',
      balanced: 'Balanced',
      balancedHelp: 'Work that stretches you without breaking the week.',
      harder: 'Harder',
      harderHelp: 'Consistently past comfortable. You can lower this at any time.',
    },

    presentation: {
      title: 'Presentation',
      body: 'How SYSTEM should look and sound.',
      animation: 'Animation',
      animationFull: 'Full',
      animationReduced: 'Reduced',
      animationMinimal: 'Minimal',
      animationOff: 'Off',
      sound: 'Sound',
      soundOn: 'On',
      soundOff: 'Off',
      reducedMotionDetected:
        'Your system requests reduced motion, so that is the default. You can override it.',
    },

    complete: {
      title: 'Record established',
      body: 'SYSTEM is now observing. Your first objectives are ready.',
      enter: 'Enter',
    },
  },

  dashboard: {
    greeting: 'Welcome back, {name}',
    greetingFirst: 'Welcome, {name}',
    level: 'Level',
    rank: 'Rank',
    totalXp: 'Total XP',
    completed: 'Completed',
    activeDays: 'Active days',
    xpToNext: '{current} / {required} to level {next}',
    todayTitle: "Today's objectives",
    todayEmpty: 'No objectives remain today.',
    todayEmptyBody: 'That is a complete day. Rest is part of the record.',
    allDone: 'All objectives complete',
  },

  quest: {
    accept: 'Accept',
    decline: 'Decline',
    complete: 'Mark complete',
    completePartial: 'Completed partially',
    accepted: 'Accepted',
    completedLabel: 'Complete',
    declinedLabel: 'Declined',
    estimated: '{minutes} min',
    whyThis: 'Why this?',
    purpose: 'Purpose',
    steps: 'Steps',
    awarded: '+{xp} XP',
    difficulty: {
      trivial: 'Trivial',
      light: 'Light',
      moderate: 'Moderate',
      demanding: 'Demanding',
      severe: 'Severe',
    },
  },

  domain: {
    physical: 'Physical',
    academic: 'Academic',
    technical: 'Technical',
    mental: 'Mental',
    creative: 'Creative',
    social: 'Social',
    financial: 'Financial',
    recovery: 'Recovery',
  },

  rank: {
    dormant: 'Dormant',
    threshold: 'Threshold',
    emergent: 'Emergent',
    ascendant: 'Ascendant',
    vanguard: 'Vanguard',
    paragon: 'Paragon',
    sovereign: 'Sovereign',
    transcendent: 'Transcendent',
  },

  achievement: {
    unlocked: 'Achievement unlocked',
    rareUnlocked: 'Rare achievement',
    legendaryUnlocked: 'Legendary achievement',
    dismiss: 'Dismiss',
  },

  progression: {
    levelUp: 'Level {level}',
    xpGained: '+{xp} XP',
    breakdown: 'How this was calculated',
  },

  error: {
    title: 'Something went wrong',
    body: 'SYSTEM encountered an error. Your data is unaffected — nothing was written.',
    retry: 'Try again',
    detail: 'Technical detail',
  },

  desktopOnly: {
    title: 'Desktop application required',
    body: 'SYSTEM stores everything locally in a database owned by the desktop host. Run it with the desktop shell rather than in a browser.',
    command: 'npm run tauri:dev',
  },
} as const;

export type Messages = typeof en;

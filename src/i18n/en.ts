/**
 * English message catalogue.
 *
 * All user-facing copy lives here (ADR-0006) so locales can be added without
 * touching a single component. Nested keys are addressed with dots:
 * `t('onboarding.intro.title')`.
 *
 * `pt-BR.ts` must carry exactly the same key shape — checked by
 * `src/i18n/index.test.ts`. Add a key here and its translation together.
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
      defaultName: 'Operator',
      birthLabel: 'Date of birth',
      birthHelp:
        'Used only to keep recommendations appropriate for your age. Stored locally, never shared.',
    },

    focus: {
      title: 'Current priorities',
      body: 'Select what you are actually working on right now. These shape what SYSTEM proposes.',
      help: 'Choose as many as apply. You can change these at any time.',
      tags: {
        mathematics: 'Mathematics',
        english: 'English',
        school: 'School',
        competition: 'Competitions',
        programming: 'Programming',
        frontend: 'Front-end',
        security: 'Cybersecurity',
        basketball: 'Basketball',
        boxing: 'Boxing',
        calisthenics: 'Calisthenics',
        strength: 'Strength',
        chess: 'Chess',
        reading: 'Reading',
        focus: 'Focus',
        creativity: 'Creating',
        communication: 'Communication',
        finance: 'Financial literacy',
        recovery: 'Recovery',
      },
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

  common: {
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    confirm: 'Confirm',
    retry: 'Try again',
    search: 'Search',
    loading: 'Loading',
    yes: 'Yes',
    no: 'No',
    filterAll: 'All',
    filterActive: 'Active',
    filterAvailable: 'Available',
    filterCompleted: 'Completed',
    minutesShort: '{minutes} min',
  },

  nav: {
    home: 'Command Center',
    today: 'Today',
    quests: 'Quests',
    status: 'Status',
    skills: 'Skills',
    achievements: 'Achievements',
    bosses: 'Bosses',
    timeline: 'Timeline',
    architect: 'The Architect',
    settings: 'Settings',
    collapse: 'Collapse navigation',
    expand: 'Expand navigation',
  },

  topbar: {
    level: 'Level',
    rank: 'Rank',
    today: 'Today',
    settings: 'Settings',
    profile: 'Profile',
  },

  progression: {
    levelUp: 'Level {level}',
    xpToNext: '{current} / {required} to level {next}',
  },

  home: {
    title: 'Command Center',
    greeting: 'Welcome back, {name}',
    greetingFirst: 'Welcome, {name}',
    priorityTitle: 'Current priority',
    progressTitle: 'Progression',
    questsTitle: "Today's quests",
    evolutionTitle: 'Recent evolution',
    architectTitle: 'The Architect observes',
    noActiveQuest: 'No quest is currently active.',
    viewAllQuests: 'View all quests',
    recalibrate: 'New suggestions',
    recentAchievement: 'Most recent achievement',
    noRecentAchievement: 'No achievement unlocked yet.',
    focusDomain: 'Current focus',
    noFocusDomain: 'Not yet established',
    questCountToday: '{count} quests today',
    architectDefaultMessage:
      'The record is established. The next action defines the pace of this cycle.',
  },

  today: {
    title: 'Today',
    empty: 'No quests remain today.',
    emptyBody: 'That is a complete day. Rest is part of the record.',
    dailyProgress: 'Daily progress',
    effortToday: 'Effort today',
    recommendationTitle: "The Architect's recommendation",
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

  quests: {
    title: 'Quests',
    searchPlaceholder: 'Search quests',
    sortNewest: 'Most recent',
    sortDifficulty: 'Difficulty',
    sortDeadline: 'Deadline',
    filterDomain: 'Domain',
    filterStatus: 'Status',
    empty: 'No quests match this filter.',
    emptyBody: 'Try a different filter, or wait for the next cycle.',
    selectPrompt: 'Select a quest to see its details.',
    history: 'History',
    createdOn: 'Detected on {date}',
    presentedOn: 'Presented on {date}',
    completedOn: 'Completed on {date}',
    postponedOn: 'Postponed on {date}',
    rejectedOn: 'Declined on {date}',
  },

  quest: {
    accept: 'Accept',
    decline: 'Decline',
    postpone: 'Postpone',
    complete: 'Mark complete',
    completePartial: 'Completed partially',
    viewDetails: 'View details',
    estimated: '{minutes} min',
    whyThis: 'Why this?',
    purpose: 'Purpose',
    steps: 'Steps',
    awarded: '+{xp} XP',
    actionError: 'That could not be saved. Nothing changed — try again.',
    difficulty: {
      trivial: 'Trivial',
      light: 'Light',
      moderate: 'Moderate',
      demanding: 'Demanding',
      severe: 'Severe',
    },
    states: {
      detected: 'Detected',
      offered: 'Available',
      accepted: 'In progress',
      completed: 'Complete',
      expired: 'Expired',
      rejected: 'Declined',
      postponed: 'Postponed',
      skipped: 'Skipped',
      archived: 'Archived',
    },
  },

  questType: {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    main: 'Main',
    side: 'Side',
    hidden: 'Hidden',
    chain: 'Chain',
    recovery: 'Recovery',
    exploration: 'Exploration',
    mastery: 'Mastery',
    challenge: 'Challenge',
    social: 'Social',
    project: 'Project',
    boss_preparation: 'Boss preparation',
    seasonal: 'Seasonal',
    milestone: 'Milestone',
    experiment: 'Architect experiment',
    user: 'User-created',
    daily_protocol: 'Daily protocol',
  },

  questDetail: {
    type: 'Type',
    description: 'Description',
    why: 'Why this quest exists',
    rationale: "The Architect's rationale",
    noRationale: 'No rationale recorded for this quest.',
    status: 'Status',
    difficulty: 'Difficulty',
    estimatedTime: 'Estimated time',
    deadline: 'Deadline',
    steps: 'Steps',
    optionalSteps: 'Optional steps',
    rewards: 'Rewards',
    domain: 'Domain',
    noSteps: 'No steps recorded.',
    reflection: 'Reflection',
    evidence: 'Evidence',
    completedAt: 'Completed at {date}',
    objectives: 'Objectives',
    objectivesProgress: '{completed} / {total} objectives',
    objectiveOptional: 'Optional',
    objectiveDone: 'Done',
    objectiveMarkDone: 'Mark done',
    objectiveUpdate: 'Update',
    objectiveSave: 'Save',
  },

  questEncounter: {
    eyebrow: 'New quest detected',
    decisionPrompt: 'Do you want to accept this quest?',
    accept: 'Accept quest',
    viewDetails: 'View details',
    adjust: 'Adjust',
    decline: 'Decline',
    postpone: 'Postpone',
    acceptedConfirm: 'Quest accepted',
    declinedConfirm: 'Quest declined',
    postponedConfirm: 'Quest postponed',
    purposeLabel: 'Purpose',
    difficultyLabel: 'Difficulty',
    deadlineLabel: 'Deadline',
    rewardsLabel: 'Reward',
    queueRemaining: '{count} more waiting',
    dismissHint: 'Press escape to decide later',
    preparedSummaryOne: '1 additional quest was prepared.',
    preparedSummaryMany: '{count} additional quests were prepared.',
    preparedSummaryReview: 'Review in Quests',
    preparedSummaryDismiss: 'Dismiss',
  },

  completion: {
    dialogTitle: 'Complete quest',
    degreeLabel: 'Completion',
    full: 'Complete',
    partial: 'Partial',
    reflectionLabel: 'Reflection (optional)',
    reflectionPlaceholder: 'What did you notice while doing this?',
    evidenceLabel: 'Evidence or result (optional)',
    evidencePlaceholder: 'A number, a link, a short note',
    submit: 'Confirm completion',
    cancel: 'Cancel',
    resultTitle: 'Quest complete',
    xpGained: 'Experience gained',
    progressSaved: 'Progress recorded',
    errorSaving: 'Progress could not be saved. No reward was applied.',
  },

  status: {
    title: 'Status',
    profileSection: 'Profile',
    ageLabel: 'Age',
    ageUnknown: 'Not provided',
    levelLabel: 'Level',
    totalXpLabel: 'Total XP',
    joinedLabel: 'Joined',
    completedQuestsLabel: 'Quests completed',
    achievementsUnlockedLabel: 'Achievements unlocked',
    domainsSection: 'Development domains',
    attributesSection: 'Attributes',
    attributesComingSoon:
      'Attributes will be calculated from evidence of domain activity, performance, and consistency. Calibration is not yet complete.',
    recentProgressSection: 'Recent progress',
  },

  achievements: {
    title: 'Achievements',
    tabAll: 'All',
    tabUnlocked: 'Unlocked',
    tabLocked: 'Locked',
    searchPlaceholder: 'Search achievements',
    noResults: 'No achievements match this search.',
    unlockedOn: 'Unlocked on {date}',
    stillLocked: 'Not yet unlocked',
    secretName: '???',
    secretDescription: 'A hidden achievement. Keep progressing to reveal it.',
    rarity: {
      standard: 'Standard',
      rare: 'Rare',
      legendary: 'Legendary',
    },
  },

  achievement: {
    unlocked: 'Achievement unlocked',
    rareUnlocked: 'Rare achievement',
    legendaryUnlocked: 'Legendary achievement',
    dismiss: 'Dismiss',
  },

  architect: {
    title: 'The Architect',
    subtitle: 'Local recommendation and rules layer',
    recommendationTitle: 'Current recommendation',
    recentQuestsTitle: 'Recently generated',
    acceptedLabel: 'Accepted',
    rejectedLabel: 'Declined',
    pendingLabel: 'Pending',
    prioritiesTitle: 'Current priorities',
    noPriorities: 'No priorities set yet. Configure them during onboarding or in Settings.',
    recalibrateButton: 'Recalibrate today',
    recalibrateConfirm: "Today's priorities were recalibrated.",
    recalibrateBody: 'Pending quests for today will be replaced with fresh alternatives.',
    offlineTitle: 'Operating offline',
    offlineExplanation:
      'The Architect currently runs entirely on this machine, using a deterministic local rules engine. No external service is contacted, and none is required.',
    aiStatusTitle: 'External intelligence',
    aiStatusOffline: 'Disabled. SYSTEM works completely without it.',
    privacyTitle: 'Privacy',
    privacyBody:
      'Nothing leaves this machine. If an external provider is enabled in the future, each data category will require separate, explicit consent.',
  },

  settings: {
    title: 'Settings',
    languageSection: 'Language',
    languageLabel: 'Application language',
    localePtBR: 'Português (Brasil)',
    localeEn: 'English',
    soundSection: 'Sound',
    soundEnabledLabel: 'Sound enabled',
    masterVolumeLabel: 'Master volume',
    interfaceVolumeLabel: 'Interface',
    eventsVolumeLabel: 'Events',
    cinematicVolumeLabel: 'Cinematics',
    presentationSection: 'Presentation',
    animationLabel: 'Animation intensity',
    animationFull: 'Full',
    animationReduced: 'Reduced',
    animationMinimal: 'Minimal',
    animationOff: 'Off',
    performanceModeLabel: 'Performance mode',
    performanceModeHelp: 'Reduces blur and shadow depth to lower GPU load.',
    questPresentationSection: 'Quest presentation',
    questPresentationLabel: 'New quest encounters',
    questPresentationFull: 'Cinematic',
    questPresentationFullHelp: 'Full presentation for significant quests, compact for routine ones.',
    questPresentationCompact: 'Always compact',
    questPresentationCompactHelp: 'A brief card for every new quest, without the full sequence.',
    questPresentationOff: 'Silent',
    questPresentationOffHelp: 'New quests simply appear in the list.',
    privacySection: 'Privacy',
    privacyBody:
      'SYSTEM is local-first. Your records stay on this machine. No account, no telemetry, no analytics.',
    dataSection: 'Data',
    dataLocationLabel: 'Database location',
    backupNowButton: 'Back up now',
    backupSuccess: 'Backup saved to {path}',
    backupError: 'The backup could not be completed.',
    maintenanceSection: 'Maintenance',
    maintenanceBody:
      'Check for quests generated as duplicates of each other — the same content, on the same day, never decided on. Nothing is ever deleted; duplicates are archived, and your decisions and history are always preserved.',
    maintenanceCheckButton: 'Check for duplicate quests',
    maintenanceNoneFound: 'No duplicates found.',
    maintenancePreviewSummary: '{count} redundant quests found. Reviewing before anything changes:',
    maintenanceGroupLine: '{title} — {count} redundant copies',
    maintenanceRepairButton: 'Archive redundant duplicates',
    maintenanceRepaired: '{count} redundant quests archived.',
    baselineSection: 'Physical baseline',
    baselineBody:
      'Optional, and editable at any time. Daily Protocol physical objectives are calibrated to 80% of what you report here — sustainable, not maximal. Leave a field blank and a conservative default is used instead.',
    baselinePushups: 'Comfortable push-ups in one set',
    baselineSquats: 'Comfortable squats in one set',
    baselinePlank: 'Comfortable plank hold (seconds)',
    baselineFrequency: 'Training days per week',
    baselineNotSet: 'Not set',
    baselineSave: 'Save baseline',
    baselineSaved: 'Baseline saved.',
    aboutSection: 'About',
    versionLabel: 'Version',
    schemaVersionLabel: 'Data schema',
  },

  comingSoon: {
    badge: 'In development',
    skillsTitle: 'Skills',
    skillsBody:
      'The skill tree will map demonstrated capability across every domain, unlocked through evidence rather than time spent. It depends on the mastery engine, which is the next milestone after this one.',
    bossesTitle: 'Bosses',
    bossesBody:
      'Bosses will turn your real exams, projects, and competitions into structured encounters with phases, weaknesses, and preparation chains. The foundation is designed in docs/GAME_SYSTEMS.md; implementation follows the mastery milestone.',
    timelineTitle: 'Timeline',
    timelineBody:
      'A year-by-year record of your evolution — classes, ranks, milestones, and reflections — becomes meaningful once enough history has accumulated and the analytics layer exists to summarise it.',
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

/**
 * The catalogue's key shape, with every leaf widened to `string`.
 *
 * `typeof en` alone would pin every leaf to its exact English literal (via
 * `as const`), which would make a translation catalogue a type error for
 * simply not being written in English. This preserves the part that should
 * be checked — every key present, nothing extra — while allowing any string
 * value.
 */
export type Messages = DeepStrings<typeof en>;

type DeepStrings<T> = T extends string ? string : { readonly [K in keyof T]: DeepStrings<T[K]> };

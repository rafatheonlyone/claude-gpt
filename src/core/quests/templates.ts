import type { Domain, QuestType } from '../domain/types';
import type { Difficulty } from '../progression/xp';

/**
 * Seed quest library for the deterministic rules engine.
 *
 * These are *templates*, not fixed content: the generator selects, filters and
 * calibrates them against the user's real schedule, goals and recovery. A
 * template that cannot fit the user's actual day is discarded rather than
 * merely ranked lower — see `docs/AI_ARCHITECT.md` §3.
 *
 * Every template carries the metadata the safety filter needs (`bodyAreas`,
 * `intensity`) so an injury or a low-recovery day can exclude it structurally
 * rather than relying on wording.
 */
export interface QuestTemplate {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Why this is worth doing. Shown to the user, never omitted. */
  readonly purpose: string;
  readonly domain: Domain;
  readonly questType: QuestType;
  readonly difficulty: Difficulty;
  readonly estimatedMinutes: number;
  /** Goal tags used for alignment scoring. */
  readonly tags: readonly string[];
  readonly steps: readonly string[];
  /** Body areas loaded, so injuries can exclude this template. */
  readonly bodyAreas?: readonly string[];
  /** Physical intensity, used to clamp workload on low-recovery days. */
  readonly intensity?: 'rest' | 'light' | 'moderate' | 'hard';
  /** Repeatable daily, or better spaced out. */
  readonly repeatable?: boolean;
}

export const QUEST_TEMPLATES: readonly QuestTemplate[] = [
  // ---------------------------------------------------------------- physical
  {
    id: 'phys.basketball.shooting_form',
    title: 'Shooting Form Session',
    description: 'Focused shooting practice from five spots, tracking makes out of ten at each.',
    purpose: 'Repeatable form work is what turns a good shot into a reliable one under pressure.',
    domain: 'physical',
    questType: 'daily',
    difficulty: 'moderate',
    estimatedMinutes: 40,
    tags: ['basketball', 'sport', 'technique'],
    bodyAreas: ['shoulders', 'legs'],
    intensity: 'moderate',
    repeatable: true,
    steps: [
      'Warm up close to the basket until the first ten feel clean',
      'Shoot ten from each of five spots',
      'Record makes at each spot',
      'Note which spot felt worst and why',
    ],
  },
  {
    id: 'phys.basketball.handling',
    title: 'Ball Handling Circuit',
    description: 'Stationary and moving handle work, weak hand emphasised.',
    purpose: 'Weak-hand control is the fastest route to being harder to defend.',
    domain: 'physical',
    questType: 'daily',
    difficulty: 'light',
    estimatedMinutes: 20,
    tags: ['basketball', 'sport', 'technique', 'coordination'],
    bodyAreas: ['arms', 'wrists'],
    intensity: 'light',
    repeatable: true,
    steps: [
      'Stationary pound dribbles, both hands',
      'Crossover and between-the-legs series',
      'Two minutes weak hand only, moving',
    ],
  },
  {
    id: 'phys.calisthenics.control',
    title: 'Calisthenics Control Work',
    description: 'Slow tempo bodyweight work prioritising control over repetitions.',
    purpose: 'Tempo and control build the tendon strength that heavier work later depends on.',
    domain: 'physical',
    questType: 'daily',
    difficulty: 'moderate',
    estimatedMinutes: 35,
    tags: ['calisthenics', 'strength', 'control'],
    bodyAreas: ['chest', 'arms', 'core'],
    intensity: 'moderate',
    repeatable: true,
    steps: [
      'Push-ups at a three-second lowering tempo',
      'Rows or pull-ups, full range, no swing',
      'Hollow-body hold',
      'Record sets, reps and how the last rep felt',
    ],
  },
  {
    id: 'phys.strength.session',
    title: 'Strength Session',
    description: 'Compound strength work with technique as the primary metric.',
    purpose:
      'At your stage, consistent technique under moderate load builds more than chasing maximums.',
    domain: 'physical',
    questType: 'daily',
    difficulty: 'demanding',
    estimatedMinutes: 60,
    tags: ['strength', 'training'],
    bodyAreas: ['legs', 'back', 'chest'],
    intensity: 'hard',
    repeatable: true,
    steps: [
      'Warm up thoroughly',
      'Main lift: work sets with a rep or two left in reserve',
      'Accessory work',
      'Log the loads and how clean each set felt',
    ],
  },
  {
    id: 'phys.boxing.footwork',
    title: 'Boxing Footwork',
    description: 'Stance, movement and balance drills. No contact.',
    purpose: 'Footwork is the foundation everything else in boxing is built on.',
    domain: 'physical',
    questType: 'daily',
    difficulty: 'light',
    estimatedMinutes: 25,
    tags: ['boxing', 'sport', 'coordination'],
    bodyAreas: ['legs'],
    intensity: 'light',
    repeatable: true,
    steps: [
      'Stance checks in a mirror',
      'Forward, back and lateral movement holding stance',
      'Pivot drills',
      'Shadow rounds focused only on feet',
    ],
  },
  {
    id: 'phys.mobility.session',
    title: 'Mobility Work',
    description: 'Targeted mobility for hips, shoulders and ankles.',
    purpose: 'Mobility is what keeps training available to you over years rather than months.',
    domain: 'physical',
    questType: 'daily',
    difficulty: 'light',
    estimatedMinutes: 15,
    tags: ['mobility', 'recovery', 'longevity'],
    intensity: 'light',
    repeatable: true,
    steps: ['Hip sequence', 'Shoulder sequence', 'Ankle sequence', 'Note anything that felt tight'],
  },
  {
    id: 'phys.conditioning',
    title: 'Conditioning Work',
    description: 'Cardiovascular conditioning at a sustainable effort.',
    purpose: 'Aerobic base improves recovery between hard efforts in every other sport you do.',
    domain: 'physical',
    questType: 'daily',
    difficulty: 'moderate',
    estimatedMinutes: 30,
    tags: ['cardio', 'conditioning', 'endurance'],
    bodyAreas: ['legs'],
    intensity: 'moderate',
    repeatable: true,
    steps: ['Warm up', 'Main effort at a pace you could hold a conversation at', 'Cool down'],
  },

  // ---------------------------------------------------------------- academic
  {
    id: 'acad.math.problem_set',
    title: 'Mathematics Problem Set',
    description: 'Work through problems slightly above your comfortable level.',
    purpose: 'Difficulty just past comfortable is where mathematical ability actually moves.',
    domain: 'academic',
    questType: 'daily',
    difficulty: 'moderate',
    estimatedMinutes: 45,
    tags: ['mathematics', 'school', 'competition', 'problem_solving'],
    repeatable: true,
    steps: [
      'Select problems you cannot immediately see the route through',
      'Work without hints for at least fifteen minutes per problem',
      'Record the ones you could not finish',
      'Review solutions only after genuinely attempting',
    ],
  },
  {
    id: 'acad.math.error_review',
    title: 'Error Review',
    description: 'Revisit problems you previously got wrong and re-solve them unaided.',
    purpose:
      'Re-solving past errors is the single highest-return study action, and the most skipped.',
    domain: 'academic',
    questType: 'weekly',
    difficulty: 'moderate',
    estimatedMinutes: 40,
    tags: ['mathematics', 'school', 'competition', 'exam_technique'],
    repeatable: true,
    steps: [
      'Collect recent incorrect answers',
      'Re-solve each without looking at the correction',
      'Classify each error: concept, method, or carelessness',
      'Note the pattern',
    ],
  },
  {
    id: 'acad.math.competition_practice',
    title: 'Competition Problem',
    description: 'One olympiad-style problem, given real time and real effort.',
    purpose: 'Competition problems train patience with difficulty, which transfers everywhere.',
    domain: 'academic',
    questType: 'challenge',
    difficulty: 'demanding',
    estimatedMinutes: 60,
    tags: ['mathematics', 'competition', 'problem_solving'],
    repeatable: true,
    steps: [
      'Choose one problem above your current level',
      'Work for at least forty minutes before consulting anything',
      'Write up your reasoning, including the routes that failed',
    ],
  },
  {
    id: 'acad.english.advanced_input',
    title: 'Advanced English Input',
    description: 'Read or listen to demanding English material and capture new language.',
    purpose:
      'At C1 and above, progress comes from material that is genuinely hard, not from review.',
    domain: 'academic',
    questType: 'daily',
    difficulty: 'light',
    estimatedMinutes: 25,
    tags: ['english', 'language', 'reading', 'exchange'],
    repeatable: true,
    steps: [
      'Choose material written for native speakers',
      'Read or listen actively',
      'Capture five expressions you would not have produced yourself',
      'Use two of them in a sentence of your own',
    ],
  },
  {
    id: 'acad.english.production',
    title: 'English Writing',
    description: 'Write a structured piece in English and revise it once.',
    purpose:
      'Production, not consumption, is what moves C1 toward C2 — and revision is where it happens.',
    domain: 'academic',
    questType: 'weekly',
    difficulty: 'moderate',
    estimatedMinutes: 40,
    tags: ['english', 'language', 'writing', 'exchange'],
    repeatable: true,
    steps: [
      'Write at least three hundred words on a topic you care about',
      'Leave it for a few minutes',
      'Revise for precision, not length',
    ],
  },
  {
    id: 'acad.study.spaced_review',
    title: 'Spaced Review',
    description: 'Review material from previous weeks rather than only what is current.',
    purpose: 'Reviewing at increasing intervals is what converts studying into retention.',
    domain: 'academic',
    questType: 'daily',
    difficulty: 'light',
    estimatedMinutes: 20,
    tags: ['school', 'memory', 'exam_technique'],
    repeatable: true,
    steps: [
      'Choose material from at least a week ago',
      'Recall it before opening notes',
      'Only then check what you missed',
    ],
  },

  // --------------------------------------------------------------- technical
  {
    id: 'tech.build.feature',
    title: 'Ship One Feature',
    description: 'Implement and complete one small feature in a real project.',
    purpose: 'Finished features teach far more than started ones. Completion is the skill.',
    domain: 'technical',
    questType: 'project',
    difficulty: 'demanding',
    estimatedMinutes: 90,
    tags: ['programming', 'web', 'project', 'frontend'],
    repeatable: true,
    steps: [
      'Define what "done" means before starting',
      'Implement it',
      'Verify it actually works',
      'Commit with a message explaining why, not what',
    ],
  },
  {
    id: 'tech.frontend.craft',
    title: 'Interface Craft',
    description: 'Rebuild one interface component to a higher standard than needed.',
    purpose:
      'Deliberately exceeding requirements on a small surface is how visual taste becomes skill.',
    domain: 'technical',
    questType: 'mastery',
    difficulty: 'moderate',
    estimatedMinutes: 60,
    tags: ['programming', 'frontend', 'web', 'design'],
    repeatable: true,
    steps: [
      'Pick one component that works but is not good',
      'Improve spacing, states, motion and keyboard access',
      'Check it with the keyboard alone',
    ],
  },
  {
    id: 'tech.fundamentals.read_source',
    title: 'Read Real Source Code',
    description: 'Read code written by someone better than you and understand one decision in it.',
    purpose: 'Reading strong code is the fastest way to acquire judgement you have not earned yet.',
    domain: 'technical',
    questType: 'exploration',
    difficulty: 'moderate',
    estimatedMinutes: 40,
    tags: ['programming', 'architecture', 'learning'],
    repeatable: true,
    steps: [
      'Choose a well-regarded open-source project',
      'Pick one file and read it properly',
      'Write down one decision you would not have made, and why they might have',
    ],
  },
  {
    id: 'tech.security.fundamentals',
    title: 'Security Fundamentals',
    description: 'Study one specific class of vulnerability and how it is actually prevented.',
    purpose: 'Security understanding compounds, and it makes you a better engineer generally.',
    domain: 'technical',
    questType: 'daily',
    difficulty: 'moderate',
    estimatedMinutes: 40,
    tags: ['security', 'programming', 'learning'],
    repeatable: true,
    steps: [
      'Choose one vulnerability class',
      'Understand the mechanism, not just the name',
      'Find how it is prevented in code you have written',
    ],
  },
  {
    id: 'tech.debug.deliberate',
    title: 'Deliberate Debugging',
    description: 'Fix one bug by reasoning to the cause rather than by trial and error.',
    purpose: 'Debugging by reasoning rather than guessing is what separates levels of engineer.',
    domain: 'technical',
    questType: 'mastery',
    difficulty: 'moderate',
    estimatedMinutes: 45,
    tags: ['programming', 'problem_solving'],
    repeatable: true,
    steps: [
      'Reproduce it reliably first',
      'Form a hypothesis before changing anything',
      'Confirm the cause before applying the fix',
      'Add a test that would have caught it',
    ],
  },

  // ------------------------------------------------------------------ mental
  {
    id: 'mental.chess.tactics',
    title: 'Chess Tactics',
    description: 'Work through tactical puzzles, calculating fully before moving.',
    purpose:
      'Calculating to the end before committing is a habit that transfers well beyond chess.',
    domain: 'mental',
    questType: 'daily',
    difficulty: 'light',
    estimatedMinutes: 20,
    tags: ['chess', 'strategy', 'focus', 'problem_solving'],
    repeatable: true,
    steps: [
      'Solve puzzles without moving pieces first',
      'Calculate the full line before committing',
      'Review every one you got wrong',
    ],
  },
  {
    id: 'mental.chess.game_review',
    title: 'Review One Game',
    description: 'Analyse one of your own games before consulting an engine.',
    purpose: 'Finding your own mistakes is what improves judgement; being told them is not.',
    domain: 'mental',
    questType: 'weekly',
    difficulty: 'moderate',
    estimatedMinutes: 35,
    tags: ['chess', 'strategy', 'review'],
    repeatable: true,
    steps: [
      'Replay the game and mark where you think it turned',
      'Write what you believed at that moment',
      'Only then check with an engine',
    ],
  },
  {
    id: 'mental.reading.session',
    title: 'Deep Reading',
    description: 'Read a book without a device within reach.',
    purpose: 'Sustained attention is trainable, and reading is the most reliable way to train it.',
    domain: 'mental',
    questType: 'daily',
    difficulty: 'light',
    estimatedMinutes: 30,
    tags: ['reading', 'focus', 'knowledge'],
    repeatable: true,
    steps: [
      'Put the phone in another room',
      'Read continuously',
      'Write two sentences on what stayed with you',
    ],
  },
  {
    id: 'mental.focus.single_task',
    title: 'Single-Task Block',
    description: 'One task, one block, no switching.',
    purpose: 'Attention is a trainable capacity, and switching is what erodes it.',
    domain: 'mental',
    questType: 'daily',
    difficulty: 'moderate',
    estimatedMinutes: 45,
    tags: ['focus', 'discipline', 'productivity'],
    repeatable: true,
    steps: [
      'Decide the single objective before starting',
      'Work without switching',
      'Write down distractions instead of following them',
    ],
  },
  {
    id: 'mental.reflection.weekly',
    title: 'Weekly Reflection',
    description: 'Review the week honestly: what moved, what did not, what to change.',
    purpose: 'Reflection is what converts activity into direction.',
    domain: 'mental',
    questType: 'weekly',
    difficulty: 'light',
    estimatedMinutes: 20,
    tags: ['reflection', 'planning', 'discipline'],
    repeatable: true,
    steps: [
      'What actually moved this week?',
      'What did not, and was it the plan or the execution?',
      'One thing to change next week',
    ],
  },

  // ---------------------------------------------------------------- creative
  {
    id: 'creative.build.personal',
    title: 'Build Something Unnecessary',
    description: 'Make something with no purpose beyond wanting it to exist.',
    purpose: 'Work done without justification is where original taste develops.',
    domain: 'creative',
    questType: 'exploration',
    difficulty: 'moderate',
    estimatedMinutes: 60,
    tags: ['creativity', 'project', 'design'],
    repeatable: true,
    steps: ['Choose something you find interesting', 'Build a rough version', 'Keep or discard it'],
  },
  {
    id: 'creative.write.thinking',
    title: 'Write to Think',
    description: 'Write through a problem or idea until it is clearer than when you started.',
    purpose: 'Writing exposes gaps in reasoning that thinking alone conceals.',
    domain: 'creative',
    questType: 'daily',
    difficulty: 'light',
    estimatedMinutes: 25,
    tags: ['writing', 'creativity', 'reflection'],
    repeatable: true,
    steps: [
      'Pick something you have not resolved',
      'Write until it is clearer, not until it is long',
    ],
  },

  // ------------------------------------------------------------------ social
  {
    id: 'social.explain',
    title: 'Explain Something You Know',
    description: 'Teach one concept to another person, plainly.',
    purpose: 'Explaining exposes exactly where your understanding is thinner than you thought.',
    domain: 'social',
    questType: 'social',
    difficulty: 'light',
    estimatedMinutes: 20,
    tags: ['communication', 'teaching', 'confidence'],
    repeatable: true,
    steps: [
      'Choose something you understand well',
      'Explain it without jargon',
      'Answer questions',
    ],
  },
  {
    id: 'social.speak_up',
    title: 'Speak First',
    description: 'Contribute early in a group setting rather than waiting.',
    purpose: 'Confidence in groups is built by repetition, and speaking early is the hard part.',
    domain: 'social',
    questType: 'challenge',
    difficulty: 'moderate',
    estimatedMinutes: 15,
    tags: ['confidence', 'communication', 'leadership'],
    repeatable: true,
    steps: ['Contribute within the first few minutes', 'Note how it actually went afterwards'],
  },

  // --------------------------------------------------------------- financial
  {
    id: 'finance.learn.fundamentals',
    title: 'Financial Fundamentals',
    description: 'Study one concept in how money, value or business actually works.',
    purpose: 'Financial understanding compounds over decades, and starting early is the advantage.',
    domain: 'financial',
    questType: 'daily',
    difficulty: 'light',
    estimatedMinutes: 25,
    tags: ['finance', 'business', 'learning'],
    repeatable: true,
    steps: [
      'Pick one concept you cannot currently explain',
      'Understand it well enough to explain simply',
    ],
  },

  // ---------------------------------------------------------------- recovery
  // Recovery quests award normal XP. Rest is progression, not its absence.
  {
    id: 'recovery.sleep_protection',
    title: 'Protect Tonight',
    description: 'Set a wind-down point tonight and keep it.',
    purpose:
      'Sleep is where training and study are consolidated. Protecting it protects everything else.',
    domain: 'recovery',
    questType: 'recovery',
    difficulty: 'light',
    estimatedMinutes: 10,
    tags: ['sleep', 'recovery', 'health'],
    intensity: 'rest',
    repeatable: true,
    steps: ['Decide a wind-down time', 'Screens away at that point', 'Note how you feel tomorrow'],
  },
  {
    id: 'recovery.rest_day',
    title: 'Deliberate Rest',
    description: 'Take a genuine rest day from hard training.',
    purpose: 'Adaptation happens during rest, not during work. A rest day is a training decision.',
    domain: 'recovery',
    questType: 'recovery',
    difficulty: 'light',
    estimatedMinutes: 5,
    tags: ['recovery', 'health', 'longevity'],
    intensity: 'rest',
    repeatable: true,
    steps: ['No hard training today', 'Light movement only if you want it', 'Note how you feel'],
  },
  {
    id: 'recovery.hydration_meals',
    title: 'Fuel Consistently',
    description: 'Eat regular meals and stay hydrated through the day.',
    purpose:
      'Consistent fuelling supports training, focus and mood more than any single meal does.',
    domain: 'recovery',
    questType: 'recovery',
    difficulty: 'light',
    estimatedMinutes: 5,
    tags: ['nutrition', 'health', 'consistency'],
    intensity: 'rest',
    repeatable: true,
    steps: ['Eat at regular intervals', 'Keep water available', 'Note energy across the day'],
  },
];

export function templateById(id: string): QuestTemplate | undefined {
  return QUEST_TEMPLATES.find((t) => t.id === id);
}

import type { Domain, QuestType } from '../domain/types';
import type { Difficulty } from '../progression/xp';
import type { ContentLocale } from '../content-locale';

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
 *
 * Content is authored in both English and Brazilian Portuguese (ADR-0007).
 * English fields are the source of truth for authoring; `*Pt` fields carry the
 * translation and must stay in sync — checked by `templates.test.ts`.
 */
export interface QuestTemplate {
  readonly id: string;
  readonly title: string;
  readonly titlePt: string;
  readonly description: string;
  readonly descriptionPt: string;
  /** Why this is worth doing. Shown to the user, never omitted. */
  readonly purpose: string;
  readonly purposePt: string;
  readonly domain: Domain;
  readonly questType: QuestType;
  readonly difficulty: Difficulty;
  readonly estimatedMinutes: number;
  /** Goal tags used for alignment scoring. */
  readonly tags: readonly string[];
  readonly steps: readonly string[];
  readonly stepsPt: readonly string[];
  /** Body areas loaded, so injuries can exclude this template. */
  readonly bodyAreas?: readonly string[];
  /** Physical intensity, used to clamp workload on low-recovery days. */
  readonly intensity?: 'rest' | 'light' | 'moderate' | 'hard';
  /** Repeatable daily, or better spaced out. */
  readonly repeatable?: boolean;
}

/** Localized display content for a template, resolved from the raw fields. */
export interface LocalizedQuestContent {
  readonly title: string;
  readonly description: string;
  readonly purpose: string;
  readonly steps: readonly string[];
}

export function localizeTemplate(
  template: QuestTemplate,
  locale: ContentLocale,
): LocalizedQuestContent {
  if (locale === 'en') {
    return {
      title: template.title,
      description: template.description,
      purpose: template.purpose,
      steps: template.steps,
    };
  }
  return {
    title: template.titlePt,
    description: template.descriptionPt,
    purpose: template.purposePt,
    steps: template.stepsPt,
  };
}

export const QUEST_TEMPLATES: readonly QuestTemplate[] = [
  // ---------------------------------------------------------------- physical
  {
    id: 'phys.basketball.shooting_form',
    title: 'Shooting Form Session',
    titlePt: 'Sessão de Fundamento de Arremesso',
    description: 'Focused shooting practice from five spots, tracking makes out of ten at each.',
    descriptionPt:
      'Prática focada de arremesso a partir de cinco posições, registrando acertos em dez tentativas em cada uma.',
    purpose: 'Repeatable form work is what turns a good shot into a reliable one under pressure.',
    purposePt:
      'O trabalho repetido de fundamento é o que transforma um bom arremesso em um arremesso confiável sob pressão.',
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
    stepsPt: [
      'Aqueça perto da cesta até os dez primeiros saírem limpos',
      'Arremesse dez vezes em cada uma das cinco posições',
      'Registre os acertos em cada posição',
      'Anote qual posição foi pior e por quê',
    ],
  },
  {
    id: 'phys.basketball.handling',
    title: 'Ball Handling Circuit',
    titlePt: 'Circuito de Manejo de Bola',
    description: 'Stationary and moving handle work, weak hand emphasised.',
    descriptionPt: 'Trabalho de manejo parado e em movimento, com ênfase na mão fraca.',
    purpose: 'Weak-hand control is the fastest route to being harder to defend.',
    purposePt: 'O controle com a mão fraca é o caminho mais rápido para se tornar mais difícil de marcar.',
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
    stepsPt: [
      'Quique parado com as duas mãos',
      'Série de crossover e entre as pernas',
      'Dois minutos só com a mão fraca, em movimento',
    ],
  },
  {
    id: 'phys.calisthenics.control',
    title: 'Calisthenics Control Work',
    titlePt: 'Trabalho de Controle em Calistenia',
    description: 'Slow tempo bodyweight work prioritising control over repetitions.',
    descriptionPt: 'Trabalho de peso corporal em ritmo lento, priorizando controle sobre repetições.',
    purpose: 'Tempo and control build the tendon strength that heavier work later depends on.',
    purposePt:
      'Ritmo e controle constroem a força de tendão da qual o trabalho mais pesado depende mais tarde.',
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
    stepsPt: [
      'Flexões com descida de três segundos',
      'Remadas ou barras, amplitude total, sem embalo',
      'Prancha em hollow body',
      'Registre séries, repetições e como a última repetição se sentiu',
    ],
  },
  {
    id: 'phys.strength.session',
    title: 'Strength Session',
    titlePt: 'Sessão de Força',
    description: 'Compound strength work with technique as the primary metric.',
    descriptionPt: 'Trabalho de força com exercícios compostos, priorizando a técnica.',
    purpose:
      'At your stage, consistent technique under moderate load builds more than chasing maximums.',
    purposePt:
      'Na sua fase, técnica consistente sob carga moderada constrói mais do que perseguir cargas máximas.',
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
    stepsPt: [
      'Aqueça bem',
      'Exercício principal: séries de trabalho deixando uma ou duas repetições na reserva',
      'Exercícios acessórios',
      'Registre as cargas e como cada série se sentiu',
    ],
  },
  {
    id: 'phys.boxing.footwork',
    title: 'Boxing Footwork',
    titlePt: 'Jogo de Pernas no Boxe',
    description: 'Stance, movement and balance drills. No contact.',
    descriptionPt: 'Exercícios de postura, deslocamento e equilíbrio. Sem contato.',
    purpose: 'Footwork is the foundation everything else in boxing is built on.',
    purposePt: 'O jogo de pernas é a base sobre a qual tudo o mais no boxe é construído.',
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
    stepsPt: [
      'Verificação de postura no espelho',
      'Deslocamento à frente, atrás e lateral mantendo a postura',
      'Exercícios de pivô',
      'Rounds de sombra focados apenas nos pés',
    ],
  },
  {
    id: 'phys.mobility.session',
    title: 'Mobility Work',
    titlePt: 'Trabalho de Mobilidade',
    description: 'Targeted mobility for hips, shoulders and ankles.',
    descriptionPt: 'Mobilidade direcionada para quadris, ombros e tornozelos.',
    purpose: 'Mobility is what keeps training available to you over years rather than months.',
    purposePt: 'Mobilidade é o que mantém o treino disponível para você por anos, não apenas meses.',
    domain: 'physical',
    questType: 'daily',
    difficulty: 'light',
    estimatedMinutes: 15,
    tags: ['mobility', 'recovery', 'longevity'],
    intensity: 'light',
    repeatable: true,
    steps: ['Hip sequence', 'Shoulder sequence', 'Ankle sequence', 'Note anything that felt tight'],
    stepsPt: [
      'Sequência de quadril',
      'Sequência de ombro',
      'Sequência de tornozelo',
      'Anote qualquer região que sentiu travada',
    ],
  },
  {
    id: 'phys.conditioning',
    title: 'Conditioning Work',
    titlePt: 'Trabalho de Condicionamento',
    description: 'Cardiovascular conditioning at a sustainable effort.',
    descriptionPt: 'Condicionamento cardiovascular em um esforço sustentável.',
    purpose: 'Aerobic base improves recovery between hard efforts in every other sport you do.',
    purposePt: 'A base aeróbica melhora a recuperação entre esforços intensos em qualquer outro esporte.',
    domain: 'physical',
    questType: 'daily',
    difficulty: 'moderate',
    estimatedMinutes: 30,
    tags: ['cardio', 'conditioning', 'endurance'],
    bodyAreas: ['legs'],
    intensity: 'moderate',
    repeatable: true,
    steps: ['Warm up', 'Main effort at a pace you could hold a conversation at', 'Cool down'],
    stepsPt: [
      'Aqueça',
      'Esforço principal em um ritmo em que você conseguiria manter uma conversa',
      'Desaquecimento',
    ],
  },

  // ---------------------------------------------------------------- academic
  {
    id: 'acad.math.problem_set',
    title: 'Mathematics Problem Set',
    titlePt: 'Lista de Problemas de Matemática',
    description: 'Work through problems slightly above your comfortable level.',
    descriptionPt: 'Resolva problemas um pouco acima do seu nível confortável.',
    purpose: 'Difficulty just past comfortable is where mathematical ability actually moves.',
    purposePt:
      'É logo além do confortável que a habilidade matemática realmente avança.',
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
    stepsPt: [
      'Escolha problemas cujo caminho você não enxerga de imediato',
      'Trabalhe sem consultar dicas por pelo menos quinze minutos em cada problema',
      'Registre os que não conseguiu terminar',
      'Revise as soluções somente depois de tentar de verdade',
    ],
  },
  {
    id: 'acad.math.error_review',
    title: 'Error Review',
    titlePt: 'Revisão de Erros',
    description: 'Revisit problems you previously got wrong and re-solve them unaided.',
    descriptionPt: 'Retome problemas que você errou antes e resolva-os novamente sem ajuda.',
    purpose:
      'Re-solving past errors is the single highest-return study action, and the most skipped.',
    purposePt:
      'Resolver de novo os erros do passado é a ação de estudo com o maior retorno — e a mais ignorada.',
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
    stepsPt: [
      'Reúna respostas erradas recentes',
      'Resolva cada uma de novo sem olhar a correção',
      'Classifique cada erro: conceito, método ou descuido',
      'Anote o padrão',
    ],
  },
  {
    id: 'acad.math.competition_practice',
    title: 'Competition Problem',
    titlePt: 'Problema de Olimpíada',
    description: 'One olympiad-style problem, given real time and real effort.',
    descriptionPt: 'Um problema em estilo olímpico, com tempo real e esforço real.',
    purpose: 'Competition problems train patience with difficulty, which transfers everywhere.',
    purposePt: 'Problemas de competição treinam paciência com a dificuldade, o que se transfere para tudo.',
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
    stepsPt: [
      'Escolha um problema acima do seu nível atual',
      'Trabalhe por pelo menos quarenta minutos antes de consultar qualquer coisa',
      'Escreva seu raciocínio, incluindo os caminhos que falharam',
    ],
  },
  {
    id: 'acad.english.advanced_input',
    title: 'Advanced English Input',
    titlePt: 'Imersão Avançada em Inglês',
    description: 'Read or listen to demanding English material and capture new language.',
    descriptionPt: 'Leia ou ouça material desafiador em inglês e capture linguagem nova.',
    purpose:
      'At C1 and above, progress comes from material that is genuinely hard, not from review.',
    purposePt: 'No nível C1 e acima, o progresso vem de material genuinamente difícil, não de revisão.',
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
    stepsPt: [
      'Escolha material escrito para falantes nativos',
      'Leia ou ouça de forma ativa',
      'Capture cinco expressões que você não teria produzido sozinho',
      'Use duas delas em uma frase sua',
    ],
  },
  {
    id: 'acad.english.production',
    title: 'English Writing',
    titlePt: 'Produção Escrita em Inglês',
    description: 'Write a structured piece in English and revise it once.',
    descriptionPt: 'Escreva um texto estruturado em inglês e revise-o uma vez.',
    purpose:
      'Production, not consumption, is what moves C1 toward C2 — and revision is where it happens.',
    purposePt:
      'Produção, não consumo, é o que leva de C1 a C2 — e é na revisão que isso acontece.',
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
    stepsPt: [
      'Escreva pelo menos trezentas palavras sobre um tema que importa para você',
      'Deixe descansar por alguns minutos',
      'Revise buscando precisão, não extensão',
    ],
  },
  {
    id: 'acad.study.spaced_review',
    title: 'Spaced Review',
    titlePt: 'Revisão Espaçada',
    description: 'Review material from previous weeks rather than only what is current.',
    descriptionPt: 'Revise material de semanas anteriores, não apenas o que é atual.',
    purpose: 'Reviewing at increasing intervals is what converts studying into retention.',
    purposePt: 'Revisar em intervalos crescentes é o que converte estudo em retenção.',
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
    stepsPt: [
      'Escolha material de pelo menos uma semana atrás',
      'Tente recordar antes de abrir as anotações',
      'Só então confira o que você esqueceu',
    ],
  },

  // --------------------------------------------------------------- technical
  {
    id: 'tech.build.feature',
    title: 'Ship One Feature',
    titlePt: 'Entregue uma Funcionalidade',
    description: 'Implement and complete one small feature in a real project.',
    descriptionPt: 'Implemente e finalize uma pequena funcionalidade em um projeto real.',
    purpose: 'Finished features teach far more than started ones. Completion is the skill.',
    purposePt: 'Funcionalidades terminadas ensinam muito mais que as iniciadas. Terminar é a habilidade.',
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
    stepsPt: [
      'Defina o que significa "pronto" antes de começar',
      'Implemente',
      'Verifique que realmente funciona',
      'Faça o commit com uma mensagem explicando o porquê, não o quê',
    ],
  },
  {
    id: 'tech.frontend.craft',
    title: 'Interface Craft',
    titlePt: 'Refinamento de Interface',
    description: 'Rebuild one interface component to a higher standard than needed.',
    descriptionPt: 'Reconstrua um componente de interface com um padrão maior do que o necessário.',
    purpose:
      'Deliberately exceeding requirements on a small surface is how visual taste becomes skill.',
    purposePt:
      'Superar deliberadamente os requisitos em uma pequena superfície é como o bom gosto visual vira habilidade.',
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
    stepsPt: [
      'Escolha um componente que funciona mas não é bom',
      'Melhore espaçamento, estados, movimento e acesso por teclado',
      'Verifique usando apenas o teclado',
    ],
  },
  {
    id: 'tech.fundamentals.read_source',
    title: 'Read Real Source Code',
    titlePt: 'Leia Código-Fonte Real',
    description: 'Read code written by someone better than you and understand one decision in it.',
    descriptionPt: 'Leia código escrito por alguém melhor que você e entenda uma decisão nele.',
    purpose: 'Reading strong code is the fastest way to acquire judgement you have not earned yet.',
    purposePt: 'Ler código forte é a forma mais rápida de adquirir um julgamento que você ainda não tem.',
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
    stepsPt: [
      'Escolha um projeto open-source bem conceituado',
      'Escolha um arquivo e leia-o com atenção',
      'Anote uma decisão que você não teria tomado, e por que talvez eles tenham tomado',
    ],
  },
  {
    id: 'tech.security.fundamentals',
    title: 'Security Fundamentals',
    titlePt: 'Fundamentos de Segurança',
    description: 'Study one specific class of vulnerability and how it is actually prevented.',
    descriptionPt: 'Estude uma classe específica de vulnerabilidade e como ela é de fato prevenida.',
    purpose: 'Security understanding compounds, and it makes you a better engineer generally.',
    purposePt:
      'O entendimento de segurança se acumula com o tempo, e torna você um engenheiro melhor de forma geral.',
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
    stepsPt: [
      'Escolha uma classe de vulnerabilidade',
      'Entenda o mecanismo, não apenas o nome',
      'Encontre como ela é prevenida em código que você já escreveu',
    ],
  },
  {
    id: 'tech.debug.deliberate',
    title: 'Deliberate Debugging',
    titlePt: 'Depuração Deliberada',
    description: 'Fix one bug by reasoning to the cause rather than by trial and error.',
    descriptionPt: 'Corrija um bug raciocinando até a causa, em vez de tentativa e erro.',
    purpose: 'Debugging by reasoning rather than guessing is what separates levels of engineer.',
    purposePt: 'Depurar por raciocínio em vez de tentativa é o que separa níveis de engenheiro.',
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
    stepsPt: [
      'Primeiro, reproduza o erro de forma confiável',
      'Formule uma hipótese antes de mudar qualquer coisa',
      'Confirme a causa antes de aplicar a correção',
      'Adicione um teste que teria detectado o problema',
    ],
  },

  // ------------------------------------------------------------------ mental
  {
    id: 'mental.chess.tactics',
    title: 'Chess Tactics',
    titlePt: 'Táticas de Xadrez',
    description: 'Work through tactical puzzles, calculating fully before moving.',
    descriptionPt: 'Resolva quebra-cabeças táticos, calculando por completo antes de mover.',
    purpose:
      'Calculating to the end before committing is a habit that transfers well beyond chess.',
    purposePt:
      'Calcular até o fim antes de se comprometer é um hábito que se transfere bem além do xadrez.',
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
    stepsPt: [
      'Resolva os quebra-cabeças sem mover as peças primeiro',
      'Calcule a linha completa antes de se comprometer',
      'Revise todos os que você errou',
    ],
  },
  {
    id: 'mental.chess.game_review',
    title: 'Review One Game',
    titlePt: 'Revise uma Partida',
    description: 'Analyse one of your own games before consulting an engine.',
    descriptionPt: 'Analise uma das suas próprias partidas antes de consultar um motor de análise.',
    purpose: 'Finding your own mistakes is what improves judgement; being told them is not.',
    purposePt: 'Encontrar seus próprios erros é o que melhora o julgamento; ser informado deles não é.',
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
    stepsPt: [
      'Reproduza a partida e marque onde você acha que ela virou',
      'Escreva o que você acreditava naquele momento',
      'Só então confira com um motor de análise',
    ],
  },
  {
    id: 'mental.reading.session',
    title: 'Deep Reading',
    titlePt: 'Leitura Profunda',
    description: 'Read a book without a device within reach.',
    descriptionPt: 'Leia um livro sem nenhum dispositivo ao alcance.',
    purpose: 'Sustained attention is trainable, and reading is the most reliable way to train it.',
    purposePt: 'Atenção sustentada é treinável, e a leitura é a forma mais confiável de treiná-la.',
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
    stepsPt: [
      'Deixe o celular em outro cômodo',
      'Leia de forma contínua',
      'Escreva duas frases sobre o que ficou com você',
    ],
  },
  {
    id: 'mental.focus.single_task',
    title: 'Single-Task Block',
    titlePt: 'Bloco de Tarefa Única',
    description: 'One task, one block, no switching.',
    descriptionPt: 'Uma tarefa, um bloco de tempo, sem trocar.',
    purpose: 'Attention is a trainable capacity, and switching is what erodes it.',
    purposePt: 'Atenção é uma capacidade treinável, e trocar de tarefa é o que a corrói.',
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
    stepsPt: [
      'Decida o único objetivo antes de começar',
      'Trabalhe sem trocar de tarefa',
      'Anote as distrações em vez de segui-las',
    ],
  },
  {
    id: 'mental.reflection.weekly',
    title: 'Weekly Reflection',
    titlePt: 'Reflexão Semanal',
    description: 'Review the week honestly: what moved, what did not, what to change.',
    descriptionPt: 'Revise a semana com honestidade: o que avançou, o que não avançou, o que mudar.',
    purpose: 'Reflection is what converts activity into direction.',
    purposePt: 'É a reflexão que converte atividade em direção.',
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
    stepsPt: [
      'O que realmente avançou nesta semana?',
      'O que não avançou — foi o plano ou a execução?',
      'Uma coisa para mudar na próxima semana',
    ],
  },

  // ---------------------------------------------------------------- creative
  {
    id: 'creative.build.personal',
    title: 'Build Something Unnecessary',
    titlePt: 'Construa Algo Desnecessário',
    description: 'Make something with no purpose beyond wanting it to exist.',
    descriptionPt: 'Faça algo sem outro propósito além de querer que exista.',
    purpose: 'Work done without justification is where original taste develops.',
    purposePt: 'É no trabalho feito sem justificativa que o gosto original se desenvolve.',
    domain: 'creative',
    questType: 'exploration',
    difficulty: 'moderate',
    estimatedMinutes: 60,
    tags: ['creativity', 'project', 'design'],
    repeatable: true,
    steps: ['Choose something you find interesting', 'Build a rough version', 'Keep or discard it'],
    stepsPt: [
      'Escolha algo que você acha interessante',
      'Construa uma versão rascunhada',
      'Mantenha ou descarte',
    ],
  },
  {
    id: 'creative.write.thinking',
    title: 'Write to Think',
    titlePt: 'Escreva para Pensar',
    description: 'Write through a problem or idea until it is clearer than when you started.',
    descriptionPt: 'Escreva sobre um problema ou ideia até que fique mais claro do que quando você começou.',
    purpose: 'Writing exposes gaps in reasoning that thinking alone conceals.',
    purposePt: 'A escrita expõe falhas de raciocínio que só pensar consegue esconder.',
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
    stepsPt: [
      'Escolha algo que você ainda não resolveu',
      'Escreva até ficar mais claro, não até ficar longo',
    ],
  },

  // ------------------------------------------------------------------ social
  {
    id: 'social.explain',
    title: 'Explain Something You Know',
    titlePt: 'Explique Algo que Você Sabe',
    description: 'Teach one concept to another person, plainly.',
    descriptionPt: 'Ensine um conceito a outra pessoa, de forma simples.',
    purpose: 'Explaining exposes exactly where your understanding is thinner than you thought.',
    purposePt: 'Explicar expõe exatamente onde seu entendimento é mais frágil do que você pensava.',
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
    stepsPt: [
      'Escolha algo que você entende bem',
      'Explique sem usar jargão',
      'Responda perguntas',
    ],
  },
  {
    id: 'social.speak_up',
    title: 'Speak First',
    titlePt: 'Fale Primeiro',
    description: 'Contribute early in a group setting rather than waiting.',
    descriptionPt: 'Contribua cedo em um grupo em vez de esperar.',
    purpose: 'Confidence in groups is built by repetition, and speaking early is the hard part.',
    purposePt: 'Confiança em grupo se constrói com repetição, e falar cedo é a parte difícil.',
    domain: 'social',
    questType: 'challenge',
    difficulty: 'moderate',
    estimatedMinutes: 15,
    tags: ['confidence', 'communication', 'leadership'],
    repeatable: true,
    steps: ['Contribute within the first few minutes', 'Note how it actually went afterwards'],
    stepsPt: [
      'Contribua nos primeiros minutos',
      'Anote depois como realmente foi',
    ],
  },

  // --------------------------------------------------------------- financial
  {
    id: 'finance.learn.fundamentals',
    title: 'Financial Fundamentals',
    titlePt: 'Fundamentos Financeiros',
    description: 'Study one concept in how money, value or business actually works.',
    descriptionPt: 'Estude um conceito sobre como dinheiro, valor ou negócios realmente funcionam.',
    purpose: 'Financial understanding compounds over decades, and starting early is the advantage.',
    purposePt:
      'O entendimento financeiro se acumula ao longo de décadas, e começar cedo é a vantagem.',
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
    stepsPt: [
      'Escolha um conceito que você não consegue explicar hoje',
      'Entenda-o bem o suficiente para explicar de forma simples',
    ],
  },

  // ---------------------------------------------------------------- recovery
  // Recovery quests award normal XP. Rest is progression, not its absence.
  {
    id: 'recovery.sleep_protection',
    title: 'Protect Tonight',
    titlePt: 'Proteja Esta Noite',
    description: 'Set a wind-down point tonight and keep it.',
    descriptionPt: 'Defina um horário para desacelerar esta noite e cumpra-o.',
    purpose:
      'Sleep is where training and study are consolidated. Protecting it protects everything else.',
    purposePt:
      'É durante o sono que treino e estudo são consolidados. Protegê-lo protege tudo o mais.',
    domain: 'recovery',
    questType: 'recovery',
    difficulty: 'light',
    estimatedMinutes: 10,
    tags: ['sleep', 'recovery', 'health'],
    intensity: 'rest',
    repeatable: true,
    steps: ['Decide a wind-down time', 'Screens away at that point', 'Note how you feel tomorrow'],
    stepsPt: [
      'Decida um horário para desacelerar',
      'Guarde as telas nesse horário',
      'Anote como você se sente amanhã',
    ],
  },
  {
    id: 'recovery.rest_day',
    title: 'Deliberate Rest',
    titlePt: 'Descanso Deliberado',
    description: 'Take a genuine rest day from hard training.',
    descriptionPt: 'Tire um dia genuíno de descanso do treino pesado.',
    purpose: 'Adaptation happens during rest, not during work. A rest day is a training decision.',
    purposePt: 'A adaptação acontece no descanso, não no esforço. Um dia de descanso é uma decisão de treino.',
    domain: 'recovery',
    questType: 'recovery',
    difficulty: 'light',
    estimatedMinutes: 5,
    tags: ['recovery', 'health', 'longevity'],
    intensity: 'rest',
    repeatable: true,
    steps: ['No hard training today', 'Light movement only if you want it', 'Note how you feel'],
    stepsPt: [
      'Nenhum treino pesado hoje',
      'Movimento leve apenas se você quiser',
      'Anote como você se sente',
    ],
  },
  {
    id: 'recovery.hydration_meals',
    title: 'Fuel Consistently',
    titlePt: 'Alimente-se com Consistência',
    description: 'Eat regular meals and stay hydrated through the day.',
    descriptionPt: 'Faça refeições regulares e mantenha-se hidratado ao longo do dia.',
    purpose:
      'Consistent fuelling supports training, focus and mood more than any single meal does.',
    purposePt:
      'Alimentação consistente sustenta treino, foco e humor mais do que qualquer refeição isolada.',
    domain: 'recovery',
    questType: 'recovery',
    difficulty: 'light',
    estimatedMinutes: 5,
    tags: ['nutrition', 'health', 'consistency'],
    intensity: 'rest',
    repeatable: true,
    steps: ['Eat at regular intervals', 'Keep water available', 'Note energy across the day'],
    stepsPt: [
      'Coma em intervalos regulares',
      'Mantenha água disponível',
      'Anote sua energia ao longo do dia',
    ],
  },
];

export function templateById(id: string): QuestTemplate | undefined {
  return QUEST_TEMPLATES.find((t) => t.id === id);
}

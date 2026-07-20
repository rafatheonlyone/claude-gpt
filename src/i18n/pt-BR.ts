/**
 * Catálogo de mensagens em português brasileiro — idioma padrão do SYSTEM.
 *
 * A forma das chaves deve ser idêntica à de `en.ts`, verificado por
 * `src/i18n/index.test.ts`. Ao adicionar uma chave, adicione a tradução
 * junto.
 *
 * Voz do Arquiteto (docs/AI_ARCHITECT.md §9): calma, precisa, direta. Nunca
 * lisonjeira, nunca dramática em momentos comuns, nunca urgente.
 */
import type { Messages } from './en';

export const ptBR: Messages = {
  app: {
    name: 'SYSTEM',
    loading: 'Inicializando',
    ready: 'Pronto',
  },

  boot: {
    detecting: 'Verificando',
    detected: 'Usuário compatível detectado',
    establishing: 'Estabelecendo registro local',
    begin: 'Iniciar',
  },

  onboarding: {
    stepOf: 'Etapa {current} de {total}',
    back: 'Voltar',
    next: 'Continuar',
    finish: 'Ativar',
    skip: 'Prefiro não responder',

    intro: {
      title: 'Usuário compatível detectado',
      body: 'O SYSTEM registra desenvolvimento real. Não o tempo passado aqui — o trabalho que você de fato realiza.\n\nTudo permanece nesta máquina. Nada é enviado, e nada é compartilhado a menos que você escolha.',
      note: 'Isso leva cerca de dois minutos. Você pode alterar qualquer resposta depois.',
    },

    identity: {
      title: 'Identificação',
      body: 'Como o SYSTEM deve chamá-lo?',
      nameLabel: 'Nome de exibição',
      namePlaceholder: 'Seu nome',
      birthLabel: 'Data de nascimento',
      birthHelp:
        'Usada apenas para manter as recomendações adequadas à sua idade. Armazenada localmente, nunca compartilhada.',
    },

    focus: {
      title: 'Prioridades atuais',
      body: 'Selecione no que você realmente está trabalhando agora. Isso molda o que o SYSTEM propõe.',
      help: 'Escolha quantas fizerem sentido. Você pode alterá-las a qualquer momento.',
    },

    capacity: {
      title: 'Tempo disponível',
      body: 'Aproximadamente quanto tempo você tem em um dia normal para desenvolvimento deliberado?',
      help: 'O SYSTEM nunca proporá mais do que você tem. O espaço para o resto da sua vida é deixado de propósito.',
      minutes: '{value} minutos',
      hours: '{value} horas',
    },

    intensity: {
      title: 'Calibração',
      body: 'Como o SYSTEM deve ajustar a dificuldade?',
      lighter: 'Mais leve',
      lighterHelp: 'Construa o hábito primeiro. A dificuldade cresce junto com a consistência.',
      balanced: 'Equilibrada',
      balancedHelp: 'Trabalho que exige sem quebrar a semana.',
      harder: 'Mais intensa',
      harderHelp: 'Consistentemente além do confortável. Você pode reduzir isso quando quiser.',
    },

    presentation: {
      title: 'Apresentação',
      body: 'Como o SYSTEM deve se parecer e soar.',
      animation: 'Animação',
      animationFull: 'Completa',
      animationReduced: 'Reduzida',
      animationMinimal: 'Mínima',
      animationOff: 'Desativada',
      sound: 'Som',
      soundOn: 'Ativado',
      soundOff: 'Desativado',
      reducedMotionDetected:
        'Seu sistema solicita movimento reduzido, então esse é o padrão. Você pode substituí-lo.',
    },

    complete: {
      title: 'Registro estabelecido',
      body: 'O SYSTEM agora está observando. Seus primeiros objetivos estão prontos.',
      enter: 'Entrar',
    },
  },

  common: {
    save: 'Salvar',
    cancel: 'Cancelar',
    close: 'Fechar',
    back: 'Voltar',
    next: 'Próximo',
    confirm: 'Confirmar',
    retry: 'Tentar novamente',
    search: 'Buscar',
    loading: 'Carregando',
    yes: 'Sim',
    no: 'Não',
    filterAll: 'Todas',
    filterActive: 'Ativas',
    filterAvailable: 'Disponíveis',
    filterCompleted: 'Concluídas',
    minutesShort: '{minutes} min',
  },

  nav: {
    home: 'Central de Comando',
    today: 'Hoje',
    quests: 'Missões',
    status: 'Status',
    skills: 'Habilidades',
    achievements: 'Conquistas',
    bosses: 'Chefes',
    timeline: 'Linha do Tempo',
    architect: 'O Arquiteto',
    settings: 'Configurações',
    collapse: 'Recolher navegação',
    expand: 'Expandir navegação',
  },

  topbar: {
    level: 'Nível',
    rank: 'Patente',
    today: 'Hoje',
    settings: 'Configurações',
    profile: 'Perfil',
  },

  progression: {
    levelUp: 'Nível {level}',
    xpToNext: '{current} / {required} para o nível {next}',
  },

  home: {
    title: 'Central de Comando',
    greeting: 'Bem-vindo de volta, {name}',
    greetingFirst: 'Bem-vindo, {name}',
    priorityTitle: 'Prioridade atual',
    progressTitle: 'Progressão',
    questsTitle: 'Missões de hoje',
    evolutionTitle: 'Evolução recente',
    architectTitle: 'O Arquiteto observa',
    noActiveQuest: 'Nenhuma missão está ativa no momento.',
    viewAllQuests: 'Ver todas as missões',
    recalibrate: 'Novas sugestões',
    recentAchievement: 'Conquista mais recente',
    noRecentAchievement: 'Nenhuma conquista desbloqueada ainda.',
    focusDomain: 'Foco atual',
    noFocusDomain: 'Ainda não estabelecido',
    questCountToday: '{count} missões hoje',
    architectDefaultMessage:
      'O registro está estabelecido. Sua próxima ação definirá o ritmo deste ciclo.',
  },

  today: {
    title: 'Hoje',
    empty: 'Nenhuma missão ativa foi encontrada.',
    emptyBody: 'Este é um dia completo. O descanso faz parte do registro.',
    dailyProgress: 'Progresso do dia',
    effortToday: 'Esforço de hoje',
    recommendationTitle: 'Recomendação do Arquiteto',
  },

  quests: {
    title: 'Missões',
    searchPlaceholder: 'Buscar missões',
    sortNewest: 'Mais recentes',
    sortDifficulty: 'Dificuldade',
    sortDeadline: 'Prazo',
    filterDomain: 'Domínio',
    filterStatus: 'Status',
    empty: 'Nenhuma missão corresponde a este filtro.',
    emptyBody: 'Tente outro filtro, ou aguarde o próximo ciclo.',
    selectPrompt: 'Selecione uma missão para ver os detalhes.',
    history: 'Histórico',
    createdOn: 'Detectada em {date}',
    presentedOn: 'Apresentada em {date}',
    completedOn: 'Concluída em {date}',
    postponedOn: 'Adiada em {date}',
    rejectedOn: 'Recusada em {date}',
  },

  quest: {
    accept: 'Aceitar',
    decline: 'Recusar',
    postpone: 'Adiar',
    complete: 'Marcar como concluída',
    completePartial: 'Concluída parcialmente',
    viewDetails: 'Ver detalhes',
    estimated: '{minutes} min',
    whyThis: 'Por que esta missão?',
    purpose: 'Propósito',
    steps: 'Etapas',
    awarded: '+{xp} XP',
    difficulty: {
      trivial: 'Trivial',
      light: 'Leve',
      moderate: 'Moderada',
      demanding: 'Exigente',
      severe: 'Severa',
    },
    states: {
      detected: 'Detectada',
      offered: 'Disponível',
      accepted: 'Em andamento',
      completed: 'Concluída',
      expired: 'Expirada',
      rejected: 'Recusada',
      postponed: 'Adiada',
      skipped: 'Ignorada',
    },
  },

  questType: {
    daily: 'Diária',
    weekly: 'Semanal',
    monthly: 'Mensal',
    main: 'Principal',
    side: 'Secundária',
    hidden: 'Oculta',
    chain: 'Encadeada',
    recovery: 'Recuperação',
    exploration: 'Exploração',
    mastery: 'Maestria',
    challenge: 'Desafio',
    social: 'Social',
    project: 'Projeto',
    boss_preparation: 'Preparação para chefe',
    seasonal: 'Sazonal',
    milestone: 'Marco',
    experiment: 'Experimento do Arquiteto',
    user: 'Criada pelo usuário',
  },

  questDetail: {
    type: 'Tipo',
    description: 'Descrição',
    why: 'Por que esta missão existe',
    rationale: 'Justificativa do Arquiteto',
    noRationale: 'Nenhuma justificativa registrada para esta missão.',
    status: 'Status',
    difficulty: 'Dificuldade',
    estimatedTime: 'Tempo estimado',
    deadline: 'Prazo',
    steps: 'Etapas',
    optionalSteps: 'Etapas opcionais',
    rewards: 'Recompensas',
    domain: 'Domínio',
    noSteps: 'Nenhuma etapa registrada.',
    reflection: 'Reflexão',
    evidence: 'Evidência',
    completedAt: 'Concluída em {date}',
  },

  questEncounter: {
    eyebrow: 'Nova missão detectada',
    decisionPrompt: 'Deseja aceitar esta missão?',
    accept: 'Aceitar missão',
    viewDetails: 'Ver detalhes',
    adjust: 'Ajustar',
    decline: 'Recusar',
    postpone: 'Adiar',
    acceptedConfirm: 'Missão aceita',
    declinedConfirm: 'Missão recusada',
    postponedConfirm: 'Missão adiada',
    purposeLabel: 'Propósito',
    difficultyLabel: 'Dificuldade',
    deadlineLabel: 'Prazo',
    rewardsLabel: 'Recompensa',
    queueRemaining: 'mais {count} aguardando',
    dismissHint: 'Pressione esc para decidir depois',
  },

  completion: {
    dialogTitle: 'Concluir missão',
    degreeLabel: 'Conclusão',
    full: 'Completa',
    partial: 'Parcial',
    reflectionLabel: 'Reflexão (opcional)',
    reflectionPlaceholder: 'O que você percebeu ao realizar isso?',
    evidenceLabel: 'Evidência ou resultado (opcional)',
    evidencePlaceholder: 'Um número, um link, uma anotação breve',
    submit: 'Confirmar conclusão',
    cancel: 'Cancelar',
    resultTitle: 'Missão concluída',
    xpGained: 'Experiência adquirida',
    progressSaved: 'Progresso registrado',
    errorSaving: 'O progresso não pôde ser salvo. Nenhuma recompensa foi aplicada.',
  },

  status: {
    title: 'Status',
    profileSection: 'Perfil',
    ageLabel: 'Idade',
    ageUnknown: 'Não informada',
    levelLabel: 'Nível',
    totalXpLabel: 'XP total',
    joinedLabel: 'Ingressou em',
    completedQuestsLabel: 'Missões concluídas',
    achievementsUnlockedLabel: 'Conquistas desbloqueadas',
    domainsSection: 'Domínios de desenvolvimento',
    attributesSection: 'Atributos',
    attributesComingSoon:
      'Os atributos serão calculados a partir de evidências de domínio, desempenho e consistência. A calibração ainda não foi concluída.',
    recentProgressSection: 'Progresso recente',
  },

  achievements: {
    title: 'Conquistas',
    tabAll: 'Todas',
    tabUnlocked: 'Desbloqueadas',
    tabLocked: 'Bloqueadas',
    searchPlaceholder: 'Buscar conquistas',
    noResults: 'Nenhuma conquista corresponde a esta busca.',
    unlockedOn: 'Desbloqueada em {date}',
    stillLocked: 'Ainda não desbloqueada',
    secretName: '???',
    secretDescription: 'Uma conquista oculta. Continue avançando para revelá-la.',
    rarity: {
      standard: 'Padrão',
      rare: 'Rara',
      legendary: 'Lendária',
    },
  },

  achievement: {
    unlocked: 'Conquista desbloqueada',
    rareUnlocked: 'Conquista rara',
    legendaryUnlocked: 'Conquista lendária',
    dismiss: 'Dispensar',
  },

  architect: {
    title: 'O Arquiteto',
    subtitle: 'Camada local de recomendação e regras',
    recommendationTitle: 'Recomendação atual',
    recentQuestsTitle: 'Geradas recentemente',
    acceptedLabel: 'Aceita',
    rejectedLabel: 'Recusada',
    pendingLabel: 'Pendente',
    prioritiesTitle: 'Prioridades atuais',
    noPriorities:
      'Nenhuma prioridade definida ainda. Configure-as durante a integração ou em Configurações.',
    recalibrateButton: 'Recalibrar hoje',
    recalibrateConfirm: 'As prioridades de hoje foram recalibradas.',
    recalibrateBody: 'As missões pendentes de hoje serão substituídas por novas alternativas.',
    offlineTitle: 'Operando offline',
    offlineExplanation:
      'O Arquiteto atualmente opera inteiramente nesta máquina, usando um mecanismo de regras local e determinístico. Nenhum serviço externo é contatado, e nenhum é necessário.',
    aiStatusTitle: 'Inteligência externa',
    aiStatusOffline: 'Desativada. O SYSTEM funciona completamente sem ela.',
    privacyTitle: 'Privacidade',
    privacyBody:
      'Nada sai desta máquina. Se um provedor externo for ativado no futuro, cada categoria de dado exigirá consentimento explícito e separado.',
  },

  settings: {
    title: 'Configurações',
    languageSection: 'Idioma',
    languageLabel: 'Idioma do aplicativo',
    localePtBR: 'Português (Brasil)',
    localeEn: 'English',
    soundSection: 'Som',
    soundEnabledLabel: 'Som ativado',
    masterVolumeLabel: 'Volume geral',
    interfaceVolumeLabel: 'Interface',
    eventsVolumeLabel: 'Eventos',
    cinematicVolumeLabel: 'Cinemáticas',
    presentationSection: 'Apresentação',
    animationLabel: 'Intensidade de animação',
    animationFull: 'Completa',
    animationReduced: 'Reduzida',
    animationMinimal: 'Mínima',
    animationOff: 'Desativada',
    performanceModeLabel: 'Modo de desempenho',
    performanceModeHelp: 'Reduz desfoque e profundidade de sombra para aliviar a GPU.',
    questPresentationSection: 'Apresentação de missões',
    questPresentationLabel: 'Novos encontros de missão',
    questPresentationFull: 'Cinemática',
    questPresentationFullHelp:
      'Apresentação completa para missões significativas, compacta para as rotineiras.',
    questPresentationCompact: 'Sempre compacta',
    questPresentationCompactHelp: 'Um cartão breve para cada nova missão, sem a sequência completa.',
    questPresentationOff: 'Silenciosa',
    questPresentationOffHelp: 'Novas missões simplesmente aparecem na lista.',
    privacySection: 'Privacidade',
    privacyBody:
      'O SYSTEM é local por padrão. Seus registros permanecem nesta máquina. Sem conta, sem telemetria, sem análise de dados.',
    dataSection: 'Dados',
    dataLocationLabel: 'Local do banco de dados',
    backupNowButton: 'Fazer backup agora',
    backupSuccess: 'Backup salvo em {path}',
    backupError: 'Não foi possível concluir o backup.',
    aboutSection: 'Sobre',
    versionLabel: 'Versão',
    schemaVersionLabel: 'Esquema de dados',
  },

  comingSoon: {
    badge: 'Em desenvolvimento',
    skillsTitle: 'Habilidades',
    skillsBody:
      'A árvore de habilidades mapeará a capacidade demonstrada em cada domínio, desbloqueada por evidência e não por tempo de uso. Depende do mecanismo de maestria, o próximo marco após este.',
    bossesTitle: 'Chefes',
    bossesBody:
      'Os chefes transformarão suas provas, projetos e competições reais em encontros estruturados com fases, fraquezas e cadeias de preparação. A fundação está desenhada em docs/GAME_SYSTEMS.md; a implementação segue o marco de maestria.',
    timelineTitle: 'Linha do Tempo',
    timelineBody:
      'Um registro ano a ano da sua evolução — classes, patentes, marcos e reflexões — se torna significativo quando houver histórico suficiente e a camada de análises existir para resumi-lo.',
  },

  error: {
    title: 'Algo deu errado',
    body: 'O SYSTEM encontrou um erro. Seus dados não foram afetados — nada foi salvo.',
    retry: 'Tentar novamente',
    detail: 'Detalhe técnico',
  },

  desktopOnly: {
    title: 'Aplicativo de desktop necessário',
    body: 'O SYSTEM armazena tudo localmente em um banco de dados administrado pelo host de desktop. Execute-o pelo shell de desktop em vez do navegador.',
    command: 'npm run tauri:dev',
  },
};

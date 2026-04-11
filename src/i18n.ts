import type { Lang } from './content/packs'

export interface Strings {
  tagline: string
  play: string
  history: string
  level: string
  startHint: string
  restartHint: string
  loading: string
  offlineNotice: string
  source: string
  time: string
  accuracy: string
  combo: string
  duration: string
  difficulty: string
  easy: string
  medium: string
  hard: string
  strictAccents: string
  sound: string
  ghost: (wpm: number) => string
  inputLabel: string
  resultsTitle: string
  raw: string
  bestCombo: string
  xpGained: string
  levelUp: (level: number) => string
  newRecord: string
  missedKeys: string
  noMistakes: string
  retry: string
  seeHistory: string
  historyTitle: string
  progression: string
  emptyHistory: string
  sessions: string
  best: string
  average: string
  avgAccuracy: string
  recent: string
  topMissed: string
  chartLabel: string
  space: string
}

export const STRINGS: Record<Lang, Strings> = {
  fr: {
    tagline: 'Tape de vrais textes. Gagne de l\'XP.',
    play: 'Jouer',
    history: 'Historique',
    level: 'Niv.',
    startHint: 'Commence à taper pour lancer le chrono',
    restartHint: 'Tab ou Échap : nouveau texte',
    loading: 'Chargement du texte…',
    offlineNotice: 'Hors-ligne : texte local à la place',
    source: 'Source :',
    time: 'Temps',
    accuracy: 'Précision',
    combo: 'Combo',
    duration: 'Durée',
    difficulty: 'Difficulté',
    easy: 'Facile',
    medium: 'Moyen',
    hard: 'Difficile',
    strictAccents: 'Accents stricts',
    sound: 'Sons',
    ghost: (wpm) => `Fantôme à ton record : ${wpm} WPM`,
    inputLabel: 'Zone de saisie : tape le texte affiché',
    resultsTitle: 'Terminé !',
    raw: 'Brut',
    bestCombo: 'Combo max',
    xpGained: 'XP gagnée',
    levelUp: (level) => `Niveau ${level} atteint !`,
    newRecord: 'Nouveau record !',
    missedKeys: 'Touches ratées',
    noMistakes: 'Aucune erreur, propre !',
    retry: 'Rejouer (nouveau texte)',
    seeHistory: 'Voir l\'historique',
    historyTitle: 'Historique',
    progression: 'Progression (WPM)',
    emptyHistory: 'Pas encore de session. Fais un premier test !',
    sessions: 'Sessions',
    best: 'Record',
    average: 'Moyenne',
    avgAccuracy: 'Précision moy.',
    recent: 'Dernières sessions',
    topMissed: 'Tes touches les plus ratées',
    chartLabel: 'Courbe de progression des WPM par session',
    space: 'espace',
  },
  en: {
    tagline: 'Type real texts. Earn XP.',
    play: 'Play',
    history: 'History',
    level: 'Lv.',
    startHint: 'Start typing to begin',
    restartHint: 'Tab or Esc: new text',
    loading: 'Loading text…',
    offlineNotice: 'Offline: using a local text instead',
    source: 'Source:',
    time: 'Time',
    accuracy: 'Accuracy',
    combo: 'Combo',
    duration: 'Duration',
    difficulty: 'Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    strictAccents: 'Strict accents',
    sound: 'Sound',
    ghost: (wpm) => `Ghost at your best: ${wpm} WPM`,
    inputLabel: 'Typing area: type the text shown',
    resultsTitle: 'Done!',
    raw: 'Raw',
    bestCombo: 'Best combo',
    xpGained: 'XP earned',
    levelUp: (level) => `Level ${level} reached!`,
    newRecord: 'New record!',
    missedKeys: 'Missed keys',
    noMistakes: 'No mistakes, clean!',
    retry: 'Play again (new text)',
    seeHistory: 'See history',
    historyTitle: 'History',
    progression: 'Progress (WPM)',
    emptyHistory: 'No sessions yet. Take your first test!',
    sessions: 'Sessions',
    best: 'Best',
    average: 'Average',
    avgAccuracy: 'Avg. accuracy',
    recent: 'Recent sessions',
    topMissed: 'Your most missed keys',
    chartLabel: 'Line chart of WPM per session',
    space: 'space',
  },
}

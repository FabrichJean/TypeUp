import type { Lang } from '../content/packs'
import type { RelicId } from './relics'

export interface QuestStrings {
  tab: string
  title: string
  tagline: string
  start: string
  loading: string
  preparing: string
  bestScore: string
  bestFloor: string
  runs: string
  kills: string
  howTitle: string
  how: readonly string[]
  floor: string
  boss: string
  score: string
  combo: string
  hp: string
  shield: string
  golden: string
  bossRage: string
  floorBanner: (floor: number) => string
  bossBanner: string
  paused: string
  resume: string
  pauseHint: string
  chooseRelic: string
  chooseHint: string
  floorCleared: string
  bonus: (n: number) => string
  flawless: string
  gameOver: string
  reachedFloor: (floor: number) => string
  newBest: string
  accuracy: string
  bestCombo: string
  again: string
  menu: string
  inputLabel: string
  unlockHint: string
  relics: Record<RelicId, { name: string; desc: string }>
}

export const QUEST_STRINGS: Record<Lang, QuestStrings> = {
  fr: {
    tab: 'Quête',
    title: 'Quête',
    tagline: 'Tape pour survivre. Chaque mot est une attaque.',
    start: 'Lancer une partie',
    loading: 'Préparation du donjon…',
    preparing: 'Le boss arrive…',
    bestScore: 'Meilleur score',
    bestFloor: 'Étage max',
    runs: 'Parties',
    kills: 'Mots abattus',
    howTitle: 'Comment jouer',
    how: [
      'Des mots avancent vers toi. Tape-les pour les détruire avant qu\'ils ne te touchent.',
      'La première lettre verrouille un mot : finis-le. Retour arrière pour changer de cible.',
      'Une erreur casse ton combo et fait avancer tous les ennemis.',
      'Tous les 3 étages, un boss : un vrai texte à taper en gardant le rythme.',
      'Entre les étages, choisis une relique. Elles se cumulent !',
    ],
    floor: 'Étage',
    boss: 'Boss',
    score: 'Score',
    combo: 'Combo',
    hp: 'Vies',
    shield: 'Bouclier',
    golden: 'Mot doré : points bonus',
    bossRage: 'Colère du boss',
    floorBanner: (floor) => `Étage ${floor}`,
    bossBanner: 'Boss !',
    paused: 'Pause',
    resume: 'Cliquer ou appuyer sur Échap pour reprendre',
    pauseHint: 'Échap : pause',
    chooseRelic: 'Choisis une relique',
    chooseHint: 'Touches 1, 2, 3 ou clic',
    floorCleared: 'Étage terminé !',
    bonus: (n) => `+${n} de prime`,
    flawless: 'sans une égratignure',
    gameOver: 'Fin de partie',
    reachedFloor: (floor) => `Tu as atteint l'étage ${floor}`,
    newBest: 'Nouveau record !',
    accuracy: 'Précision',
    bestCombo: 'Combo max',
    again: 'Rejouer',
    menu: 'Menu',
    inputLabel: 'Zone de saisie : tape les mots qui avancent vers toi',
    unlockHint: 'Retour arrière : changer de cible',
    relics: {
      shield: { name: 'Bouclier', desc: 'Absorbe tes 3 prochaines erreurs.' },
      heart: { name: 'Cœur', desc: 'Rend 2 vies.' },
      armor: { name: 'Armure', desc: '+1 vie maximum et +1 vie.' },
      hourglass: { name: 'Sablier', desc: 'Les ennemis et le boss sont 12 % plus lents.' },
      magnet: { name: 'Aimant à combo', desc: 'Une erreur ne divise ton combo que par deux.' },
      gold: { name: 'Mots dorés', desc: '+12 % de mots dorés, qui rapportent beaucoup plus.' },
      nova: { name: 'Nova', desc: 'Tous les 25 de combo, détruit tous les ennemis à l\'écran.' },
      vampire: { name: 'Vampire', desc: 'Rend 1 vie tous les 9 mots abattus.' },
      frost: { name: 'Givre', desc: 'Les ennemis restent gelés 3 s au début de chaque étage.' },
    },
  },
  en: {
    tab: 'Quest',
    title: 'Quest',
    tagline: 'Type to survive. Every word is an attack.',
    start: 'Start a run',
    loading: 'Preparing the dungeon…',
    preparing: 'The boss is coming…',
    bestScore: 'Best score',
    bestFloor: 'Deepest floor',
    runs: 'Runs',
    kills: 'Words slain',
    howTitle: 'How to play',
    how: [
      'Words march toward you. Type them to destroy them before they reach you.',
      'The first letter locks a word: finish it. Backspace to switch target.',
      'A mistake breaks your combo and pushes every enemy forward.',
      'Every 3rd floor is a boss: a real text to type while keeping the rhythm.',
      'Between floors, pick a relic. They stack!',
    ],
    floor: 'Floor',
    boss: 'Boss',
    score: 'Score',
    combo: 'Combo',
    hp: 'Lives',
    shield: 'Shield',
    golden: 'Golden word: bonus points',
    bossRage: 'Boss rage',
    floorBanner: (floor) => `Floor ${floor}`,
    bossBanner: 'Boss!',
    paused: 'Paused',
    resume: 'Click or press Esc to resume',
    pauseHint: 'Esc: pause',
    chooseRelic: 'Pick a relic',
    chooseHint: 'Keys 1, 2, 3 or click',
    floorCleared: 'Floor cleared!',
    bonus: (n) => `+${n} bonus`,
    flawless: 'without a scratch',
    gameOver: 'Game over',
    reachedFloor: (floor) => `You reached floor ${floor}`,
    newBest: 'New record!',
    accuracy: 'Accuracy',
    bestCombo: 'Best combo',
    again: 'Play again',
    menu: 'Menu',
    inputLabel: 'Typing area: type the words marching toward you',
    unlockHint: 'Backspace: switch target',
    relics: {
      shield: { name: 'Shield', desc: 'Absorbs your next 3 mistakes.' },
      heart: { name: 'Heart', desc: 'Restores 2 lives.' },
      armor: { name: 'Armor', desc: '+1 max life and +1 life.' },
      hourglass: { name: 'Hourglass', desc: 'Enemies and the boss are 12% slower.' },
      magnet: { name: 'Combo magnet', desc: 'A mistake only halves your combo.' },
      gold: { name: 'Golden words', desc: '+12% golden words, worth far more.' },
      nova: { name: 'Nova', desc: 'Every 25 combo, destroys every enemy on screen.' },
      vampire: { name: 'Vampire', desc: 'Restores 1 life every 9 words slain.' },
      frost: { name: 'Frost', desc: 'Enemies stay frozen for 3 s at the start of each floor.' },
    },
  },
}

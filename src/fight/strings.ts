import type { Lang } from '../content/packs'
import type { MoveKind } from './engine'
import type { FoeId, TechId } from './foes'

export interface FoeText {
  name: string
  taunt: string
  /** Ce qu'il faut savoir avant de l'affronter. */
  tip: string
}

export interface FightStrings {
  tab: string
  title: string
  tagline: string
  start: string
  startTournament: string
  orPick: string
  challenge: string
  duelLabel: string
  duelWinsLabel: (n: number) => string
  duelVictory: string
  duelVictoryLine: (foe: string) => string
  duelDefeatLine: (foe: string) => string
  rematch: string
  briefingTitle: string
  fightNow: string
  demoLabel: (n: number, total: number) => string
  demo: {
    appear: string
    plain: string
    mirror: (shown: string, answer: string) => string
    scramble: (shown: string, answer: string) => string
    fading: string
    type: string
    parry: string
    strike: string
    feintTell: string
    feintWait: string
    feintOpen: string
    hitWait: string
    hit: string
  }
  loading: string
  bestScore: string
  bestRounds: string
  tournaments: string
  clears: string
  parries: string
  howTitle: string
  how: readonly string[]
  opponentsTitle: string
  round: (n: number, total: number) => string
  you: string
  fight: string
  yourMoves: string
  incoming: string
  superLabel: string
  superReady: string
  superHint: string
  superTitle: string
  chain: string
  feintTag: string
  heavyTag: string
  paused: string
  resume: string
  pauseHint: string
  backspaceHint: string
  koTitle: string
  healed: (n: number) => string
  chooseTech: string
  chooseHint: string
  victory: string
  victoryLine: string
  defeat: string
  defeatLine: (round: number, total: number) => string
  newBest: string
  score: string
  roundsWon: string
  parriesStat: string
  accuracy: string
  bestChain: string
  again: string
  menu: string
  inputLabel: string
  moves: Record<MoveKind, string>
  foes: Record<FoeId, FoeText>
  techs: Record<TechId, { name: string; desc: string }>
}

export const FIGHT_STRINGS: Record<Lang, FightStrings> = {
  fr: {
    tab: 'Combat',
    title: 'Key Fighter',
    tagline: 'Le tournoi des touches du clavier. Chaque mot est un coup.',
    start: 'Entrer dans l\'arène',
    startTournament: 'Tournoi complet (6 combats)',
    orPick: 'Ou choisis ton adversaire pour un duel :',
    challenge: 'Défier',
    duelLabel: 'Duel',
    duelWinsLabel: (n) => `${n} duel${n > 1 ? 's' : ''} gagné${n > 1 ? 's' : ''}`,
    duelVictory: 'Duel gagné !',
    duelVictoryLine: (foe) => `${foe} est à terre.`,
    duelDefeatLine: (foe) => `${foe} a eu le dernier mot.`,
    rematch: 'Revanche',
    briefingTitle: 'Comment le battre',
    fightNow: 'Au combat !',
    demoLabel: (n, total) => `Démo ${n}/${total}`,
    demo: {
      appear: 'Il prépare une attaque : un mot rouge apparaît, avec un compte à rebours.',
      plain: 'Pour parer, tape le mot avant que la barre ne se vide.',
      mirror: (shown, answer) => `Ses mots sont écrits à l'envers : « ${shown} » se lit « ${answer} ». Tape la bonne version !`,
      scramble: (shown, answer) => `Mot mélangé (la 1re lettre reste en place) : « ${shown} » est « ${answer} ».`,
      fading: 'Les lettres s\'effacent peu à peu : lis vite, puis tape !',
      type: 'Tape le mot lettre par lettre…',
      parry: 'PARADE ! Il est étourdi : tes coups font 50 % de dégâts en plus.',
      strike: 'Profites-en : tape un de tes mots pour frapper. Plus il est long, plus ça fait mal.',
      feintTell: 'Bord pointillé violet : c\'est une feinte !',
      feintWait: 'Ne tape rien ! Si tu la pares, c\'est toi qui es étourdi.',
      feintOpen: 'La feinte se perd dans le vide : sa garde est ouverte !',
      hitWait: 'Et si tu ne fais rien ?…',
      hit: 'Trop lent : tu encaisses le coup et tu es figé un instant.',
    },
    loading: 'Échauffement…',
    bestScore: 'Meilleur score',
    bestRounds: 'Adversaires battus (max)',
    tournaments: 'Tournois',
    clears: 'Victoires finales',
    parries: 'Parades',
    howTitle: 'Comment se battre',
    how: [
      'Tu as 3 coups en main. Tape un mot pour le lancer : plus il est long, plus il frappe fort. Enchaîne sans faute pour gonfler tes dégâts.',
      'L\'ennemi annonce chaque attaque par un mot rouge. Tape-le avant la fin du compte à rebours pour PARER : il est étourdi et prend 50 % de dégâts en plus.',
      'Un coup encaissé te fige un instant. Une erreur aussi.',
      'Une attaque à bord pointillé est une feinte : ne la pare pas ! La laisser passer ouvre sa garde.',
      'Jauge pleine ? Entrée lance le coup spécial : l\'ennemi est figé, tape la phrase pour l\'achever.',
      'Retour arrière change de cible. Échap met en pause.',
    ],
    opponentsTitle: 'Les adversaires',
    round: (n, total) => `Combat ${n}/${total}`,
    you: 'Toi',
    fight: 'FIGHT !',
    yourMoves: 'Tes coups',
    incoming: 'Attaque !',
    superLabel: 'Coup spécial',
    superReady: 'PRÊT',
    superHint: 'Entrée',
    superTitle: 'Tape la phrase pour l\'achever',
    chain: 'série',
    feintTag: 'feinte',
    heavyTag: 'lourde',
    paused: 'Pause',
    resume: 'Cliquer ou appuyer sur Échap pour reprendre',
    pauseHint: 'Échap : pause',
    backspaceHint: 'Retour arrière : changer de cible',
    koTitle: 'K.O. !',
    healed: (n) => `Tu récupères ${n} vies`,
    chooseTech: 'Choisis une technique',
    chooseHint: 'Touches 1, 2, 3 ou clic',
    victory: 'Champion du clavier !',
    victoryLine: 'Plus une touche ne te résiste.',
    defeat: 'K.O.',
    defeatLine: (round, total) => `Tu es tombé au combat ${round}/${total}`,
    newBest: 'Nouveau record !',
    score: 'Score',
    roundsWon: 'Adversaires battus',
    parriesStat: 'Parades',
    accuracy: 'Précision',
    bestChain: 'Meilleure série',
    again: 'Nouveau tournoi',
    menu: 'Menu',
    inputLabel: 'Zone de saisie : tape les mots pour frapper ou parer',
    moves: { jab: 'Pointe', hook: 'Crochet', smash: 'Capitale' },
    foes: {
      space: {
        name: 'Espace',
        taunt: 'Je prends toute la place.',
        tip: 'Échauffement : tape les mots rouges pour parer, les tiens pour frapper.',
      },
      shift: {
        name: 'Maj',
        taunt: 'Je suis ton double… à l\'envers.',
        tip: 'Ses mots sont écrits à l\'envers.',
      },
      caps: {
        name: 'Verr. Maj',
        taunt: 'JE NE CRIE PAS !!!',
        tip: 'Il lance des feintes (bord pointillé) : ne les pare pas !',
      },
      esc: {
        name: 'Échap',
        taunt: 'Impossible de m\'attraper.',
        tip: 'Ses mots s\'effacent. Lis vite !',
      },
      back: {
        name: 'Retour arrière',
        taunt: 'Je défais tout ce que tu fais.',
        tip: 'Ses mots sont mélangés (la 1re lettre reste en place). Ses coups vident la moitié de ta jauge.',
      },
      ctrl: {
        name: 'Ctrl+Alt+Suppr',
        taunt: 'Je redémarre ton monde.',
        tip: 'Toutes les ruses à la fois, et deux attaques en même temps.',
      },
    },
    techs: {
      reflex: { name: 'Réflexes', desc: 'Les préparations ennemies durent 20 % plus longtemps.' },
      power: { name: 'Poings d\'acier', desc: '+20 % de dégâts.' },
      focus: { name: 'Concentration', desc: 'La jauge de coup spécial se remplit 40 % plus vite.' },
      counter: { name: 'Contre-attaque', desc: 'Chaque parade inflige 8 dégâts de plus.' },
      vitality: { name: 'Vitalité', desc: '+20 vies maximum et +20 vies.' },
      stoneskin: { name: 'Peau dure', desc: '-15 % de dégâts subis.' },
      medic: { name: 'Infirmerie', desc: 'Rend 40 vies.' },
    },
  },
  en: {
    tab: 'Fight',
    title: 'Key Fighter',
    tagline: 'The keyboard keys tournament. Every word is a move.',
    start: 'Enter the arena',
    startTournament: 'Full tournament (6 fights)',
    orPick: 'Or pick your opponent for a duel:',
    challenge: 'Challenge',
    duelLabel: 'Duel',
    duelWinsLabel: (n) => `${n} duel${n > 1 ? 's' : ''} won`,
    duelVictory: 'Duel won!',
    duelVictoryLine: (foe) => `${foe} is down.`,
    duelDefeatLine: (foe) => `${foe} had the last word.`,
    rematch: 'Rematch',
    briefingTitle: 'How to beat it',
    fightNow: 'Fight!',
    demoLabel: (n, total) => `Demo ${n}/${total}`,
    demo: {
      appear: 'It winds up an attack: a red word appears, with a countdown.',
      plain: 'To parry, type the word before the bar runs out.',
      mirror: (shown, answer) => `Its words are written backwards: "${shown}" reads "${answer}". Type the right way round!`,
      scramble: (shown, answer) => `Scrambled word (the 1st letter stays put): "${shown}" is "${answer}".`,
      fading: 'The letters fade away: read fast, then type!',
      type: 'Type the word letter by letter…',
      parry: 'PARRY! It is stunned: your moves deal 50% more damage.',
      strike: 'Make the most of it: type one of your words to strike. The longer, the harder.',
      feintTell: 'Dashed purple border: it is a feint!',
      feintWait: 'Type nothing! If you parry it, you are the one who gets stunned.',
      feintOpen: 'The feint whiffs: its guard is open!',
      hitWait: 'And if you do nothing?…',
      hit: 'Too slow: you take the hit and freeze for a moment.',
    },
    loading: 'Warming up…',
    bestScore: 'Best score',
    bestRounds: 'Opponents beaten (best)',
    tournaments: 'Tournaments',
    clears: 'Final victories',
    parries: 'Parries',
    howTitle: 'How to fight',
    how: [
      'You hold 3 moves. Type a word to throw it: the longer it is, the harder it hits. Chain without mistakes to boost your damage.',
      'The enemy announces each attack with a red word. Type it before the countdown ends to PARRY: it is stunned and takes 50% more damage.',
      'Taking a hit freezes you for a moment. So does a mistake.',
      'A dashed-border attack is a feint: do not parry it! Letting it pass opens its guard.',
      'Meter full? Enter fires the super: the enemy is frozen, type the sentence to finish it.',
      'Backspace switches target. Esc pauses.',
    ],
    opponentsTitle: 'The opponents',
    round: (n, total) => `Fight ${n}/${total}`,
    you: 'You',
    fight: 'FIGHT!',
    yourMoves: 'Your moves',
    incoming: 'Incoming!',
    superLabel: 'Super',
    superReady: 'READY',
    superHint: 'Enter',
    superTitle: 'Type the sentence to finish it',
    chain: 'chain',
    feintTag: 'feint',
    heavyTag: 'heavy',
    paused: 'Paused',
    resume: 'Click or press Esc to resume',
    pauseHint: 'Esc: pause',
    backspaceHint: 'Backspace: switch target',
    koTitle: 'K.O.!',
    healed: (n) => `You recover ${n} life`,
    chooseTech: 'Pick a technique',
    chooseHint: 'Keys 1, 2, 3 or click',
    victory: 'Keyboard champion!',
    victoryLine: 'Not a single key can stand against you.',
    defeat: 'K.O.',
    defeatLine: (round, total) => `You fell in fight ${round}/${total}`,
    newBest: 'New record!',
    score: 'Score',
    roundsWon: 'Opponents beaten',
    parriesStat: 'Parries',
    accuracy: 'Accuracy',
    bestChain: 'Best chain',
    again: 'New tournament',
    menu: 'Menu',
    inputLabel: 'Typing area: type words to strike or parry',
    moves: { jab: 'Jab', hook: 'Hook', smash: 'Smash' },
    foes: {
      space: {
        name: 'Space',
        taunt: 'I take up all the room.',
        tip: 'Warm-up: type the red words to parry, your own words to strike.',
      },
      shift: {
        name: 'Shift',
        taunt: 'I\'m your twin… backwards.',
        tip: 'Its words are written backwards.',
      },
      caps: {
        name: 'Caps Lock',
        taunt: 'I\'M NOT SHOUTING!!!',
        tip: 'It throws feints (dashed border): do not parry them!',
      },
      esc: {
        name: 'Esc',
        taunt: 'You can\'t catch me.',
        tip: 'Its words fade away. Read fast!',
      },
      back: {
        name: 'Backspace',
        taunt: 'I undo everything you do.',
        tip: 'Its words are scrambled (the 1st letter stays put). Its hits drain half your meter.',
      },
      ctrl: {
        name: 'Ctrl+Alt+Del',
        taunt: 'I\'m rebooting your world.',
        tip: 'Every trick at once, and two attacks at the same time.',
      },
    },
    techs: {
      reflex: { name: 'Reflexes', desc: 'Enemy wind-ups last 20% longer.' },
      power: { name: 'Iron fists', desc: '+20% damage.' },
      focus: { name: 'Focus', desc: 'The super meter fills 40% faster.' },
      counter: { name: 'Counter', desc: 'Each parry deals 8 more damage.' },
      vitality: { name: 'Vitality', desc: '+20 max life and +20 life.' },
      stoneskin: { name: 'Stone skin', desc: '-15% damage taken.' },
      medic: { name: 'Infirmary', desc: 'Restores 40 life.' },
    },
  },
}

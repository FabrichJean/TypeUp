/** Les adversaires du tournoi (des touches du clavier) et les techniques du joueur. */

/** Façon de déguiser le mot d'une attaque. */
export type AttackTrick = 'plain' | 'mirror' | 'scramble' | 'fading'

export const FOE_IDS = ['space', 'shift', 'caps', 'esc', 'back', 'ctrl'] as const
export type FoeId = (typeof FOE_IDS)[number]

export interface FoeDef {
  id: FoeId
  hp: number
  /** Délai entre deux attaques (ms), tiré au hasard dans cet intervalle. */
  gap: readonly [number, number]
  /** Temps de préparation d'une attaque = windupBase + perLetter × longueur du mot (ms). */
  windupBase: number
  perLetter: number
  dmg: number
  /** Longueur des mots d'attaque. */
  wordLen: readonly [number, number]
  /** Déguisements possibles (un par attaque, au hasard). */
  tricks: readonly AttackTrick[]
  /** Part d'attaques qui sont des feintes (les parer est une erreur). */
  feintChance: number
  /** Part d'attaques lourdes (mot plus long, préparation plus longue, 1,8x les dégâts). */
  heavyChance: number
  /** Attaques simultanées max. */
  maxAttacks: number
  /** Un coup encaissé efface aussi la moitié de la jauge de coup spécial. */
  erases: boolean
  /** Teinte (degrés) du décor et de la touche. */
  hue: number
}

export const FOES: readonly FoeDef[] = [
  {
    id: 'space',
    hp: 200,
    gap: [3000, 4200],
    windupBase: 2000,
    perLetter: 260,
    dmg: 9,
    wordLen: [3, 5],
    tricks: ['plain'],
    feintChance: 0,
    heavyChance: 0.1,
    maxAttacks: 1,
    erases: false,
    hue: 210,
  },
  {
    id: 'shift',
    hp: 270,
    gap: [2600, 3800],
    windupBase: 1900,
    perLetter: 260,
    dmg: 10,
    wordLen: [4, 6],
    tricks: ['mirror'],
    feintChance: 0,
    heavyChance: 0.15,
    maxAttacks: 1,
    erases: false,
    hue: 160,
  },
  {
    id: 'caps',
    hp: 340,
    gap: [2300, 3400],
    windupBase: 1800,
    perLetter: 240,
    dmg: 11,
    wordLen: [4, 6],
    tricks: ['plain'],
    feintChance: 0.35,
    heavyChance: 0.2,
    maxAttacks: 1,
    erases: false,
    hue: 350,
  },
  {
    id: 'esc',
    hp: 410,
    gap: [2000, 3000],
    windupBase: 1700,
    perLetter: 230,
    dmg: 12,
    wordLen: [4, 6],
    tricks: ['fading'],
    feintChance: 0.15,
    heavyChance: 0.2,
    maxAttacks: 1,
    erases: false,
    hue: 270,
  },
  {
    id: 'back',
    hp: 480,
    gap: [1800, 2800],
    windupBase: 1700,
    perLetter: 230,
    dmg: 14,
    wordLen: [4, 7],
    tricks: ['scramble'],
    feintChance: 0.15,
    heavyChance: 0.25,
    maxAttacks: 1,
    erases: true,
    hue: 30,
  },
  {
    id: 'ctrl',
    hp: 720,
    gap: [1600, 2400],
    windupBase: 1600,
    perLetter: 220,
    dmg: 14,
    wordLen: [4, 7],
    tricks: ['plain', 'mirror', 'scramble', 'fading'],
    feintChance: 0.25,
    heavyChance: 0.3,
    maxAttacks: 2,
    erases: true,
    hue: 0,
  },
]

// --- Techniques --------------------------------------------------------------

export const TECH_IDS = ['reflex', 'power', 'focus', 'counter', 'vitality', 'stoneskin', 'medic'] as const
export type TechId = (typeof TECH_IDS)[number]

export function isTechId(value: unknown): value is TechId {
  return TECH_IDS.some((t) => t === value)
}

export const TECH_TUNING = {
  /** Les préparations adverses durent ×(1 + n × reflex) plus longtemps. */
  reflex: 0.2,
  /** Dégâts ×(1 + n × power). */
  power: 0.2,
  /** Gain de jauge ×(1 + n × focus). */
  focus: 0.4,
  /** Dégâts de la contre-attaque après une parade : 8 + n × counter. */
  counterBase: 8,
  counter: 8,
  vitality: 20,
  /** Dégâts subis ×stoneskin^n. */
  stoneskin: 0.85,
  medic: 40,
} as const

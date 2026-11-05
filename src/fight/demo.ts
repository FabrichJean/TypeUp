/**
 * Démonstration animée « comment le battre » : une petite chronologie par scène,
 * calculée à partir du temps écoulé (pure, donc testable).
 */
import type { Lang } from '../content/packs'
import type { AttackTrick, FoeId } from './foes'

export type SceneKind = 'parry' | 'feint' | 'hit'

export interface SceneDef {
  kind: SceneKind
  trick: AttackTrick
}

/** Les scènes montrées avant chaque adversaire, dans l'ordre. */
export const SCENES: Record<FoeId, readonly SceneDef[]> = {
  space: [
    { kind: 'parry', trick: 'plain' },
    { kind: 'hit', trick: 'plain' },
  ],
  shift: [{ kind: 'parry', trick: 'mirror' }],
  caps: [
    { kind: 'parry', trick: 'plain' },
    { kind: 'feint', trick: 'plain' },
  ],
  esc: [{ kind: 'parry', trick: 'fading' }],
  back: [{ kind: 'parry', trick: 'scramble' }],
  ctrl: [
    { kind: 'parry', trick: 'mirror' },
    { kind: 'feint', trick: 'scramble' },
  ],
}

export interface DemoWords {
  /** Le mot à taper. */
  answer: string
  /** Le mot tel qu'il s'affiche. */
  shown: string
}

const WORDS: Record<Lang, Record<'plain' | 'mirror' | 'scramble' | 'fading' | 'feint', DemoWords>> = {
  fr: {
    plain: { answer: 'lune', shown: 'lune' },
    mirror: { answer: 'chat', shown: 'tahc' },
    scramble: { answer: 'dragon', shown: 'dgraon' },
    fading: { answer: 'table', shown: 'table' },
    feint: { answer: 'pomme', shown: 'pomme' },
  },
  en: {
    plain: { answer: 'moon', shown: 'moon' },
    mirror: { answer: 'tiger', shown: 'regit' },
    scramble: { answer: 'dragon', shown: 'dgraon' },
    fading: { answer: 'table', shown: 'table' },
    feint: { answer: 'apple', shown: 'apple' },
  },
}

/** Mots d'exemple d'une scène (une feinte de type « plain » prend un autre mot que la parade). */
export function demoWords(lang: Lang, scene: SceneDef): DemoWords {
  if (scene.kind === 'feint' && scene.trick === 'plain') return WORDS[lang].feint
  return WORDS[lang][scene.trick]
}

/** Le coup que le joueur lance après avoir paré. */
export const HAND_WORD: Record<Lang, string> = { fr: 'verre', en: 'books' }
export const HAND_DAMAGE = 14

/** Cadence de l'animation de frappe (ms par lettre). */
const TYPE_MS = 230
const HAND_MS = 140
const TRICK_START = 2400

export type DemoStage =
  | 'appear'
  | 'trick'
  | 'type'
  | 'parry'
  | 'strike'
  | 'feintTell'
  | 'feintWait'
  | 'feintOpen'
  | 'hitWait'
  | 'hit'

export type DemoFoeMood = 'idle' | 'windup' | 'hurt' | 'stunned'

export interface DemoFrame {
  stage: DemoStage
  /** La carte d'attaque est visible. */
  card: boolean
  /** Part restante du compte à rebours (1 → 0). */
  windupLeft: number
  /** Lettres déjà tapées du mot de l'attaque. */
  typed: number
  /** Lettres déjà tapées du coup du joueur. */
  handTyped: number
  /** Les dégâts du coup final sont affichés. */
  damage: boolean
  /** Une lettre du coup vient d'être tapée : petit coup. */
  tap: boolean
  foe: DemoFoeMood
  /** Le joueur vient d'encaisser un coup. */
  playerHit: boolean
  /** L'ennemi se jette sur le joueur. */
  foeStrike: boolean
}

interface Marks {
  doneAt: number
  strikeStart: number
  total: number
}

function marks(scene: SceneDef, answerLen: number, handLen: number): Marks {
  const strikeLen = HAND_MS * handLen + 1100
  if (scene.kind === 'parry') {
    const doneAt = TRICK_START + TYPE_MS * answerLen
    const strikeStart = doneAt + 1700
    return { doneAt, strikeStart, total: strikeStart + strikeLen + 700 }
  }
  if (scene.kind === 'feint') {
    const strikeStart = 6400
    return { doneAt: 4800, strikeStart, total: strikeStart + strikeLen + 700 }
  }
  return { doneAt: 4200, strikeStart: Infinity, total: 6800 }
}

/** Durée totale d'une scène (ms). */
export function sceneDuration(scene: SceneDef, answerLen: number, handLen = 5): number {
  return marks(scene, answerLen, handLen).total
}

/** État de la scène à l'instant `t` (ms depuis son début). */
export function frameAt(scene: SceneDef, answerLen: number, handLen: number, t: number): DemoFrame {
  const m = marks(scene, answerLen, handLen)
  const base: DemoFrame = {
    stage: 'appear',
    card: true,
    windupLeft: 1,
    typed: 0,
    handTyped: 0,
    damage: false,
    tap: false,
    foe: 'windup',
    playerHit: false,
    foeStrike: false,
  }

  if (scene.kind === 'hit') {
    const left = Math.max(0, 1 - t / m.doneAt)
    if (t < 1400) return { ...base, windupLeft: left }
    if (t < m.doneAt) return { ...base, stage: 'hitWait', windupLeft: left }
    return {
      ...base,
      stage: 'hit',
      card: false,
      windupLeft: 0,
      foe: 'idle',
      playerHit: true,
      foeStrike: t < m.doneAt + 400,
    }
  }

  const strike = (): DemoFrame => {
    const since = t - m.strikeStart
    const handTyped = Math.min(handLen, Math.max(0, Math.floor(since / HAND_MS)))
    const landed = handTyped >= handLen
    const landedAt = HAND_MS * handLen
    // Chaque lettre est déjà un petit coup (tant que le mot n'est pas fini).
    const tap = handTyped >= 1 && !landed && since - handTyped * HAND_MS < 110
    return {
      ...base,
      stage: 'strike',
      card: false,
      windupLeft: 0,
      typed: scene.kind === 'parry' ? answerLen : 0,
      handTyped,
      damage: landed,
      tap,
      foe: (landed && since - landedAt < 450) || tap ? 'hurt' : 'stunned',
    }
  }

  if (scene.kind === 'feint') {
    if (t < 1300) return { ...base, stage: 'feintTell', windupLeft: 1 - t / m.doneAt }
    if (t < m.doneAt) return { ...base, stage: 'feintWait', windupLeft: 1 - t / m.doneAt }
    if (t < m.strikeStart) return { ...base, stage: 'feintOpen', card: false, windupLeft: 0, foe: 'stunned' }
    return strike()
  }

  const windupLeft = Math.max(0, 1 - t / (m.doneAt + 700))
  if (t < 1000) return { ...base, windupLeft }
  if (t < TRICK_START) return { ...base, stage: 'trick', windupLeft }
  if (t < m.doneAt) {
    return { ...base, stage: 'type', windupLeft, typed: Math.min(answerLen, Math.floor((t - TRICK_START) / TYPE_MS)) }
  }
  if (t < m.strikeStart) {
    return { ...base, stage: 'parry', card: false, windupLeft: 0, typed: answerLen, foe: 'stunned' }
  }
  return strike()
}

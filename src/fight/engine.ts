/**
 * Moteur du mode Combat : fonctions pures, sans DOM ni horloge.
 * Le temps avance par `tick(state, dtMs)` ; le hasard est injecté (`rng`).
 */
import { fold, isMatch } from '../engine/typing'
import {
  FOES,
  LAP,
  TECH_IDS,
  TECH_TUNING as TUNE,
  type AttackTrick,
  type FoeDef,
  type TechId,
  foeAt,
} from './foes'

export type Phase = 'intro' | 'fight' | 'super' | 'ko' | 'between' | 'victory' | 'defeat'
export type MoveKind = 'jab' | 'hook' | 'smash'

export const MOVE_KINDS: readonly MoveKind[] = ['jab', 'hook', 'smash']
/** Longueur des mots de chaque coup. */
export const MOVE_LEN: Record<MoveKind, readonly [number, number]> = {
  jab: [3, 4],
  hook: [5, 6],
  smash: [7, 9],
}
export const MOVE_DMG: Record<MoveKind, number> = { jab: 4, hook: 9, smash: 18 }
/** Part des dégâts d'un mot versée lettre par lettre ; le reste tombe avec le coup final. */
export const LETTER_SHARE = 0.4
export const MOVE_METER: Record<MoveKind, number> = { jab: 5, hook: 10, smash: 18 }

export const PLAYER_HP = 100
export const INTRO_MS = 2400
export const KO_MS = 1800
/** Temps d'étourdissement du joueur : coup encaissé, coup lourd, erreur, feinte avalée, annulation. */
export const STUN_HIT_MS = 450
export const STUN_HEAVY_MS = 700
export const STUN_MISS_MS = 280
export const STUN_BAIT_MS = 650
export const STUN_CANCEL_MS = 150
/** Étourdissement de l'adversaire : parade, feinte qui se perd dans le vide, fin de coup spécial. */
export const FOE_STUN_PARRY_MS = 1500
export const FOE_STUN_WHIFF_MS = 900
export const FOE_STUN_SUPER_MS = 1600
/** Bonus de dégâts contre un adversaire étourdi. */
export const STUN_DAMAGE = 1.5
export const HEAL_BETWEEN = 0.25
/** En survie, venir à bout du dernier adversaire d'un tour soigne davantage. */
export const HEAL_LAP = 0.6
const FX_LIFE_MS = 1100
const SHAKE_HIT_MS = 380

export interface Move {
  id: number
  kind: MoveKind
  word: string
  typed: number
  /** Dégâts déjà infligés par les lettres de ce mot (le coup final ne verse que le reste). */
  dealt: number
}

export interface Attack {
  id: number
  /** Ce qu'il faut taper. */
  answer: string
  /** Ce qui est affiché (mot à l'envers, mélangé, ou identique). */
  shown: string
  typed: number
  trick: AttackTrick
  /** Fausse attaque : la parer est une erreur, l'ignorer ouvre la garde adverse. */
  feint: boolean
  heavy: boolean
  /** Temps écoulé / durée de préparation (ms). */
  elapsed: number
  windup: number
  dmg: number
  /** Pour « fading » : rang de disparition de chaque lettre. */
  fadeRank: readonly number[]
}

export type Lock = { kind: 'move'; id: number } | { kind: 'attack'; id: number }

export interface SuperRun {
  text: string
  pos: number
  timeLeft: number
  errors: number
}

export type FxKind = 'tick' | 'dmg' | 'crit' | 'hurt' | 'parry' | 'bait' | 'whiff' | 'heal' | 'say'

export interface Fx {
  id: number
  kind: FxKind
  side: 'foe' | 'player' | 'center'
  text?: string
  bornAt: number
}

export interface FightStats {
  damageDealt: number
  damageTaken: number
  parries: number
  baits: number
  whiffs: number
  moves: number
  supers: number
  keystrokes: number
  correct: number
}

export interface FightState {
  /** Duel contre un seul adversaire choisi : la victoire arrive au premier K.O. */
  duel: boolean
  /** Survie : les adversaires s'enchaînent sans fin, de plus en plus durs. */
  endless: boolean
  phase: Phase
  /** Index du combat (adversaire = `foeAt(round, endless)`). */
  round: number
  /** Temps de jeu écoulé (ms). */
  time: number
  /** Compte à rebours de l'intro et du K.O. (ms). */
  phaseMs: number
  hp: number
  maxHp: number
  foeHp: number
  foeMax: number
  score: number
  chain: number
  maxChain: number
  /** Jauge de coup spécial, 0..100. */
  meter: number
  hand: Move[]
  attacks: Attack[]
  lock: Lock | null
  stunMs: number
  foeStunMs: number
  nextAttackIn: number
  nextId: number
  pool: readonly string[]
  techs: Partial<Record<TechId, number>>
  offers: TechId[]
  superRun: SuperRun | null
  fx: Fx[]
  shakeMs: number
  roundsWon: number
  stats: FightStats
  // Repères d'animation (temps de jeu), null tant que l'événement n'a pas eu lieu.
  lastMoveAt: number | null
  lastMoveKind: MoveKind | null
  /** Série au moment du dernier coup final (varie le geste : direct / croisé, crochet / uppercut…). */
  lastMoveChain: number
  lastFoeHitAt: number | null
  lastPlayerHitAt: number | null
  lastParryAt: number | null
  lastErrorAt: number | null
  /** Dernière lettre d'un coup (petit coup) et alternance poing avant / poing arrière. */
  lastTapAt: number | null
  tapSide: 0 | 1
  /** Le dernier coup reçu par l'adversaire était un gros coup (sinon, une simple lettre). */
  lastFoeHitHeavy: boolean
}

const stacks = (s: FightState, id: TechId): number => s.techs[id] ?? 0
const foeOf = (s: FightState): FoeDef => foeAt(s.round, s.endless)
const firstLetter = (word: string): string => fold(word.charAt(0)).toLowerCase()
const LETTER = /^\p{L}$/u

// --- Mots --------------------------------------------------------------------

const anagramCache = new WeakMap<readonly string[], Set<string>>()
const sortedLetters = (w: string): string => [...w].sort().join('')

/** Clés de lettres triées portées par un seul mot de la liste : leurs anagrammes n'ont qu'une solution. */
function uniqueAnagramKeys(pool: readonly string[]): Set<string> {
  const cached = anagramCache.get(pool)
  if (cached) return cached
  const seen = new Map<string, number>()
  for (const w of pool) {
    const k = sortedLetters(w)
    seen.set(k, (seen.get(k) ?? 0) + 1)
  }
  const unique = new Set<string>()
  for (const [k, n] of seen) if (n === 1) unique.add(k)
  anagramCache.set(pool, unique)
  return unique
}

function pickWord(
  pool: readonly string[],
  [min, max]: readonly [number, number],
  avoid: ReadonlySet<string>,
  rng: () => number,
  accept: (w: string) => boolean = () => true,
): string | null {
  if (pool.length === 0) return null
  for (let i = 0; i < 120; i++) {
    const w = pool[Math.floor(rng() * pool.length)]
    if (w.length < min || w.length > max) continue
    if (avoid.has(firstLetter(w)) || !accept(w)) continue
    return w
  }
  return null
}

/** Initiales déjà utilisées par la main et les attaques (une initiale = une seule cible possible). */
function usedLetters(s: FightState, exceptMove?: number): Set<string> {
  const used = new Set<string>()
  for (const m of s.hand) if (m.id !== exceptMove) used.add(firstLetter(m.word))
  for (const a of s.attacks) used.add(firstLetter(a.answer))
  return used
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Mot affiché pour un déguisement. « scramble » garde la 1re lettre (c'est elle qui sert à viser). */
export function disguise(word: string, trick: AttackTrick, rng: () => number): string {
  if (trick === 'mirror') return [...word].reverse().join('')
  if (trick === 'scramble' && word.length >= 4) {
    for (let i = 0; i < 12; i++) {
      const shown = word[0] + shuffled([...word.slice(1)], rng).join('')
      if (shown !== word) return shown
    }
  }
  return word
}

/** Combien de lettres d'une attaque « fading » ont déjà disparu. */
export function fadeHidden(a: Attack): number {
  if (a.trick !== 'fading') return 0
  const p = a.elapsed / a.windup
  return Math.max(0, Math.min(a.answer.length, Math.floor(((p - 0.3) / 0.55) * a.answer.length)))
}

// --- Construction ------------------------------------------------------------

function emptyStats(): FightStats {
  return {
    damageDealt: 0,
    damageTaken: 0,
    parries: 0,
    baits: 0,
    whiffs: 0,
    moves: 0,
    supers: 0,
    keystrokes: 0,
    correct: 0,
  }
}

export function newFight(duel = false, endless = false): FightState {
  return {
    duel,
    endless,
    phase: 'intro',
    round: 0,
    time: 0,
    phaseMs: INTRO_MS,
    hp: PLAYER_HP,
    maxHp: PLAYER_HP,
    foeHp: FOES[0].hp,
    foeMax: FOES[0].hp,
    score: 0,
    chain: 0,
    maxChain: 0,
    meter: 0,
    hand: [],
    attacks: [],
    lock: null,
    stunMs: 0,
    foeStunMs: 0,
    nextAttackIn: 0,
    nextId: 1,
    pool: [],
    techs: {},
    offers: [],
    superRun: null,
    fx: [],
    shakeMs: 0,
    roundsWon: 0,
    stats: emptyStats(),
    lastMoveAt: null,
    lastMoveKind: null,
    lastMoveChain: 0,
    lastFoeHitAt: null,
    lastPlayerHitAt: null,
    lastParryAt: null,
    lastErrorAt: null,
    lastTapAt: null,
    tapSide: 0,
    lastFoeHitHeavy: true,
  }
}

function addFx(s: FightState, kind: FxKind, side: Fx['side'], text?: string): FightState {
  return { ...s, nextId: s.nextId + 1, fx: [...s.fx, { id: s.nextId, kind, side, text, bornAt: s.time }] }
}

function dealHand(s: FightState, rng: () => number): FightState {
  let next: FightState = { ...s, hand: [] }
  const hand: Move[] = []
  for (const kind of MOVE_KINDS) {
    const avoid = new Set([...hand.map((m) => firstLetter(m.word)), ...usedLetters({ ...next, hand: [] })])
    const word = pickWord(s.pool, MOVE_LEN[kind], avoid, rng)
    if (word) {
      hand.push({ id: next.nextId, kind, word, typed: 0, dealt: 0 })
      next = { ...next, nextId: next.nextId + 1 }
    }
  }
  return { ...next, hand }
}

/** Commence le combat contre l'adversaire `round` (annonce, puis combat). */
export function enterRound(s: FightState, round: number, pool: readonly string[], rng: () => number = Math.random): FightState {
  const foe = foeAt(round, s.endless)
  const base: FightState = {
    ...s,
    phase: 'intro',
    round,
    phaseMs: INTRO_MS,
    foeHp: foe.hp,
    foeMax: foe.hp,
    attacks: [],
    lock: null,
    stunMs: 0,
    foeStunMs: 0,
    chain: 0,
    offers: [],
    superRun: null,
    pool,
    nextAttackIn: INTRO_MS + 1800,
  }
  return dealHand(base, rng)
}

// --- Aides de combat ---------------------------------------------------------

const power = (s: FightState): number => 1 + TUNE.power * stacks(s, 'power')
const focus = (s: FightState): number => 1 + TUNE.focus * stacks(s, 'focus')
const chainBonus = (chain: number): number => 1 + 0.12 * Math.min(Math.max(chain - 1, 0), 12)

function clearLock(s: FightState): FightState {
  if (!s.lock) return s
  const { kind, id } = s.lock
  return {
    ...s,
    lock: null,
    hand: kind === 'move' ? s.hand.map((m) => (m.id === id ? { ...m, typed: 0 } : m)) : s.hand,
    attacks: kind === 'attack' ? s.attacks.map((a) => (a.id === id ? { ...a, typed: 0 } : a)) : s.attacks,
  }
}

function koFoe(s: FightState): FightState {
  const bonus = 500 + Math.round(s.hp) * 5 + 250 * s.round
  const next: FightState = {
    ...s,
    phase: 'ko',
    phaseMs: KO_MS,
    foeHp: 0,
    attacks: [],
    lock: null,
    superRun: null,
    score: s.score + bonus,
    roundsWon: s.roundsWon + 1,
  }
  return addFx(next, 'say', 'center', 'K.O.')
}

function damageFoe(s: FightState, amount: number, heavy = true): FightState {
  const dmg = Math.min(Math.round(amount), s.foeHp)
  return {
    ...s,
    foeHp: s.foeHp - dmg,
    score: s.score + dmg,
    lastFoeHitAt: s.time,
    lastFoeHitHeavy: heavy,
    stats: { ...s.stats, damageDealt: s.stats.damageDealt + dmg },
  }
}

function miss(s: FightState): FightState {
  const cleared = clearLock(s)
  return {
    ...cleared,
    chain: 0,
    meter: Math.max(0, cleared.meter - 8),
    stunMs: Math.max(cleared.stunMs, STUN_MISS_MS),
    lastErrorAt: s.time,
    shakeMs: Math.max(cleared.shakeMs, 120),
  }
}

/** Dégâts totaux d'un mot (lettres + coup final), avec la série `chain` et l'état actuel de l'adversaire. */
function moveDamage(s: FightState, kind: MoveKind, chain: number): number {
  return Math.max(1, Math.round(MOVE_DMG[kind] * power(s) * chainBonus(chain) * (s.foeStunMs > 0 ? STUN_DAMAGE : 1)))
}

/** Une lettre juste d'un coup : déjà un petit coup, sans attendre la fin du mot. */
function hitLetter(s: FightState, moveId: number, typed: number): FightState {
  const move = s.hand.find((m) => m.id === moveId)
  if (!move) return s
  const total = moveDamage(s, move.kind, s.chain + 1)
  // Répartition cumulée arrondie : la somme des lettres vaut exactement LETTER_SHARE du total.
  const target = Math.round((total * LETTER_SHARE * typed) / move.word.length)
  const amount = Math.max(0, target - move.dealt)
  let next: FightState = {
    ...s,
    hand: s.hand.map((m) => (m.id === moveId ? { ...m, dealt: m.dealt + amount } : m)),
    lastTapAt: s.time,
    tapSide: s.tapSide === 0 ? 1 : 0,
  }
  if (amount === 0) return next
  next = damageFoe(next, amount, false)
  next = addFx(next, 'tick', 'foe', `-${amount}`)
  return next.foeHp <= 0 ? koFoe(next) : next
}

function resolveMove(s: FightState, move: Move, rng: () => number): FightState {
  const chain = s.chain + 1
  const total = moveDamage(s, move.kind, chain)
  // Le coup final ne verse que ce que les lettres n'ont pas déjà infligé.
  const finisher = Math.max(1, total - move.dealt)
  const heavy = move.kind === 'smash' || chain >= 6
  let next: FightState = {
    ...s,
    lock: null,
    chain,
    maxChain: Math.max(s.maxChain, chain),
    meter: Math.min(100, s.meter + MOVE_METER[move.kind] * focus(s)),
    lastMoveAt: s.time,
    lastMoveKind: move.kind,
    lastMoveChain: chain,
    stats: { ...s.stats, moves: s.stats.moves + 1 },
  }
  next = damageFoe(next, finisher)
  next = addFx(next, heavy ? 'crit' : 'dmg', 'foe', `-${Math.min(finisher, s.foeHp)}`)
  if (chain >= 3 && chain % 3 === 0) next = addFx(next, 'say', 'center', `x${chain}`)
  if (next.foeHp <= 0) return koFoe(next)
  // Le mot joué est remplacé par un nouveau, de même catégorie.
  const avoid = usedLetters(next, move.id)
  const word = pickWord(next.pool, MOVE_LEN[move.kind], avoid, rng)
  const replacement: Move | null = word ? { id: next.nextId, kind: move.kind, word, typed: 0, dealt: 0 } : null
  return {
    ...next,
    nextId: next.nextId + (replacement ? 1 : 0),
    hand: next.hand.flatMap((m) => (m.id === move.id ? (replacement ? [replacement] : []) : [m])),
  }
}

function resolveParry(s: FightState, attack: Attack): FightState {
  const remaining = s.attacks.filter((a) => a.id !== attack.id)
  if (attack.feint) {
    const next: FightState = {
      ...s,
      attacks: remaining,
      lock: null,
      chain: 0,
      stunMs: Math.max(s.stunMs, STUN_BAIT_MS),
      lastErrorAt: s.time,
      stats: { ...s.stats, baits: s.stats.baits + 1 },
    }
    return addFx(next, 'bait', 'player', '!?')
  }
  const counter = TUNE.counterBase + TUNE.counter * stacks(s, 'counter')
  let next: FightState = {
    ...s,
    attacks: remaining,
    lock: null,
    chain: s.chain + 1,
    maxChain: Math.max(s.maxChain, s.chain + 1),
    foeStunMs: FOE_STUN_PARRY_MS,
    meter: Math.min(100, s.meter + 22 * focus(s)),
    score: s.score + 100,
    lastParryAt: s.time,
    stats: { ...s.stats, parries: s.stats.parries + 1 },
  }
  next = damageFoe(next, counter * power(s))
  next = addFx(next, 'parry', 'center', 'PARRY')
  return next.foeHp <= 0 ? koFoe(next) : next
}

function strikePlayer(s: FightState, attack: Attack): FightState {
  const foe = foeOf(s)
  const dmg = Math.max(1, Math.round(attack.dmg * TUNE.stoneskin ** stacks(s, 'stoneskin')))
  const base: FightState = {
    ...clearLock({ ...s, attacks: s.attacks.filter((a) => a.id !== attack.id) }),
    hp: Math.max(0, s.hp - dmg),
    chain: 0,
    meter: foe.erases ? s.meter * 0.5 : s.meter,
    stunMs: Math.max(s.stunMs, attack.heavy ? STUN_HEAVY_MS : STUN_HIT_MS),
    shakeMs: SHAKE_HIT_MS,
    lastPlayerHitAt: s.time,
    nextAttackIn: Math.max(s.nextAttackIn, 900),
    stats: { ...s.stats, damageTaken: s.stats.damageTaken + dmg },
  }
  const next = addFx(base, 'hurt', 'player', `-${dmg}`)
  return next.hp <= 0 ? { ...next, phase: 'defeat', lock: null, attacks: [] } : next
}

function whiff(s: FightState, attack: Attack): FightState {
  const base: FightState = {
    ...s,
    attacks: s.attacks.filter((a) => a.id !== attack.id),
    lock: s.lock?.kind === 'attack' && s.lock.id === attack.id ? null : s.lock,
    foeStunMs: Math.max(s.foeStunMs, FOE_STUN_WHIFF_MS),
    meter: Math.min(100, s.meter + 10 * focus(s)),
    stats: { ...s.stats, whiffs: s.stats.whiffs + 1 },
  }
  return addFx(base, 'whiff', 'foe', 'FEINT')
}

// --- Frappe ------------------------------------------------------------------

function itemAtLock(s: FightState): { word: string; typed: number } | null {
  if (!s.lock) return null
  const { kind, id } = s.lock
  const item = kind === 'move' ? s.hand.find((m) => m.id === id) : s.attacks.find((a) => a.id === id)
  return item ? { word: kind === 'move' ? (item as Move).word : (item as Attack).answer, typed: item.typed } : null
}

function advance(s: FightState, lock: Lock, typed: number): FightState {
  return lock.kind === 'move'
    ? { ...s, hand: s.hand.map((m) => (m.id === lock.id ? { ...m, typed } : m)) }
    : { ...s, attacks: s.attacks.map((a) => (a.id === lock.id ? { ...a, typed } : a)) }
}

function pressSuper(s: FightState, ch: string): FightState {
  const run = s.superRun
  if (!run) return s
  const counted: FightState = { ...s, stats: { ...s.stats, keystrokes: s.stats.keystrokes + 1 } }
  if (!isMatch(run.text.charAt(run.pos), ch, false)) {
    return { ...counted, superRun: { ...run, errors: run.errors + 1, timeLeft: run.timeLeft - 500 }, lastErrorAt: s.time }
  }
  const pos = run.pos + 1
  let next: FightState = {
    ...counted,
    stats: { ...counted.stats, correct: counted.stats.correct + 1 },
    superRun: { ...run, pos },
  }
  next = damageFoe(next, 1.5 * power(s), false)
  if (next.foeHp <= 0) return koFoe(next)
  if (pos < run.text.length) return next
  const bonus = (run.errors === 0 ? 45 : 20) * power(s)
  next = damageFoe(next, bonus)
  next = addFx(next, 'crit', 'foe', `-${Math.round(bonus)}`)
  if (next.foeHp <= 0) return koFoe(next)
  return endSuper(next, run.errors === 0 ? 'PERFECT' : undefined)
}

export const superReady = (s: FightState): boolean => s.phase === 'fight' && s.meter >= 100 && s.stunMs <= 0

/** Déclenche le coup spécial : l'adversaire est figé, on tape une vraie phrase. */
export function startSuper(s: FightState, text: string): FightState {
  if (!superReady(s) || text.length === 0) return s
  const cleared = clearLock(s)
  const next: FightState = {
    ...cleared,
    phase: 'super',
    meter: 0,
    attacks: [],
    superRun: { text, pos: 0, timeLeft: Math.min(24000, Math.max(10000, text.length * 260)), errors: 0 },
    stats: { ...cleared.stats, supers: cleared.stats.supers + 1 },
  }
  return addFx(next, 'say', 'center', 'SUPER')
}

function endSuper(s: FightState, say?: string): FightState {
  const next: FightState = {
    ...s,
    phase: 'fight',
    superRun: null,
    attacks: [],
    foeStunMs: FOE_STUN_SUPER_MS,
    nextAttackIn: 2200,
  }
  return say ? addFx(next, 'say', 'center', say) : next
}

/** Une touche enfoncée. */
export function press(s: FightState, ch: string, rng: () => number = Math.random): FightState {
  if (s.phase === 'super') return pressSuper(s, ch)
  if (s.phase !== 'fight' || s.stunMs > 0 || !LETTER.test(ch)) return s
  const want = fold(ch).toLowerCase()
  const counted: FightState = { ...s, stats: { ...s.stats, keystrokes: s.stats.keystrokes + 1 } }

  let lock = counted.lock
  let typed = 0
  if (lock) {
    const item = itemAtLock(counted)
    if (!item) return miss({ ...counted, lock: null })
    if (firstLetter(item.word.charAt(item.typed)) !== want) return miss(counted)
    typed = item.typed
  } else {
    const attack = counted.attacks.find((a) => firstLetter(a.answer) === want)
    const move = counted.hand.find((m) => firstLetter(m.word) === want)
    // Une initiale n'est portée que par une seule cible ; en cas de doute, la parade est prioritaire.
    if (attack) lock = { kind: 'attack', id: attack.id }
    else if (move) lock = { kind: 'move', id: move.id }
    else return miss(counted)
  }

  const word =
    lock.kind === 'move'
      ? (counted.hand.find((m) => m.id === lock.id)?.word ?? '')
      : (counted.attacks.find((a) => a.id === lock.id)?.answer ?? '')
  typed += 1
  const progressed: FightState = {
    ...advance({ ...counted, lock }, lock, typed),
    stats: { ...counted.stats, correct: counted.stats.correct + 1 },
  }
  if (typed < word.length) return lock.kind === 'move' ? hitLetter(progressed, lock.id, typed) : progressed

  if (lock.kind === 'move') {
    const move = progressed.hand.find((m) => m.id === lock.id)
    return move ? resolveMove(progressed, { ...move, typed }, rng) : progressed
  }
  const attack = progressed.attacks.find((a) => a.id === lock.id)
  return attack ? resolveParry(progressed, attack) : progressed
}

/** Retour arrière : abandonne la cible en cours (brève hésitation). */
export function cancelLock(s: FightState): FightState {
  if (s.phase !== 'fight' || !s.lock) return s
  return { ...clearLock(s), stunMs: Math.max(s.stunMs, STUN_CANCEL_MS) }
}

// --- Entre deux combats ------------------------------------------------------

export function pickOffers(s: FightState, rng: () => number, n = 3): TechId[] {
  const pool = TECH_IDS.filter((t) => t !== 'medic' || s.hp < s.maxHp).slice()
  const out: TechId[] = []
  while (out.length < n && pool.length > 0) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
  return out
}

export function chooseTech(s: FightState, id: TechId): FightState {
  if (s.phase !== 'between' || !s.offers.includes(id)) return s
  let next: FightState = { ...s, techs: { ...s.techs, [id]: stacks(s, id) + 1 }, offers: [] }
  if (id === 'vitality') next = { ...next, maxHp: next.maxHp + TUNE.vitality, hp: next.hp + TUNE.vitality }
  if (id === 'medic') next = { ...next, hp: Math.min(next.maxHp, next.hp + TUNE.medic) }
  return next
}

// --- Temps -------------------------------------------------------------------

function spawnAttack(s: FightState, rng: () => number): FightState {
  const foe = foeOf(s)
  const heavy = rng() < foe.heavyChance
  const feint = rng() < foe.feintChance
  const trick = foe.tricks[Math.floor(rng() * foe.tricks.length)]
  const range: readonly [number, number] = heavy ? [foe.wordLen[1], foe.wordLen[1] + 2] : foe.wordLen
  const unique = uniqueAnagramKeys(s.pool)
  const answer = pickWord(
    s.pool,
    range,
    usedLetters(s),
    rng,
    trick === 'scramble' ? (w) => w.length >= 4 && unique.has(sortedLetters(w)) : undefined,
  )
  if (!answer) return { ...s, nextAttackIn: 300 }
  const shown = disguise(answer, trick, rng)
  const effective: AttackTrick = trick === 'scramble' && shown === answer ? 'plain' : trick
  const reflex = 1 + TUNE.reflex * stacks(s, 'reflex')
  const attack: Attack = {
    id: s.nextId,
    answer,
    shown,
    typed: 0,
    trick: effective,
    feint,
    heavy,
    elapsed: 0,
    windup: (foe.windupBase + foe.perLetter * answer.length) * (heavy ? 1.35 : 1) * reflex,
    dmg: foe.dmg * (heavy ? 1.8 : 1),
    fadeRank: shuffled(Array.from({ length: answer.length }, (_, i) => i), rng),
  }
  const rage = s.foeHp < s.foeMax * 0.4 ? 0.75 : 1
  const gap = (foe.gap[0] + rng() * (foe.gap[1] - foe.gap[0])) * rage
  return { ...s, attacks: [...s.attacks, attack], nextId: s.nextId + 1, nextAttackIn: gap }
}

/** Fait avancer le combat de `dtMs` millisecondes. */
export function tick(s: FightState, dtMs: number, rng: () => number = Math.random): FightState {
  if (dtMs <= 0) return s
  const time = s.time + dtMs
  let next: FightState = {
    ...s,
    time,
    shakeMs: Math.max(0, s.shakeMs - dtMs),
    stunMs: Math.max(0, s.stunMs - dtMs),
    foeStunMs: Math.max(0, s.foeStunMs - dtMs),
    fx: s.fx.filter((f) => time - f.bornAt < FX_LIFE_MS),
  }

  if (next.phase === 'intro') {
    const phaseMs = next.phaseMs - dtMs
    next = phaseMs > 0 ? { ...next, phaseMs } : addFx({ ...next, phase: 'fight', phaseMs: 0 }, 'say', 'center', 'FIGHT!')
    return next
  }

  if (next.phase === 'super' && next.superRun) {
    const timeLeft = next.superRun.timeLeft - dtMs
    return timeLeft > 0 ? { ...next, superRun: { ...next.superRun, timeLeft } } : endSuper(next)
  }

  if (next.phase === 'ko') {
    const phaseMs = next.phaseMs - dtMs
    if (phaseMs > 0) return { ...next, phaseMs }
    if (next.duel || (!next.endless && next.round >= FOES.length - 1)) {
      // L'écran de victoire s'en charge : pas d'annonce en plus.
      return { ...next, phase: 'victory', score: next.score + (next.duel ? 0 : 2000) }
    }
    const lapDone = next.endless && next.round % LAP === LAP - 1
    const healed = Math.min(next.maxHp, next.hp + Math.round(next.maxHp * (lapDone ? HEAL_LAP : HEAL_BETWEEN)))
    const rested: FightState = { ...next, phase: 'between', hp: healed, offers: pickOffers(next, rng) }
    return healed > next.hp ? addFx(rested, 'heal', 'player', `+${healed - next.hp}`) : rested
  }

  if (next.phase !== 'fight') return next

  // Les attaques en préparation avancent ; celles qui arrivent au bout frappent (ou se perdent si feintes).
  next = { ...next, attacks: next.attacks.map((a) => ({ ...a, elapsed: a.elapsed + dtMs })) }
  for (const a of next.attacks.filter((x) => x.elapsed >= x.windup)) {
    next = a.feint ? whiff(next, a) : strikePlayer(next, a)
    if (next.phase === 'defeat') return next
  }

  // Nouvelle attaque : l'adversaire n'en lance pas quand il est étourdi.
  if (next.foeStunMs <= 0 && next.attacks.length < foeOf(next).maxAttacks) {
    const nextAttackIn = next.nextAttackIn - dtMs
    next = nextAttackIn > 0 ? { ...next, nextAttackIn } : spawnAttack(next, rng)
  }
  return next
}

/** Précision (0..1) sur tout le tournoi. */
export function accuracy(s: FightState): number {
  return s.stats.keystrokes === 0 ? 1 : s.stats.correct / s.stats.keystrokes
}

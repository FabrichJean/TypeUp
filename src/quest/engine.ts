/**
 * Moteur du mode Quête : fonctions pures, sans DOM ni horloge.
 * Le temps avance par `tick(state, dtMs)` et le hasard est injecté (`rng`).
 */
import { comboMultiplier, fold, isMatch } from '../engine/typing'
import { RELIC_IDS, RELIC_TUNING as TUNE, type RelicId } from './relics'

export type Phase = 'fight' | 'boss' | 'upgrade' | 'over'

/** Position (0..1 de la largeur) où les ennemis atteignent le joueur. */
export const PLAYER_X = 0.1
export const START_HP = 5
export const LANES = 5
/** Un boss tous les `BOSS_EVERY` étages. */
export const BOSS_EVERY = 3
/** Durée de l'annonce d'étage (ms). */
export const BANNER_MS = 1800
/** Au-delà de cette charge (ms), le boss frappe. */
export const BOSS_STRIKE_MS = 8000

const FX_LIFE_MS = 900
const SHAKE_HIT_MS = 380
const SHAKE_MISS_MS = 130
/** Recul imposé aux ennemis à chaque erreur (part de la largeur). */
const LUNGE = 0.03

export interface Enemy {
  id: number
  word: string
  /** Nombre de caractères déjà tapés. */
  typed: number
  /** Position horizontale (1 = bord droit, PLAYER_X = contact). */
  x: number
  lane: number
  golden: boolean
  /** Multiplicateur de vitesse individuel. */
  speed: number
}

export interface Boss {
  text: string
  name: string
  /** Index du prochain caractère à taper. */
  pos: number
  /** Jauge de colère (ms) : le boss frappe quand elle atteint BOSS_STRIKE_MS. */
  charge: number
}

export type FxKind = 'kill' | 'gold' | 'hit' | 'shield' | 'nova' | 'heal' | 'miss'

export interface Fx {
  id: number
  kind: FxKind
  /** Position en fractions de l'arène. */
  x: number
  y: number
  text?: string
  bornAt: number
}

export interface QuestState {
  phase: Phase
  floor: number
  hp: number
  maxHp: number
  score: number
  combo: number
  maxCombo: number
  kills: number
  floorsCleared: number
  keystrokes: number
  correct: number
  errors: number
  /** Temps de jeu écoulé (ms). */
  time: number
  floorHpLost: number
  /** Prime de fin du dernier étage (affichée pendant le choix de relique). */
  lastBonus: number

  enemies: Enemy[]
  lockId: number | null
  nextId: number
  spawned: number
  total: number
  spawnIn: number
  pool: readonly string[]
  boss: Boss | null

  relics: Partial<Record<RelicId, number>>
  shield: number
  freezeMs: number
  sinceHeal: number
  offers: RelicId[]

  fx: Fx[]
  shakeMs: number
  bannerMs: number
  lastErrorAt: number | null
  lastHitAt: number | null
}

export interface FloorContext {
  /** Mots des ennemis de l'étage (ignoré pour un boss). */
  pool: readonly string[]
  /** Texte du boss (obligatoire sur un étage de boss). */
  bossText?: string
  bossName?: string
}

// --- Règles de l'étage -------------------------------------------------------

export const isBossFloor = (floor: number): boolean => floor % BOSS_EVERY === 0

/** Numéro du boss (0 pour le premier, à l'étage 3). */
export const bossIndex = (floor: number): number => Math.floor(floor / BOSS_EVERY) - 1

export const waveSize = (floor: number): number => Math.min(6 + 2 * floor, 30)

/** Vitesse de base, en largeurs d'arène par seconde. */
export const baseSpeed = (floor: number): number => 0.05 + 0.006 * floor

export const spawnGapMs = (floor: number): number => Math.max(900, 2500 - 120 * floor)

/** Longueur min/max des mots d'un étage. */
export function wordLengths(floor: number): readonly [number, number] {
  return [Math.min(3 + Math.floor(floor / 3), 8), Math.min(5 + Math.floor(floor / 2), 12)]
}

/** Ce que rapporte un caractère juste de la jauge de colère du boss (ms). */
export const bossDrainMs = (floor: number, hourglass: number): number =>
  Math.max(150, 320 - 10 * floor - 20 * hourglass)

const stacks = (s: QuestState, id: RelicId): number => s.relics[id] ?? 0

const firstLetter = (word: string): string => fold(word.charAt(0)).toLowerCase()

const laneY = (lane: number): number => (lane + 0.5) / LANES

// --- Construction ------------------------------------------------------------

export function newRun(): QuestState {
  return {
    phase: 'fight',
    floor: 0,
    hp: START_HP,
    maxHp: START_HP,
    score: 0,
    combo: 0,
    maxCombo: 0,
    kills: 0,
    floorsCleared: 0,
    keystrokes: 0,
    correct: 0,
    errors: 0,
    time: 0,
    floorHpLost: 0,
    lastBonus: 0,
    enemies: [],
    lockId: null,
    nextId: 1,
    spawned: 0,
    total: 0,
    spawnIn: 0,
    pool: [],
    boss: null,
    relics: {},
    shield: 0,
    freezeMs: 0,
    sinceHeal: 0,
    offers: [],
    fx: [],
    shakeMs: 0,
    bannerMs: 0,
    lastErrorAt: null,
    lastHitAt: null,
  }
}

/** Entre dans l'étage `floor` (combat ou boss). */
export function enterFloor(s: QuestState, floor: number, ctx: FloorContext): QuestState {
  const boss = isBossFloor(floor)
  return {
    ...s,
    phase: boss ? 'boss' : 'fight',
    floor,
    floorHpLost: 0,
    enemies: [],
    lockId: null,
    spawned: 0,
    total: boss ? 0 : waveSize(floor),
    spawnIn: 1200,
    pool: ctx.pool,
    boss: boss ? { text: ctx.bossText ?? '', name: ctx.bossName ?? '', pos: 0, charge: 0 } : null,
    offers: [],
    freezeMs: boss ? 0 : stacks(s, 'frost') * TUNE.frostSeconds * 1000,
    bannerMs: BANNER_MS,
  }
}

// --- Aides internes ----------------------------------------------------------

function addFx(s: QuestState, kind: FxKind, x: number, y: number, text?: string): QuestState {
  const fx: Fx = { id: s.nextId, kind, x, y, text, bornAt: s.time }
  return { ...s, nextId: s.nextId + 1, fx: [...s.fx, fx] }
}

function novaEvery(s: QuestState): number {
  const n = stacks(s, 'nova')
  return Math.max(TUNE.novaMin, TUNE.novaEvery - TUNE.novaStep * (n - 1))
}

function vampireEvery(s: QuestState): number {
  const n = stacks(s, 'vampire')
  return Math.max(TUNE.vampireMin, TUNE.vampireEvery - TUNE.vampireStep * (n - 1))
}

/** Retire un ennemi vaincu : points, soin du vampire, effet visuel. */
function kill(s: QuestState, e: Enemy): QuestState {
  const mult = comboMultiplier(s.combo)
  const goldBonus = e.golden ? e.word.length * 20 : 0
  // Les caractères déjà tapés ont été comptés à la frappe ; on ajoute le reste (nova) et la prime dorée.
  const bonus = (e.word.length - e.typed) * 10 * mult + goldBonus
  let next: QuestState = {
    ...s,
    enemies: s.enemies.filter((x) => x.id !== e.id),
    lockId: s.lockId === e.id ? null : s.lockId,
    kills: s.kills + 1,
    score: s.score + bonus,
    sinceHeal: s.sinceHeal + 1,
  }
  next = addFx(next, e.golden ? 'gold' : 'kill', e.x, laneY(e.lane), `+${e.word.length * 10 * mult + goldBonus}`)
  if (stacks(next, 'vampire') > 0 && next.sinceHeal >= vampireEvery(next)) {
    next = { ...next, sinceHeal: 0 }
    if (next.hp < next.maxHp) next = addFx({ ...next, hp: next.hp + 1 }, 'heal', PLAYER_X, 0.5, '+1')
  }
  return next
}

/** Étage terminé : primes puis choix d'une relique. */
function clearFloor(s: QuestState, rng: () => number): QuestState {
  const bonus = floorBonus(s.floor, s.floorHpLost === 0)
  return {
    ...s,
    phase: 'upgrade',
    lastBonus: bonus,
    score: s.score + bonus,
    floorsCleared: s.floorsCleared + 1,
    enemies: [],
    lockId: null,
    offers: pickOffers(s, rng),
  }
}

/** Prime accordée en fin d'étage (pour l'affichage). */
export function floorBonus(floor: number, flawless: boolean): number {
  return 100 * floor + (flawless ? 200 * floor : 0)
}

export function pickOffers(s: QuestState, rng: () => number, n = 3): RelicId[] {
  const eligible = RELIC_IDS.filter((id) => {
    if (id === 'magnet') return stacks(s, id) === 0
    if (id === 'heart') return s.hp < s.maxHp
    return true
  })
  const pool = eligible.slice()
  const out: RelicId[] = []
  while (out.length < n && pool.length > 0) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
  }
  return out
}

export function chooseRelic(s: QuestState, id: RelicId): QuestState {
  if (s.phase !== 'upgrade' || !s.offers.includes(id)) return s
  const relics = { ...s.relics, [id]: stacks(s, id) + 1 }
  let next: QuestState = { ...s, relics, offers: [] }
  switch (id) {
    case 'shield':
      next = { ...next, shield: next.shield + TUNE.shieldCharges }
      break
    case 'heart':
      next = { ...next, hp: Math.min(next.maxHp, next.hp + TUNE.heartHeal) }
      break
    case 'armor':
      next = { ...next, maxHp: next.maxHp + 1, hp: next.hp + 1 }
      break
    default:
      break
  }
  return next
}

// --- Frappe ------------------------------------------------------------------

function registerHit(s: QuestState): QuestState {
  const combo = s.combo + 1
  return {
    ...s,
    combo,
    maxCombo: Math.max(s.maxCombo, combo),
    keystrokes: s.keystrokes + 1,
    correct: s.correct + 1,
    score: s.score + 10 * comboMultiplier(combo),
  }
}

function registerMiss(s: QuestState): QuestState {
  const base: QuestState = {
    ...s,
    keystrokes: s.keystrokes + 1,
    errors: s.errors + 1,
    lastErrorAt: s.time,
    shakeMs: Math.max(s.shakeMs, SHAKE_MISS_MS),
  }
  if (base.shield > 0) {
    return addFx({ ...base, shield: base.shield - 1 }, 'shield', PLAYER_X, 0.5)
  }
  const combo = stacks(base, 'magnet') > 0 ? Math.floor(base.combo / 2) : 0
  return {
    ...base,
    combo,
    // Chaque erreur fait avancer les ennemis (sans les amener au contact) et charge le boss.
    enemies: base.enemies.map((e) => ({ ...e, x: Math.max(PLAYER_X + 0.005, e.x - LUNGE) })),
    boss: base.boss ? { ...base.boss, charge: base.boss.charge + 1200 } : null,
  }
}

function pressFight(s: QuestState, ch: string): QuestState {
  const want = fold(ch).toLowerCase()
  const locked = s.enemies.find((e) => e.id === s.lockId)

  if (locked) {
    if (firstLetter(locked.word.charAt(locked.typed)) !== want) return registerMiss(s)
    const typed = locked.typed + 1
    let next = registerHit({ ...s, enemies: s.enemies.map((e) => (e.id === locked.id ? { ...e, typed } : e)) })
    if (typed >= locked.word.length) next = kill(next, { ...locked, typed })
    return applyNova(next)
  }

  // Pas de cible : on prend l'ennemi le plus proche dont le mot commence par cette lettre.
  const candidates = s.enemies.filter((e) => firstLetter(e.word) === want)
  if (candidates.length === 0) return registerMiss(s)
  const target = candidates.reduce((a, b) => (b.x < a.x ? b : a))
  let next = registerHit({
    ...s,
    lockId: target.id,
    enemies: s.enemies.map((e) => (e.id === target.id ? { ...e, typed: 1 } : e)),
  })
  if (target.word.length <= 1) next = kill(next, { ...target, typed: 1 })
  return applyNova(next)
}

/** La nova abat tous les ennemis à l'écran à chaque palier de combo. */
function applyNova(s: QuestState): QuestState {
  if (stacks(s, 'nova') === 0 || s.combo === 0 || s.combo % novaEvery(s) !== 0) return s
  if (s.enemies.length === 0) return s
  let next = s
  for (const e of s.enemies) next = kill(next, e)
  return addFx(next, 'nova', 0.5, 0.5)
}

function pressBoss(s: QuestState, ch: string, rng: () => number): QuestState {
  const boss = s.boss
  if (!boss) return s
  const expected = boss.text.charAt(boss.pos)
  if (!isMatch(expected, ch, false)) return registerMiss(s)
  const pos = boss.pos + 1
  const charge = Math.max(0, boss.charge - bossDrainMs(s.floor, stacks(s, 'hourglass')))
  const next = registerHit({ ...s, boss: { ...boss, pos, charge } })
  if (pos < boss.text.length) return next
  // Boss vaincu : prime proportionnelle à la longueur du texte.
  const reward = boss.text.length * 5 * comboMultiplier(next.combo)
  const rewarded = addFx({ ...next, score: next.score + reward, kills: next.kills + 1 }, 'gold', 0.5, 0.4, `+${reward}`)
  return clearFloor(rewarded, rng)
}

/** Une touche enfoncée. Les espaces sont ignorés pendant les combats (les mots n'en ont pas). */
export function press(s: QuestState, ch: string, rng: () => number = Math.random): QuestState {
  if (ch.length === 0) return s
  if (s.phase === 'fight') return ch === ' ' ? s : pressFight(s, ch)
  if (s.phase === 'boss') return pressBoss(s, ch, rng)
  return s
}

/** Abandonne la cible actuelle (la progression sur ce mot est perdue). */
export function unlock(s: QuestState): QuestState {
  if (s.lockId === null) return s
  return {
    ...s,
    lockId: null,
    enemies: s.enemies.map((e) => (e.id === s.lockId ? { ...e, typed: 0 } : e)),
  }
}

// --- Temps -------------------------------------------------------------------

function spawnEnemy(s: QuestState, rng: () => number): Enemy | null {
  const letters = new Set(s.enemies.map((e) => firstLetter(e.word)))
  const words = new Set(s.enemies.map((e) => e.word))
  const freeLanes = Array.from({ length: LANES }, (_, l) => l).filter(
    (l) => !s.enemies.some((e) => e.lane === l && e.x > 0.7),
  )
  if (freeLanes.length === 0 || s.pool.length === 0) return null
  const [min, max] = wordLengths(s.floor)
  for (let i = 0; i < 40; i++) {
    const word = s.pool[Math.floor(rng() * s.pool.length)]
    if (word.length < min || word.length > max) continue
    if (letters.has(firstLetter(word)) || words.has(word)) continue
    return {
      id: s.nextId,
      word,
      typed: 0,
      x: 1,
      lane: freeLanes[Math.floor(rng() * freeLanes.length)],
      golden: rng() < Math.min(0.5, 0.06 + TUNE.goldChance * stacks(s, 'gold')),
      speed: 0.85 + 0.3 * rng(),
    }
  }
  return null
}

function hurt(s: QuestState, x: number, y: number): QuestState {
  const hp = s.hp - 1
  const next: QuestState = {
    ...s,
    hp,
    combo: 0,
    floorHpLost: s.floorHpLost + 1,
    shakeMs: SHAKE_HIT_MS,
    lastHitAt: s.time,
  }
  const withFx = addFx(next, 'hit', x, y, '-1')
  return hp <= 0 ? { ...withFx, phase: 'over', lockId: null } : withFx
}

/** Fait avancer le jeu de `dtMs` millisecondes. */
export function tick(s: QuestState, dtMs: number, rng: () => number = Math.random): QuestState {
  if (dtMs <= 0) return s
  const time = s.time + dtMs
  let next: QuestState = {
    ...s,
    time,
    shakeMs: Math.max(0, s.shakeMs - dtMs),
    bannerMs: Math.max(0, s.bannerMs - dtMs),
    fx: s.fx.filter((f) => time - f.bornAt < FX_LIFE_MS),
  }

  if (next.phase === 'fight') {
    const freeze = Math.max(0, next.freezeMs - dtMs)
    const slow = TUNE.hourglassSlow ** stacks(next, 'hourglass')
    const step = (baseSpeed(next.floor) * slow * dtMs) / 1000
    const moved =
      next.freezeMs > 0 ? next.enemies : next.enemies.map((e) => ({ ...e, x: e.x - step * e.speed }))
    next = { ...next, freezeMs: freeze, enemies: moved }

    // Contacts avec le joueur.
    for (const e of next.enemies.filter((x) => x.x <= PLAYER_X)) {
      next = hurt(
        { ...next, enemies: next.enemies.filter((x) => x.id !== e.id), lockId: next.lockId === e.id ? null : next.lockId },
        PLAYER_X,
        laneY(e.lane),
      )
      if (next.phase === 'over') return next
    }

    // Apparitions.
    if (next.spawned < next.total) {
      const spawnIn = next.spawnIn - dtMs
      if (spawnIn > 0) {
        next = { ...next, spawnIn }
      } else {
        const enemy = spawnEnemy(next, rng)
        next = enemy
          ? {
              ...next,
              enemies: [...next.enemies, enemy],
              nextId: next.nextId + 1,
              spawned: next.spawned + 1,
              spawnIn: spawnGapMs(next.floor) * (0.8 + 0.4 * rng()),
            }
          : { ...next, spawnIn: 250 }
      }
    } else if (next.enemies.length === 0) {
      return clearFloor(next, rng)
    }
  } else if (next.phase === 'boss' && next.boss) {
    const charge = next.boss.charge + dtMs
    if (charge >= BOSS_STRIKE_MS) {
      next = hurt({ ...next, boss: { ...next.boss, charge: 0 } }, PLAYER_X, 0.5)
    } else {
      next = { ...next, boss: { ...next.boss, charge } }
    }
  }
  return next
}

/** Précision (0..1) sur toute la partie. */
export function accuracy(s: QuestState): number {
  return s.keystrokes === 0 ? 1 : s.correct / s.keystrokes
}

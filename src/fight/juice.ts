/**
 * Les « sensations » du combat : à partir de deux états successifs, décide des effets de mise en
 * scène (arrêt sur image, ralenti, secousse, flash, annonceur, foule). Pur, donc testable.
 */
import { LAP } from './foes'
import type { FightState } from './engine'

export type Flash = 'white' | 'gold' | 'red'
export type Announce =
  | { kind: 'chain'; tier: number }
  | { kind: 'record' }
  | { kind: 'lap'; lap: number }

export interface Juice {
  /** Arrêt sur image (ms réelles) : le jeu et les animations se figent. */
  freezeMs: number
  /** Ralenti (ms réelles) après l'éventuel arrêt sur image. */
  slowMs: number
  /** Secousse de l'écran, 0 (aucune) à 3 (très forte). */
  shake: 0 | 1 | 2 | 3
  flash: Flash | null
  /** Traits de vitesse qui jaillissent derrière l'action. */
  lines: boolean
  announce: Announce | null
  /** Gros impact sonore. */
  thump: boolean
  /** La foule réagit : 1 = applaudissements, 2 = ovation. */
  cheer: 0 | 1 | 2
}

export interface JuiceContext {
  /** Record de survie à battre (0 hors survie ou sans record). */
  bestSurvival: number
}

/** Facteur de ralenti du temps de jeu pendant `slowMs`. */
export const SLOW_FACTOR = 0.35

/** Palier de série : 0 sous 4, puis un de plus tous les 4. */
export const chainTier = (chain: number): number => (chain < 4 ? 0 : Math.floor(chain / 4))

/** Niveau d'énergie de la foule (0 calme … 3 en délire). */
export function crowdEnergy(s: FightState): 0 | 1 | 2 | 3 {
  if (s.phase === 'ko' || s.phase === 'victory' || s.phase === 'super') return 3
  if (s.chain >= 8) return 3
  if (s.chain >= 4) return 2
  if (s.chain >= 2) return 1
  return 0
}

const NONE: Juice = { freezeMs: 0, slowMs: 0, shake: 0, flash: null, lines: false, announce: null, thump: false, cheer: 0 }

/** Effets à jouer pour passer de `prev` à `next` (null si rien de notable). */
export function juiceFor(prev: FightState, next: FightState, ctx: JuiceContext = { bestSurvival: 0 }): Juice | null {
  if (prev === next) return null
  const j: Juice = { ...NONE }
  const bump = (n: Juice['shake']) => {
    if (n > j.shake) j.shake = n
  }
  const newFx = next.fx.filter((f) => f.id >= prev.nextId)

  // Fin du combat : le grand moment.
  if (next.phase === 'ko' && prev.phase !== 'ko') {
    j.freezeMs = 160
    j.slowMs = 1100
    j.flash = 'white'
    j.lines = true
    j.thump = true
    j.cheer = 2
    bump(3)
    if (next.endless && next.roundsWon > prev.roundsWon) {
      if (ctx.bestSurvival > 0 && prev.roundsWon <= ctx.bestSurvival && next.roundsWon > ctx.bestSurvival) {
        j.announce = { kind: 'record' }
      } else if (next.roundsWon % LAP === 0) {
        j.announce = { kind: 'lap', lap: next.roundsWon / LAP }
      }
    }
    return j
  }
  if (next.phase === 'defeat' && prev.phase !== 'defeat') {
    j.freezeMs = 140
    j.flash = 'red'
    j.thump = true
    bump(3)
    return j
  }
  if (next.phase === 'super' && prev.phase !== 'super') {
    j.flash = 'gold'
    j.lines = true
    j.cheer = 1
    bump(1)
    return j
  }

  // Coup final : plus il est lourd, plus l'arrêt sur image est long.
  if (next.stats.moves > prev.stats.moves) {
    if (newFx.some((f) => f.kind === 'crit' && f.side === 'foe')) {
      j.freezeMs = 75
      j.thump = true
      j.lines = true
      bump(2)
    } else {
      j.freezeMs = 28
      bump(1)
    }
  }
  if (next.stats.parries > prev.stats.parries) {
    j.freezeMs = Math.max(j.freezeMs, 60)
    j.flash = 'white'
    j.cheer = 1
    bump(1)
  }
  if (newFx.some((f) => f.kind === 'say' && f.text === 'PERFECT')) {
    j.freezeMs = Math.max(j.freezeMs, 120)
    j.flash = 'gold'
    j.lines = true
    j.cheer = 2
    j.thump = true
    bump(2)
  }
  if (next.hp < prev.hp) {
    j.freezeMs = Math.max(j.freezeMs, next.stunMs >= 700 ? 90 : 50)
    j.flash ??= 'red'
    bump(2)
  }

  // Séries : l'annonceur parle à chaque nouveau palier.
  const tier = chainTier(next.chain)
  if (next.chain > prev.chain && tier > chainTier(prev.chain)) {
    j.announce = { kind: 'chain', tier }
    j.cheer = Math.max(j.cheer, tier >= 3 ? 2 : 1) as 0 | 1 | 2
  }

  const any = j.freezeMs > 0 || j.shake > 0 || j.flash !== null || j.announce !== null || j.thump || j.cheer > 0
  return any ? j : null
}

/** Fusionne deux effets survenus dans la même image : le plus fort l'emporte. */
export function mergeJuice(a: Juice | null, b: Juice): Juice {
  if (!a) return b
  return {
    freezeMs: Math.max(a.freezeMs, b.freezeMs),
    slowMs: Math.max(a.slowMs, b.slowMs),
    shake: Math.max(a.shake, b.shake) as Juice['shake'],
    flash: b.flash ?? a.flash,
    lines: a.lines || b.lines,
    announce: b.announce ?? a.announce,
    thump: a.thump || b.thump,
    cheer: Math.max(a.cheer, b.cheer) as Juice['cheer'],
  }
}

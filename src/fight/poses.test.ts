import { describe, expect, it } from 'vitest'
import { FOES } from './foes'
import { enterRound, newFight, tick, type FightState } from './engine'
import {
  FOE_STRIKE,
  KICK_PEAK_MS,
  POSES,
  POSE_MS,
  POSE_NAMES,
  POSE_SECONDS,
  STEP_MS,
  footDepth,
  foePose,
  groundDrop,
  movePose,
  playerPose,
  type Joint,
  type PoseName,
} from './poses'

const POOL = ['chat', 'lune', 'vent', 'pomme', 'table', 'olive', 'sable', 'nuage', 'dragon', 'cheval', 'jardin', 'maison', 'orange', 'violon', 'fenetre']

function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function fight(over: Partial<FightState> = {}): FightState {
  return { ...enterRound(newFight(), 0, POOL, seeded(1)), phase: 'fight', nextAttackIn: 1e9, ...over }
}

const isRest = (p: PoseName) => p === 'idle' || p === 'idle2'
const AIRBORNE: readonly PoseName[] = ['flyKick', 'knockback']

describe('poses', () => {
  const joints = (j: Joint) => [j[0], j[1]]

  it('chaque pose est définie, avec des angles raisonnables', () => {
    for (const name of POSE_NAMES) {
      const p = POSES[name]
      expect(p, name).toBeDefined()
      for (const a of [p.torso, p.head, p.lie, p.spin, ...joints(p.backArm), ...joints(p.frontArm), ...joints(p.backLeg), ...joints(p.frontLeg)]) {
        expect(Number.isFinite(a)).toBe(true)
        expect(Math.abs(a)).toBeLessThanOrEqual(180)
      }
      expect(Number.isFinite(p.x) && Number.isFinite(p.drop)).toBe(true)
      expect(POSE_SECONDS[name]).toBeGreaterThan(0)
    }
  })

  it('tous les noms de pose sont distincts', () => {
    expect(new Set(POSE_NAMES).size).toBe(POSE_NAMES.length)
  })

  it('le bassin s\'abaisse pour que le pied le plus bas touche le sol, sauf en l\'air', () => {
    for (const name of POSE_NAMES) {
      const p = POSES[name]
      if (AIRBORNE.includes(name)) {
        expect(p.drop, name).toBeLessThan(0)
        continue
      }
      expect(p.drop, name).toBeGreaterThanOrEqual(0)
      const lowest = Math.max(footDepth(p.backLeg), footDepth(p.frontLeg))
      // hauteur du bassin = pied le plus bas : on ne flotte pas, on ne s'enfonce pas
      expect(96 - p.drop, name).toBeCloseTo(lowest, 5)
    }
  })

  it('groundDrop vaut 0 jambes tendues et grandit quand on fléchit', () => {
    expect(groundDrop([0, 0], [0, 0])).toBe(0)
    expect(groundDrop([30, -30], [-30, 30])).toBeGreaterThan(0)
    expect(groundDrop([58, -58], [-58, 58])).toBeGreaterThan(groundDrop([28, -28], [-34, 38]))
  })

  it('seul le K.O. couche le corps, et à la renverse', () => {
    for (const name of POSE_NAMES) {
      if (name === 'ko') expect(POSES.ko.lie).toBeLessThan(-80)
      else expect(POSES[name].lie).toBe(0)
    }
  })

  it('les coups ont de la portée', () => {
    // -90° = horizontal vers l'avant
    expect(Math.abs(POSES.jab.frontArm[0] + 90)).toBeLessThanOrEqual(15)
    expect(Math.abs(POSES.cross.backArm[0] + 90)).toBeLessThanOrEqual(15)
    expect(Math.abs(POSES.frontKick.frontLeg[0] + 90)).toBeLessThanOrEqual(15)
    // le coup de pied circulaire monte plus haut que le coup de face
    expect(POSES.roundKick.frontLeg[0]).toBeLessThan(POSES.frontKick.frontLeg[0])
    expect(POSES.windup.drop).toBeGreaterThan(POSES.idle.drop)
  })

  it('le coup sauté décolle et lance le corps en avant', () => {
    expect(POSES.flyKick.drop).toBeLessThan(0)
    expect(POSES.flyKick.x).toBeGreaterThan(POSES.frontKick.x)
    expect(POSES.flyKick.spin).not.toBe(0)
  })

  it('les gestes de frappe laissent une traînée, pas le repos', () => {
    for (const name of ['jab', 'cross', 'hook', 'uppercut', 'frontKick', 'roundKick', 'flyKick'] as const) {
      expect(POSES[name].streak, name).toBeDefined()
    }
    for (const name of ['idle', 'idle2', 'guard', 'ko'] as const) expect(POSES[name].streak).toBeUndefined()
  })

  it('les coups partent plus vite que le repos ne revient', () => {
    expect(POSE_SECONDS.jab).toBeLessThan(POSE_SECONDS.idle)
    expect(POSE_SECONDS.roundKick).toBeLessThan(POSE_SECONDS.idle)
  })

  it('les deux appuis du repos sont différents', () => {
    expect(POSES.idle2.frontLeg).not.toEqual(POSES.idle.frontLeg)
  })
})

describe('gestes des coups finaux', () => {
  it('varient avec la série', () => {
    expect([movePose('jab', 1), movePose('jab', 2)]).toEqual(['jab', 'cross'])
    expect([movePose('hook', 1), movePose('hook', 2)]).toEqual(['hook', 'uppercut'])
    expect([movePose('smash', 1), movePose('smash', 2)]).toEqual(['roundKick', 'frontKick'])
  })

  it('une grosse série lance un coup sauté', () => {
    expect(movePose('smash', 6)).toBe('flyKick')
    expect(movePose('smash', 11)).toBe('flyKick')
    expect(movePose('jab', 9)).toBe('jab')
  })
})

describe('pose du joueur', () => {
  it('au repos, les appuis alternent au rythme du jeu de jambes', () => {
    expect(playerPose(fight({ time: 0 }))).toBe('idle')
    expect(playerPose(fight({ time: STEP_MS + 10 }))).toBe('idle2')
    expect(playerPose(fight({ time: 2 * STEP_MS + 10 }))).toBe('idle')
  })

  it('action selon ce qui vient de se passer', () => {
    expect(playerPose(fight({ time: 1000, lastMoveAt: 900, lastMoveKind: 'jab', lastMoveChain: 1 }))).toBe('jab')
    expect(playerPose(fight({ time: 1000, lastMoveAt: 900, lastMoveKind: 'jab', lastMoveChain: 2 }))).toBe('cross')
    expect(isRest(playerPose(fight({ time: 1000, lastMoveAt: 1000 - POSE_MS.move - 10, lastMoveKind: 'smash', lastMoveChain: 1 })))).toBe(true)
    expect(playerPose(fight({ time: 1000, lastParryAt: 900 }))).toBe('guard')
    expect(playerPose(fight({ stunMs: 300, time: 0 }))).toBe('stunned')
  })

  it('un coup de pied atteint sa portée, puis la jambe se replie', () => {
    const base = { lastMoveKind: 'smash' as const, lastMoveChain: 1, lastMoveAt: 900 }
    expect(playerPose(fight({ ...base, time: 900 + 20 }))).toBe('roundKick')
    expect(playerPose(fight({ ...base, time: 900 + KICK_PEAK_MS + 10 }))).toBe('windupKick')
    // un coup de poing, lui, n'a pas de repli
    expect(playerPose(fight({ time: 900 + KICK_PEAK_MS + 10, lastMoveKind: 'jab', lastMoveChain: 1, lastMoveAt: 900 }))).toBe('jab')
  })

  it('chaque lettre fait partir un poing, en alternance', () => {
    expect(playerPose(fight({ time: 1000, lastTapAt: 950, tapSide: 0 }))).toBe('jab')
    expect(playerPose(fight({ time: 1000, lastTapAt: 950, tapSide: 1 }))).toBe('cross')
    expect(isRest(playerPose(fight({ time: 1000, lastTapAt: 1000 - POSE_MS.tap - 10, tapSide: 1 })))).toBe(true)
  })

  it('le coup final prime sur la lettre qui le précède, mais pas sur la lettre suivante', () => {
    const base = { time: 1000, lastMoveKind: 'smash' as const, lastMoveChain: 1 }
    expect(playerPose(fight({ ...base, lastMoveAt: 960, lastTapAt: 950 }))).toBe('roundKick')
    expect(playerPose(fight({ ...base, lastMoveAt: 900, lastTapAt: 960, tapSide: 1 }))).toBe('cross')
  })

  it('être touché prime sur le reste, au visage ou au ventre', () => {
    const hit = (at: number) => playerPose(fight({ time: 1000, lastPlayerHitAt: at, lastMoveAt: 950, lastMoveKind: 'jab', lastParryAt: 950 }))
    expect(['hurt', 'gut']).toContain(hit(900))
    expect(new Set([hit(900), hit(1000)]).size).toBe(2)
  })

  it('coup spécial, victoire et défaite', () => {
    expect(playerPose(fight({ phase: 'super' }))).toBe('charge')
    expect(['victory', 'victory2']).toContain(playerPose(fight({ phase: 'victory' })))
    expect(playerPose(fight({ phase: 'defeat' }))).toBe('ko')
  })

  it('la victoire alterne les deux gestes', () => {
    expect(playerPose(fight({ phase: 'victory', time: 0 }))).toBe('victory')
    expect(playerPose(fight({ phase: 'victory', time: 600 }))).toBe('victory2')
  })
})

describe('pose de l\'adversaire', () => {
  it('repos, préparation d\'attaque, étourdissement', () => {
    expect(isRest(foePose(fight()))).toBe(true)
    const withAttack = tick(fight({ nextAttackIn: 0 }), 16, seeded(2))
    expect(withAttack.attacks.length).toBeGreaterThan(0)
    // Espace est un adversaire à coups de pied : il arme la jambe
    expect(foePose(withAttack)).toBe('windupKick')
    expect(foePose(fight({ foeStunMs: 500 }))).toBe('stunned')
    expect(foePose(fight({ phase: 'super' }))).toBe('stunned')
  })

  it('les adversaires cogneurs préparent le poing', () => {
    const shift = enterRound(newFight(), 1, POOL, seeded(1))
    const s = tick({ ...shift, phase: 'fight', nextAttackIn: 0 }, 16, seeded(2))
    expect(s.attacks.length).toBeGreaterThan(0)
    expect(foePose(s)).toBe('windup')
  })

  it('une simple lettre ne le fait que tressaillir', () => {
    expect(foePose(fight({ time: 1000, lastFoeHitAt: 950, lastFoeHitHeavy: false }))).toBe('flinch')
    expect(isRest(foePose(fight({ time: 1000, lastFoeHitAt: 1000 - POSE_MS.foeFlinch - 10, lastFoeHitHeavy: false })))).toBe(true)
  })

  it('un gros coup le fait réagir selon le coup reçu', () => {
    const hitBy = (kind: 'jab' | 'hook' | 'smash') =>
      foePose(fight({ time: 1000, lastFoeHitAt: 950, lastFoeHitHeavy: true, lastMoveAt: 950, lastMoveKind: kind }))
    expect(hitBy('jab')).toBe('hurt')
    expect(hitBy('hook')).toBe('gut')
    expect(hitBy('smash')).toBe('knockback')
    // un gros coup sans coup final (contre-attaque après une parade) : réaction au visage
    expect(foePose(fight({ time: 1000, lastFoeHitAt: 950, lastFoeHitHeavy: true, lastMoveAt: 100, lastMoveKind: 'smash' }))).toBe('hurt')
  })

  it('riposte à sa façon quand il touche le joueur', () => {
    expect(foePose(fight({ time: 1000, lastPlayerHitAt: 900 }))).toBe(FOE_STRIKE.space)
    for (let round = 0; round < FOES.length; round++) {
      const s = { ...enterRound(newFight(), round, POOL, seeded(1)), phase: 'fight' as const, time: 1000, lastPlayerHitAt: 900 }
      expect(foePose(s)).toBe(FOE_STRIKE[FOES[round].id])
    }
  })

  it('chaque adversaire a un coup différent', () => {
    expect(new Set(Object.values(FOE_STRIKE)).size).toBeGreaterThanOrEqual(5)
  })

  it('à terre dès que sa vie tombe à 0, quelle que soit la phase', () => {
    for (const phase of ['ko', 'between', 'victory'] as const) {
      expect(foePose(fight({ phase, foeHp: 0 }))).toBe('ko')
    }
  })
})

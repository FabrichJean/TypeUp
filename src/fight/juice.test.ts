import { describe, expect, it } from 'vitest'
import { enterRound, newFight, press, tick, type FightState, type Move } from './engine'
import { LAP } from './foes'
import { SLOW_FACTOR, chainTier, crowdEnergy, juiceFor, mergeJuice, type Juice } from './juice'

const POOL = ['chat', 'pomme', 'fenetre', 'lune', 'verre', 'table', 'soleil', 'maison', 'arbre', 'jardin', 'voiture', 'bateau']

function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const move = (id: number, kind: Move['kind'], word: string): Move => ({ id, kind, word, typed: 0, dealt: 0 })

function live(over: Partial<FightState> = {}): FightState {
  return {
    ...enterRound(newFight(), 0, POOL, seeded(1)),
    phase: 'fight',
    phaseMs: 0,
    nextAttackIn: 1e9,
    hand: [move(901, 'jab', 'chat'), move(902, 'hook', 'pomme'), move(903, 'smash', 'fenetre')],
    nextId: 1000,
    ...over,
  }
}

function type(s: FightState, word: string): FightState {
  let cur = s
  for (const ch of word) cur = press(cur, ch, seeded(5))
  return cur
}

describe('paliers de série', () => {
  it('0 sous 4, puis un de plus tous les 4', () => {
    expect([0, 3, 4, 7, 8, 12, 16, 20].map(chainTier)).toEqual([0, 0, 1, 1, 2, 3, 4, 5])
  })

  it('la foule monte avec la série et explose aux grands moments', () => {
    expect(crowdEnergy(live())).toBe(0)
    expect(crowdEnergy(live({ chain: 2 }))).toBe(1)
    expect(crowdEnergy(live({ chain: 4 }))).toBe(2)
    expect(crowdEnergy(live({ chain: 9 }))).toBe(3)
    expect(crowdEnergy(live({ phase: 'ko' }))).toBe(3)
    expect(crowdEnergy(live({ phase: 'super' }))).toBe(3)
  })

  it('le ralenti ralentit vraiment', () => {
    expect(SLOW_FACTOR).toBeGreaterThan(0)
    expect(SLOW_FACTOR).toBeLessThan(1)
  })
})

describe('juiceFor', () => {
  it('rien de neuf, rien à jouer', () => {
    const s = live()
    expect(juiceFor(s, s)).toBeNull()
    expect(juiceFor(s, tick(s, 16, seeded(1)))).toBeNull()
  })

  it('une simple lettre ne déclenche aucun effet', () => {
    const s = live()
    expect(juiceFor(s, press(s, 'c', seeded(1)))).toBeNull()
  })

  it('un coup final léger fait un très bref arrêt sur image', () => {
    const s = type(live(), 'cha')
    const j = juiceFor(s, press(s, 't', seeded(1)))
    expect(j?.freezeMs).toBeGreaterThan(0)
    expect(j?.freezeMs).toBeLessThan(50)
    expect(j?.thump).toBe(false)
  })

  it('un gros coup (smash) fige plus longtemps et fait « boum »', () => {
    const s = type(live(), 'fenetr')
    const j = juiceFor(s, press(s, 'e', seeded(1)))
    expect(j).not.toBeNull()
    expect(j!.freezeMs).toBeGreaterThanOrEqual(70)
    expect(j!.thump).toBe(true)
    expect(j!.lines).toBe(true)
    expect(j!.shake).toBeGreaterThanOrEqual(2)
  })

  it('le K.O. est le plus spectaculaire : arrêt, ralenti, flash, ovation', () => {
    const s = type(live({ foeHp: 3 }), 'cha')
    const next = press(s, 't', seeded(1))
    expect(next.phase).toBe('ko')
    const j = juiceFor(s, next)!
    expect(j.freezeMs).toBeGreaterThanOrEqual(150)
    expect(j.slowMs).toBeGreaterThan(500)
    expect(j.flash).toBe('white')
    expect(j.shake).toBe(3)
    expect(j.cheer).toBe(2)
  })

  it('un K.O. par une simple lettre déclenche aussi la scène', () => {
    const s = type(live({ foeHp: 1 }), 'fene')
    const start = live({ foeHp: 1 })
    const next = press(start, 'f', seeded(1))
    expect(next.phase).toBe('ko')
    expect(juiceFor(start, next)?.slowMs).toBeGreaterThan(0)
    expect(s.phase).toBe('ko')
  })

  it('encaisser un coup secoue et rougit', () => {
    const s = live()
    const hit = { ...s, hp: s.hp - 10, stunMs: 450 }
    const j = juiceFor(s, hit)!
    expect(j.flash).toBe('red')
    expect(j.shake).toBe(2)
    expect(j.freezeMs).toBeGreaterThan(0)
  })

  it('la défaite fige et rougit', () => {
    const s = live()
    const j = juiceFor(s, { ...s, phase: 'defeat', hp: 0 })!
    expect(j.flash).toBe('red')
    expect(j.freezeMs).toBeGreaterThan(0)
  })

  it('une parade fait applaudir', () => {
    const s = live({ attacks: [{ id: 50, answer: 'lune', shown: 'lune', typed: 0, trick: 'plain', feint: false, heavy: false, elapsed: 0, windup: 5000, dmg: 9, fadeRank: [0, 1, 2, 3] }] })
    const next = type(s, 'lune')
    expect(next.stats.parries).toBe(1)
    const j = juiceFor(type(s, 'lun'), next)!
    expect(j.cheer).toBe(1)
    expect(j.flash).toBe('white')
  })

  it('l\'annonceur parle au premier palier de série, pas avant ni deux fois', () => {
    const base = live({ chain: 2 })
    expect(juiceFor(base, { ...base, chain: 3 })?.announce ?? null).toBeNull()
    expect(juiceFor(base, { ...base, chain: 4 })?.announce).toEqual({ kind: 'chain', tier: 1 })
    const four = { ...base, chain: 4 }
    expect(juiceFor(four, { ...four, chain: 5 })?.announce ?? null).toBeNull()
    expect(juiceFor({ ...base, chain: 7 }, { ...base, chain: 8 })?.announce).toEqual({ kind: 'chain', tier: 2 })
  })

  it('une série brisée n\'annonce rien', () => {
    const s = live({ chain: 9 })
    expect(juiceFor(s, { ...s, chain: 0 })?.announce ?? null).toBeNull()
  })

  it('le coup spécial éclaire en or', () => {
    const s = live()
    const j = juiceFor(s, { ...s, phase: 'super' })!
    expect(j.flash).toBe('gold')
    expect(j.lines).toBe(true)
  })

  describe('survie', () => {
    const ko = (over: Partial<FightState>) => {
      const before = live({ endless: true, foeHp: 3, ...over })
      const s = type(before, 'cha')
      return { before: s, after: press(s, 't', seeded(1)) }
    }

    it('annonce le record quand on le dépasse', () => {
      const { before, after } = ko({ roundsWon: 4, round: 4 })
      expect(after.roundsWon).toBe(5)
      expect(juiceFor(before, after, { bestSurvival: 4 })?.announce).toEqual({ kind: 'record' })
    })

    it('n\'annonce pas de record sans record à battre, ni en dessous', () => {
      const { before, after } = ko({ roundsWon: 2, round: 2 })
      expect(juiceFor(before, after, { bestSurvival: 0 })?.announce ?? null).toBeNull()
      expect(juiceFor(before, after, { bestSurvival: 9 })?.announce ?? null).toBeNull()
    })

    it('annonce chaque tour complet', () => {
      const { before, after } = ko({ roundsWon: LAP - 1, round: LAP - 1 })
      expect(after.roundsWon).toBe(LAP)
      expect(juiceFor(before, after, { bestSurvival: 0 })?.announce).toEqual({ kind: 'lap', lap: 1 })
    })

    it('le record prime sur le tour complet', () => {
      const { before, after } = ko({ roundsWon: LAP - 1, round: LAP - 1 })
      expect(juiceFor(before, after, { bestSurvival: LAP - 1 })?.announce).toEqual({ kind: 'record' })
    })

    it('hors survie, jamais d\'annonce de tour ni de record', () => {
      const before = type(live({ foeHp: 3, roundsWon: LAP - 1 }), 'cha')
      const after = press(before, 't', seeded(1))
      expect(juiceFor(before, after, { bestSurvival: 1 })?.announce ?? null).toBeNull()
    })
  })
})

describe('mergeJuice', () => {
  const calm: Juice = { freezeMs: 0, slowMs: 0, shake: 0, flash: null, lines: false, announce: null, thump: false, cheer: 0 }

  it('sans effet précédent, garde le nouveau', () => {
    const j = { ...calm, shake: 2 as const }
    expect(mergeJuice(null, j)).toBe(j)
  })

  it('garde le plus fort de chaque effet et cumule les drapeaux', () => {
    const a: Juice = { ...calm, freezeMs: 160, shake: 3, flash: 'white', cheer: 2 }
    const b: Juice = { ...calm, freezeMs: 30, shake: 1, thump: true, lines: true, announce: { kind: 'chain', tier: 1 } }
    expect(mergeJuice(a, b)).toEqual({
      freezeMs: 160,
      slowMs: 0,
      shake: 3,
      flash: 'white',
      lines: true,
      announce: { kind: 'chain', tier: 1 },
      thump: true,
      cheer: 2,
    })
  })

  it('une annonce déjà présente n\'est pas effacée', () => {
    const a: Juice = { ...calm, announce: { kind: 'record' } }
    expect(mergeJuice(a, calm).announce).toEqual({ kind: 'record' })
  })
})

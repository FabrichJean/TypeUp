import { describe, expect, it } from 'vitest'
import {
  FOE_STUN_PARRY_MS,
  HEAL_LAP,
  INTRO_MS,
  KO_MS,
  PLAYER_HP,
  STUN_BAIT_MS,
  STUN_HIT_MS,
  STUN_MISS_MS,
  accuracy,
  cancelLock,
  chooseTech,
  disguise,
  enterRound,
  fadeHidden,
  newFight,
  pickOffers,
  press,
  startSuper,
  superReady,
  tick,
  type Attack,
  type FightState,
  type Move,
} from './engine'
import { FOES, LAP, foeAt, lapOf } from './foes'

function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Liste de test : mots de toutes longueurs, initiales variées, sans anagrammes en double. */
const POOL = [
  'chat', 'lune', 'vent', 'riz', 'pomme', 'table', 'olive', 'sable', 'nuage', 'dragon',
  'cheval', 'jardin', 'maison', 'orange', 'violon', 'fenetre', 'bateau', 'montagne',
  'tortue', 'souris', 'poisson', 'ballon', 'miroir', 'cuisine', 'plume', 'ruisseau',
  'danser', 'fromage', 'guitare', 'hiver', 'insecte', 'kiwi', 'livre', 'tigre', 'zebre',
  'xylophone', 'yaourt', 'quartier', 'abricot', 'banane', 'camion', 'desert', 'etoile',
]

function move(id: number, kind: Move['kind'], word: string, typed = 0): Move {
  return { id, kind, word, typed, dealt: 0 }
}

function attack(id: number, answer: string, over: Partial<Attack> = {}): Attack {
  return {
    id,
    answer,
    shown: answer,
    typed: 0,
    trick: 'plain',
    feint: false,
    heavy: false,
    elapsed: 0,
    windup: 3000,
    dmg: 10,
    fadeRank: Array.from({ length: answer.length }, (_, i) => i),
    ...over,
  }
}

/** Combat contre le 1er adversaire, déjà commencé, avec une main et des attaques maîtrisées. */
function duel(over: Partial<FightState> = {}): FightState {
  const s = enterRound(newFight(), 0, POOL, seeded(1))
  return {
    ...s,
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

describe('mise en place', () => {
  it('commence par une intro puis passe au combat', () => {
    let s = enterRound(newFight(), 0, POOL, seeded(1))
    expect(s.phase).toBe('intro')
    expect(press(s, 'c')).toBe(s)
    s = tick(s, INTRO_MS + 10, seeded(1))
    expect(s.phase).toBe('fight')
    expect(s.fx.some((f) => f.text === 'FIGHT!')).toBe(true)
  })

  it('distribue 3 coups (pointe, crochet, capitale) à initiales toutes différentes', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = enterRound(newFight(), 0, POOL, seeded(seed))
      expect(s.hand.map((m) => m.kind)).toEqual(['jab', 'hook', 'smash'])
      expect(new Set(s.hand.map((m) => m.word[0])).size).toBe(3)
    }
  })

  it('un combat commence avec les points de vie de l\'adversaire', () => {
    const s = enterRound(newFight(), 2, POOL, seeded(1))
    expect(s.foeHp).toBe(FOES[2].hp)
    expect(s.hp).toBe(PLAYER_HP)
  })
})

describe('attaquer', () => {
  it('verrouille un coup à la première lettre et le joue en entier', () => {
    const locked = press(duel(), 'c')
    expect(locked.lock).toEqual({ kind: 'move', id: 901 })
    const s = type(duel(), 'chat')
    expect(s.foeHp).toBe(FOES[0].hp - 4)
    expect(s.chain).toBe(1)
    expect(s.meter).toBe(5)
    expect(s.lock).toBeNull()
  })

  it('remplace le coup joué par un autre mot de la même catégorie', () => {
    const s = type(duel(), 'chat')
    const jab = s.hand.find((m) => m.kind === 'jab')
    expect(jab).toBeDefined()
    expect(jab?.word).not.toBe('chat')
    expect(s.hand).toHaveLength(3)
    expect(new Set(s.hand.map((m) => m.word[0])).size).toBe(3)
  })

  it('les coups plus longs font plus mal', () => {
    const jab = type(duel(), 'chat').stats.damageDealt
    const hook = type(duel(), 'pomme').stats.damageDealt
    const smash = type(duel(), 'fenetre').stats.damageDealt
    expect(jab).toBeLessThan(hook)
    expect(hook).toBeLessThan(smash)
  })

  it('la série de coups augmente les dégâts', () => {
    let s = type(duel(), 'chat')
    const first = s.stats.damageDealt
    const word = s.hand.find((m) => m.kind === 'smash')?.word ?? ''
    s = type(s, word)
    // Le 2e coup bénéficie du bonus de série (x1,12) : 18 -> 20.
    expect(s.stats.damageDealt - first).toBe(20)
  })

  it('un adversaire étourdi prend 50 % de dégâts en plus', () => {
    const s = type(duel({ foeStunMs: 1000 }), 'fenetre')
    expect(s.stats.damageDealt).toBe(27)
  })

  it('ignore casse et accents', () => {
    const s = type(duel({ hand: [move(901, 'jab', 'été'), move(902, 'hook', 'pomme'), move(903, 'smash', 'fenetre')] }), 'ETE')
    expect(s.stats.moves).toBe(1)
  })

  it('une mauvaise lettre casse la série, étourdit brièvement et coûte de la jauge', () => {
    let s = type(duel({ meter: 30 }), 'chat')
    s = press(press(s, 'p'), 'x')
    expect(s.chain).toBe(0)
    expect(s.lock).toBeNull()
    expect(s.stunMs).toBe(STUN_MISS_MS)
    expect(s.meter).toBeLessThan(30 + 5)
  })

  it('on ne peut rien taper pendant l\'étourdissement', () => {
    const s = duel({ stunMs: 200 })
    expect(press(s, 'c')).toBe(s)
    expect(press(tick(s, 250, seeded(1)), 'c').lock).not.toBeNull()
  })

  it('une touche qui n\'est pas une lettre est ignorée', () => {
    const s = duel()
    expect(press(s, ' ')).toBe(s)
    expect(press(s, '3')).toBe(s)
  })

  it('Retour arrière abandonne la cible et fait hésiter un instant', () => {
    const s = cancelLock(press(duel(), 'c'))
    expect(s.lock).toBeNull()
    expect(s.hand[0].typed).toBe(0)
    expect(s.stunMs).toBeGreaterThan(0)
  })
})

describe('chaque lettre est déjà un petit coup', () => {
  it('une lettre juste inflige des dégâts sans attendre la fin du mot', () => {
    const s = type(duel(), 'fene')
    expect(s.hand[2].typed).toBe(4)
    expect(s.stats.moves).toBe(0)
    expect(s.foeHp).toBeLessThan(FOES[0].hp)
    expect(s.stats.damageDealt).toBeGreaterThan(0)
    expect(s.fx.some((f) => f.kind === 'tick')).toBe(true)
  })

  it('les lettres ne font qu\'une partie du mot : le coup final fait le reste, le total est inchangé', () => {
    const mid = type(duel(), 'fenetr')
    const done = type(duel(), 'fenetre')
    expect(mid.stats.damageDealt).toBeLessThan(18 * 0.5)
    expect(done.stats.damageDealt).toBe(18)
    expect(done.stats.moves).toBe(1)
  })

  it('chaque lettre déclenche un petit coup : secousse légère de l\'adversaire et poings en alternance', () => {
    const one = type(duel(), 'f')
    const two = type(one, 'e')
    expect(one.lastFoeHitHeavy).toBe(false)
    expect(one.lastFoeHitAt).toBe(one.time)
    expect(one.lastTapAt).toBe(one.time)
    expect(one.tapSide).not.toBe(two.tapSide)
    // Le coup final, lui, est un gros coup.
    expect(type(duel(), 'chat').lastFoeHitHeavy).toBe(true)
  })

  it('annuler un mot garde les dégâts des lettres, sans qu\'ils soient comptés deux fois', () => {
    let s = cancelLock(type(duel(), 'fene'))
    const banked = s.stats.damageDealt
    expect(banked).toBeGreaterThan(0)
    s = tick(s, 400, seeded(1))
    s = type(s, 'fenetre')
    expect(s.stats.damageDealt).toBe(18)
  })

  it('une erreur au milieu d\'un mot garde aussi les lettres déjà portées', () => {
    const s = press(type(duel(), 'fene'), 'z')
    expect(s.stats.damageDealt).toBeGreaterThan(0)
    expect(s.hand[2].typed).toBe(0)
  })

  it('les lettres comptent pour la série et la jauge seulement à la fin du mot', () => {
    const s = type(duel(), 'fenet')
    expect(s.chain).toBe(0)
    expect(s.meter).toBe(0)
  })

  it('une lettre peut mettre K.O. sans attendre le mot entier', () => {
    const s = type(duel({ foeHp: 1 }), 'fe')
    expect(s.phase).toBe('ko')
    expect(s.foeHp).toBe(0)
  })

  it('les lettres d\'une parade ne font pas de dégâts', () => {
    const s = type(duel({ attacks: [attack(500, 'dragon')] }), 'dra')
    expect(s.stats.damageDealt).toBe(0)
    expect(s.lastTapAt).toBeNull()
  })

  it('un adversaire étourdi encaisse aussi des lettres plus fortes', () => {
    const normal = type(duel(), 'fenet').stats.damageDealt
    const stunned = type(duel({ foeStunMs: 1000 }), 'fenet').stats.damageDealt
    expect(stunned).toBeGreaterThan(normal)
  })
})

describe('parer', () => {
  const withAttack = (over: Partial<Attack> = {}) => duel({ attacks: [attack(500, 'dragon', over)] })

  it('taper le mot d\'une attaque la pare : l\'adversaire est étourdi et encaisse une contre-attaque', () => {
    const s = type(withAttack(), 'dragon')
    expect(s.attacks).toEqual([])
    expect(s.hp).toBe(PLAYER_HP)
    expect(s.foeStunMs).toBe(FOE_STUN_PARRY_MS)
    expect(s.stats.parries).toBe(1)
    expect(s.foeHp).toBeLessThan(FOES[0].hp)
    expect(s.meter).toBeGreaterThanOrEqual(22)
  })

  it('une attaque non parée frappe : dégâts, série cassée, étourdissement', () => {
    let s = withAttack({ windup: 1000 })
    s = { ...s, chain: 4 }
    s = tick(s, 1000, seeded(1))
    expect(s.hp).toBe(PLAYER_HP - 10)
    expect(s.chain).toBe(0)
    expect(s.stunMs).toBe(STUN_HIT_MS)
    expect(s.attacks).toEqual([])
    expect(s.shakeMs).toBeGreaterThan(0)
  })

  it('un coup encaissé fait perdre la cible en cours', () => {
    let s = press(duel({ attacks: [attack(500, 'dragon', { windup: 500 })] }), 'c')
    s = tick(s, 500, seeded(1))
    expect(s.lock).toBeNull()
    expect(s.hand[0].typed).toBe(0)
  })

  it('l\'attaque est prioritaire quand on tape sa première lettre', () => {
    const s = press(withAttack(), 'd')
    expect(s.lock).toEqual({ kind: 'attack', id: 500 })
  })

  it('une attaque lourde fait plus mal et étourdit plus longtemps', () => {
    const light = tick(withAttack({ windup: 10 }), 20, seeded(1))
    const heavy = tick(withAttack({ windup: 10, heavy: true, dmg: 18 }), 20, seeded(1))
    expect(heavy.hp).toBeLessThan(light.hp)
    expect(heavy.stunMs).toBeGreaterThan(light.stunMs)
  })

  it('la peau dure réduit les dégâts reçus', () => {
    const s = tick(duel({ techs: { stoneskin: 2 }, attacks: [attack(500, 'dragon', { windup: 10 })] }), 20, seeded(1))
    expect(s.hp).toBe(PLAYER_HP - Math.round(10 * 0.85 ** 2))
  })

  it('une défaite à 0 point de vie', () => {
    const s = tick(duel({ hp: 5, attacks: [attack(500, 'dragon', { windup: 10 })] }), 20, seeded(1))
    expect(s.phase).toBe('defeat')
  })

  it('un adversaire qui efface fait perdre la moitié de la jauge', () => {
    const s0 = enterRound(newFight(), 4, POOL, seeded(1))
    const s = tick({ ...s0, phase: 'fight', meter: 80, attacks: [attack(500, 'dragon', { windup: 10 })], nextAttackIn: 1e9 }, 20, seeded(1))
    expect(s.meter).toBe(40)
  })
})

describe('feintes', () => {
  const feinting = () => duel({ attacks: [attack(500, 'dragon', { feint: true, windup: 1000 })] })

  it('parer une feinte est une erreur : étourdi, série cassée', () => {
    const s = type({ ...feinting(), chain: 3 }, 'dragon')
    expect(s.hp).toBe(PLAYER_HP)
    expect(s.chain).toBe(0)
    expect(s.stunMs).toBe(STUN_BAIT_MS)
    expect(s.stats.baits).toBe(1)
    expect(s.foeStunMs).toBe(0)
  })

  it('ignorer une feinte ouvre la garde adverse et remplit un peu la jauge', () => {
    const s = tick(feinting(), 1000, seeded(1))
    expect(s.hp).toBe(PLAYER_HP)
    expect(s.attacks).toEqual([])
    expect(s.foeStunMs).toBeGreaterThan(0)
    expect(s.stats.whiffs).toBe(1)
    expect(s.meter).toBe(10)
  })
})

describe('déguisements', () => {
  it('« mirror » écrit le mot à l\'envers', () => {
    expect(disguise('chat', 'mirror', seeded(1))).toBe('tahc')
  })

  it('« scramble » garde la première lettre, mélange le reste et change le mot', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const shown = disguise('dragon', 'scramble', seeded(seed))
      expect(shown).not.toBe('dragon')
      expect(shown[0]).toBe('d')
      expect([...shown].sort().join('')).toBe([...'dragon'].sort().join(''))
    }
  })

  it('« fading » efface peu à peu les lettres, jamais avant 30 % de la préparation', () => {
    const a = attack(1, 'dragon', { trick: 'fading', windup: 1000 })
    expect(fadeHidden({ ...a, elapsed: 290 })).toBe(0)
    expect(fadeHidden({ ...a, elapsed: 600 })).toBeGreaterThan(0)
    expect(fadeHidden({ ...a, elapsed: 1000 })).toBe(6)
    expect(fadeHidden({ ...a, trick: 'plain', elapsed: 900 })).toBe(0)
  })

  it('les attaques de l\'adversaire à anagrammes ont une solution unique', () => {
    const s0 = enterRound(newFight(), 4, POOL, seeded(3))
    let s: FightState = { ...s0, phase: 'fight', nextAttackIn: 0 }
    s = tick(s, 16, seeded(3))
    const a = s.attacks[0]
    expect(a).toBeDefined()
    if (a.trick === 'scramble') {
      const key = [...a.answer].sort().join('')
      expect(POOL.filter((w) => [...w].sort().join('') === key)).toEqual([a.answer])
    }
  })
})

describe('adversaire', () => {
  it('lance des attaques à intervalles et pas pendant qu\'il est étourdi', () => {
    let s = duel({ nextAttackIn: 100 })
    s = tick(s, 200, seeded(2))
    expect(s.attacks).toHaveLength(1)
    const stunned = tick(duel({ nextAttackIn: 100, foeStunMs: 5000 }), 200, seeded(2))
    expect(stunned.attacks).toHaveLength(0)
  })

  it('l\'initiale d\'une nouvelle attaque diffère de celles de la main', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s0 = duel({ nextAttackIn: 0 })
      const s = tick(s0, 16, seeded(seed))
      const a = s.attacks[0]
      if (!a) continue
      expect(s.hand.map((m) => m.word[0])).not.toContain(a.answer[0])
    }
  })

  it('le boss final peut avoir deux attaques en même temps', () => {
    let s = enterRound(newFight(), 5, POOL, seeded(4))
    s = { ...s, phase: 'fight', nextAttackIn: 0 }
    for (let i = 0; i < 40; i++) s = { ...tick(s, 50, seeded(i + 10)), hp: 999, maxHp: 999 }
    expect(Math.max(...[s.attacks.length])).toBeLessThanOrEqual(2)
  })
})

describe('coup spécial', () => {
  const text = 'Tape vite et tape juste.'
  const charged = () => duel({ meter: 100 })

  it('n\'est possible qu\'avec une jauge pleine', () => {
    expect(superReady(duel({ meter: 99 }))).toBe(false)
    expect(startSuper(duel({ meter: 99 }), text).phase).toBe('fight')
    expect(superReady(charged())).toBe(true)
    expect(startSuper(charged(), text).phase).toBe('super')
  })

  it('fige l\'adversaire, vide la jauge et chaque bon caractère fait des dégâts', () => {
    let s = startSuper(charged(), text)
    expect(s.meter).toBe(0)
    expect(s.attacks).toEqual([])
    s = type(s, 'Tape')
    expect(s.superRun?.pos).toBe(4)
    expect(s.foeHp).toBeLessThan(FOES[0].hp)
  })

  it('une erreur coûte du temps mais n\'avance pas la phrase', () => {
    let s = startSuper(charged(), text)
    const before = s.superRun?.timeLeft ?? 0
    s = press(s, 'z')
    expect(s.superRun?.pos).toBe(0)
    expect(s.superRun?.errors).toBe(1)
    expect(s.superRun?.timeLeft).toBe(before - 500)
  })

  it('une phrase finie sans faute donne PERFECT, étourdit l\'adversaire et rend la main', () => {
    const s = type(startSuper(charged(), text), text)
    expect(s.phase).toBe('fight')
    expect(s.foeStunMs).toBeGreaterThan(0)
    expect(s.fx.some((f) => f.text === 'PERFECT')).toBe(true)
    expect(s.superRun).toBeNull()
  })

  it('le temps écoulé termine le coup spécial', () => {
    let s = startSuper(charged(), text)
    s = tick(s, 30000, seeded(1))
    expect(s.phase).toBe('fight')
  })

  it('un coup spécial peut mettre K.O.', () => {
    const s = type(startSuper({ ...charged(), foeHp: 5 }, text), text)
    expect(s.phase).toBe('ko')
  })
})

describe('K.O. et progression', () => {
  it('achever l\'adversaire déclenche un K.O. avec prime puis l\'entre-deux', () => {
    let s = type(duel({ foeHp: 3 }), 'chat')
    expect(s.phase).toBe('ko')
    expect(s.roundsWon).toBe(1)
    expect(s.score).toBeGreaterThan(500)
    s = tick(s, KO_MS + 10, seeded(1))
    expect(s.phase).toBe('between')
    expect(s.offers).toHaveLength(3)
  })

  it('soigne un peu entre deux combats, sans dépasser le maximum', () => {
    let s = type(duel({ foeHp: 3, hp: 40 }), 'chat')
    s = tick(s, KO_MS + 10, seeded(1))
    expect(s.hp).toBe(65)
    const full = tick(type(duel({ foeHp: 3 }), 'chat'), KO_MS + 10, seeded(1))
    expect(full.hp).toBe(PLAYER_HP)
  })

  it('battre le dernier adversaire donne la victoire', () => {
    const last = enterRound(newFight(), FOES.length - 1, POOL, seeded(1))
    let s: FightState = { ...last, phase: 'fight', foeHp: 3, nextAttackIn: 1e9, hand: [move(901, 'jab', 'chat'), move(902, 'hook', 'pomme'), move(903, 'smash', 'fenetre')] }
    s = tick(type(s, 'chat'), KO_MS + 10, seeded(1))
    expect(s.phase).toBe('victory')
  })

  it('un duel contre l\'adversaire choisi se termine au premier K.O., sans prime de champion', () => {
    const start = enterRound(newFight(true), 2, POOL, seeded(1))
    expect(start.round).toBe(2)
    expect(start.foeHp).toBe(FOES[2].hp)
    let s: FightState = { ...start, phase: 'fight', foeHp: 3, nextAttackIn: 1e9, hand: [move(901, 'jab', 'chat'), move(902, 'hook', 'pomme'), move(903, 'smash', 'fenetre')] }
    s = type(s, 'chat')
    const scoreAtKo = s.score
    s = tick(s, KO_MS + 10, seeded(1))
    expect(s.phase).toBe('victory')
    expect(s.score).toBe(scoreAtKo)
  })

  it('un tournoi n\'est pas un duel : on passe à l\'adversaire suivant', () => {
    expect(newFight().duel).toBe(false)
    const s = tick(type(duel({ foeHp: 3 }), 'chat'), KO_MS + 10, seeded(1))
    expect(s.phase).toBe('between')
  })

  it('les techniques se cumulent et s\'appliquent', () => {
    const base = { ...duel(), phase: 'between' as const, offers: ['power' as const, 'vitality' as const, 'medic' as const] }
    const power = chooseTech(base, 'power')
    expect(power.techs.power).toBe(1)
    expect(power.offers).toEqual([])
    const vit = chooseTech({ ...base, hp: 60 }, 'vitality')
    expect(vit.maxHp).toBe(PLAYER_HP + 20)
    expect(vit.hp).toBe(80)
    expect(chooseTech(base, 'focus')).toBe(base)
    const dmg = type({ ...duel(), techs: { power: 2 } }, 'fenetre').stats.damageDealt
    expect(dmg).toBe(Math.round(18 * 1.4))
  })

  it('les soins ne sont proposés qu\'à un joueur blessé', () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(pickOffers(duel(), seeded(seed), 7)).not.toContain('medic')
    }
    expect(pickOffers(duel({ hp: 50 }), seeded(1), 7)).toContain('medic')
  })
})

describe('survie', () => {
  const HAND = [move(901, 'jab', 'chat'), move(902, 'hook', 'pomme'), move(903, 'smash', 'fenetre')]
  const live = (round: number, over: Partial<FightState> = {}): FightState => ({
    ...enterRound(newFight(false, true), round, POOL, seeded(1)),
    phase: 'fight',
    phaseMs: 0,
    nextAttackIn: 1e9,
    hand: HAND,
    ...over,
  })

  it('le premier tour est identique au tournoi', () => {
    for (let i = 0; i < LAP; i++) expect(foeAt(i, true)).toEqual(FOES[i])
    expect(lapOf(LAP - 1)).toBe(0)
    expect(lapOf(LAP)).toBe(1)
  })

  it('chaque tour suivant ramène les mêmes adversaires, en plus durs', () => {
    for (let lap = 1; lap <= 5; lap++) {
      const base = FOES[2]
      const foe = foeAt(lap * LAP + 2, true)
      expect(foe.id).toBe(base.id)
      expect(foe.hp).toBeGreaterThan(foeAt((lap - 1) * LAP + 2, true).hp)
      expect(foe.dmg).toBeGreaterThanOrEqual(foeAt((lap - 1) * LAP + 2, true).dmg)
      expect(foe.gap[0]).toBeLessThan(base.gap[0])
      expect(foe.windupBase).toBeLessThan(base.windupBase)
      expect(foe.maxAttacks).toBeLessThanOrEqual(3)
      expect(foe.feintChance).toBeLessThanOrEqual(0.4)
      expect(foe.heavyChance).toBeLessThanOrEqual(0.45)
    }
  })

  it('la difficulté ne devient jamais impossible : plancher sur les délais', () => {
    const foe = foeAt(LAP * 40 + 5, true)
    expect(foe.gap[0]).toBeGreaterThanOrEqual(Math.round(FOES[5].gap[0] * 0.55) - 1)
    expect(foe.windupBase).toBeGreaterThanOrEqual(Math.round(FOES[5].windupBase * 0.65) - 1)
  })

  it('au tournoi, foeAt ignore la boucle', () => {
    expect(foeAt(3, false)).toBe(FOES[3])
  })

  it('battre le dernier adversaire ne donne pas la victoire : le combat suivant arrive', () => {
    let s = live(LAP - 1, { foeHp: 3 })
    s = tick(type(s, 'chat'), KO_MS + 10, seeded(1))
    expect(s.phase).toBe('between')
    expect(s.roundsWon).toBe(1)
    const next = enterRound(chooseTech(s, s.offers[0]), s.round + 1, POOL, seeded(2))
    expect(next.round).toBe(LAP)
    expect(next.foeMax).toBe(foeAt(LAP, true).hp)
    expect(next.foeMax).toBeGreaterThan(FOES[0].hp)
  })

  it('un tour terminé soigne davantage', () => {
    const wounded = (round: number) => tick(type(live(round, { foeHp: 3, hp: 20 }), 'chat'), KO_MS + 10, seeded(1))
    expect(wounded(1).hp).toBe(20 + Math.round(PLAYER_HP * 0.25))
    expect(wounded(LAP - 1).hp).toBe(20 + Math.round(PLAYER_HP * HEAL_LAP))
    expect(wounded(2 * LAP - 1).hp).toBe(20 + Math.round(PLAYER_HP * HEAL_LAP))
  })

  it('l\'adversaire du tour 2 a bien ses stats gonflées dans le combat', () => {
    const s = live(LAP + 1)
    expect(s.foeMax).toBe(foeAt(LAP + 1, true).hp)
    expect(s.foeMax).toBeGreaterThan(FOES[1].hp)
  })

  it('un tournoi normal reste fini et un duel aussi', () => {
    expect(newFight().endless).toBe(false)
    expect(newFight(true).endless).toBe(false)
    expect(newFight(false, true).endless).toBe(true)
  })
})

describe('statistiques', () => {
  it('précision = frappes justes / frappes totales', () => {
    expect(accuracy(duel())).toBe(1)
    const s = press(type(duel(), 'cha'), 'z')
    expect(accuracy(s)).toBeCloseTo(3 / 4)
  })
})

describe('parties simulées', () => {
  /**
   * Un joueur qui tape `cps` touches par seconde : pare tout ce qui n'est pas une feinte (après un
   * temps de réaction), sinon joue un coup. Il connaît les réponses (il triche sur la lecture des tours).
   */
  function play(foe: number, cps: number, rng: () => number, maxMs = 240_000) {
    const pool = POOL
    let s = enterRound(newFight(), foe, pool, rng)
    const seen = new Map<number, number>()
    let budget = 0
    for (let t = 0; t < maxMs && s.phase !== 'defeat' && s.phase !== 'ko'; t += 50) {
      s = tick(s, 50, rng)
      budget += (50 * cps) / 1000
      if (s.phase === 'fight' && superReady(s)) s = startSuper(s, 'Tape vite et tape juste ici.')
      if (s.phase === 'super' && s.superRun) {
        while (budget >= 1 && s.phase === 'super') {
          budget -= 1
          s = press(s, s.superRun?.text[s.superRun.pos] ?? 'a', rng)
        }
        continue
      }
      for (const a of s.attacks) if (!seen.has(a.id)) seen.set(a.id, t)
      while (budget >= 1 && s.phase === 'fight') {
        budget -= 1
        let word: string | undefined
        if (s.lock) {
          const m = s.hand.find((x) => s.lock?.kind === 'move' && x.id === s.lock.id)
          const a = s.attacks.find((x) => s.lock?.kind === 'attack' && x.id === s.lock.id)
          word = m ? m.word.slice(m.typed) : a?.answer.slice(a.typed)
        } else {
          const urgent = s.attacks.find((a) => !a.feint && t - (seen.get(a.id) ?? t) >= 500)
          word = urgent ? urgent.answer : s.hand.find((m) => m.kind === 'hook')?.word
        }
        if (!word) break
        s = press(s, word[0], rng)
      }
    }
    return s
  }

  it('un bon joueur (≈ 60 mots/min) bat le premier adversaire sans trop souffrir', () => {
    const s = play(0, 5, seeded(11))
    expect(s.phase).toBe('ko')
    expect(s.hp).toBeGreaterThan(PLAYER_HP / 2)
    expect(s.stats.parries).toBeGreaterThan(0)
    // Un combat ne se règle ni en quelques secondes ni en une éternité.
    expect(s.time).toBeGreaterThan(15_000)
    expect(s.time).toBeLessThan(150_000)
  })

  it('un joueur passif perd contre le boss', () => {
    const rng = seeded(7)
    let s = enterRound(newFight(), 5, POOL, rng)
    for (let i = 0; i < 12_000 && s.phase !== 'defeat'; i++) s = tick(s, 50, rng)
    expect(s.phase).toBe('defeat')
  })
})

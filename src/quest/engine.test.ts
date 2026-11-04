import { describe, expect, it } from 'vitest'
import {
  BOSS_STRIKE_MS,
  PLAYER_X,
  START_HP,
  accuracy,
  bossDrainMs,
  chooseRelic,
  enterFloor,
  isBossFloor,
  newRun,
  pickOffers,
  press,
  tick,
  unlock,
  wordLengths,
  type Enemy,
  type QuestState,
} from './engine'

/** Générateur déterministe (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const POOL = ['chat', 'lune', 'pomme', 'table', 'vent', 'riz', 'olive', 'sable', 'dragon', 'nuage']

function enemy(id: number, word: string, over: Partial<Enemy> = {}): Enemy {
  return { id, word, typed: 0, x: 0.8, lane: id % 5, golden: false, speed: 1, ...over }
}

function fight(enemies: Enemy[] = [], over: Partial<QuestState> = {}): QuestState {
  const s = enterFloor(newRun(), 1, { pool: POOL })
  return { ...s, enemies, spawned: 99, total: 99, nextId: 100, ...over }
}

function typeWord(s: QuestState, word: string): QuestState {
  let cur = s
  for (const ch of word) cur = press(cur, ch)
  return cur
}

describe('étages', () => {
  it('un boss tous les 3 étages', () => {
    expect([1, 2, 3, 4, 5, 6].map(isBossFloor)).toEqual([false, false, true, false, false, true])
  })

  it('les mots s\'allongent avec les étages, dans des bornes', () => {
    const [min1, max1] = wordLengths(1)
    const [min20, max20] = wordLengths(20)
    expect(min1).toBeLessThan(min20)
    expect(max1).toBeLessThan(max20)
    expect(min20).toBeLessThanOrEqual(8)
    expect(max20).toBeLessThanOrEqual(12)
  })

  it('démarre un combat plein de vies, sans ennemi', () => {
    const s = enterFloor(newRun(), 1, { pool: POOL })
    expect(s.phase).toBe('fight')
    expect(s.hp).toBe(START_HP)
    expect(s.enemies).toEqual([])
    expect(s.total).toBeGreaterThan(0)
  })

  it('démarre un boss avec son texte', () => {
    const s = enterFloor(newRun(), 3, { pool: POOL, bossText: 'Bonjour.', bossName: 'Test' })
    expect(s.phase).toBe('boss')
    expect(s.boss).toMatchObject({ text: 'Bonjour.', name: 'Test', pos: 0, charge: 0 })
  })
})

describe('apparitions', () => {
  it('fait apparaître des ennemis au fil du temps, avec des initiales toutes différentes', () => {
    const rng = seeded(1)
    let s = enterFloor(newRun(), 1, { pool: POOL })
    for (let i = 0; i < 400; i++) s = tick(s, 50, rng)
    expect(s.spawned).toBeGreaterThan(0)
    const initials = s.enemies.map((e) => e.word[0])
    expect(new Set(initials).size).toBe(initials.length)
  })

  it('ne dépasse jamais la taille de la vague', () => {
    const rng = seeded(2)
    let s = enterFloor(newRun(), 1, { pool: POOL })
    for (let i = 0; i < 3000 && s.phase === 'fight'; i++) s = press(tick(s, 50, rng), ' ', rng)
    expect(s.spawned).toBeLessThanOrEqual(s.total)
  })
})

describe('frappe en combat', () => {
  it('verrouille l\'ennemi le plus proche commençant par la lettre', () => {
    const s = fight([enemy(1, 'chat', { x: 0.9 }), enemy(2, 'cabane', { x: 0.4 })])
    const n = press(s, 'c')
    expect(n.lockId).toBe(2)
    expect(n.enemies.find((e) => e.id === 2)?.typed).toBe(1)
  })

  it('abat un mot complet : points, combo et ennemi retiré', () => {
    const s = typeWord(fight([enemy(1, 'chat')]), 'chat')
    expect(s.enemies).toEqual([])
    expect(s.lockId).toBeNull()
    expect(s.kills).toBe(1)
    expect(s.combo).toBe(4)
    expect(s.score).toBe(40)
  })

  it('ignore la casse et les accents', () => {
    const s = typeWord(fight([enemy(1, 'été')]), 'ETE')
    expect(s.kills).toBe(1)
  })

  it('ignore l\'espace pendant un combat', () => {
    const s = fight([enemy(1, 'chat')])
    expect(press(s, ' ')).toBe(s)
  })

  it('une erreur casse le combo, pousse les ennemis et compte l\'erreur', () => {
    let s = typeWord(fight([enemy(1, 'chat'), enemy(2, 'lune')]), 'ch')
    s = press(s, 'z')
    expect(s.combo).toBe(0)
    expect(s.errors).toBe(1)
    expect(s.lastErrorAt).not.toBeNull()
    expect(s.enemies.find((e) => e.id === 2)?.x).toBeCloseTo(0.77)
  })

  it('une touche sans cible possible est une erreur', () => {
    const s = press(fight([enemy(1, 'chat')]), 'z')
    expect(s.errors).toBe(1)
    expect(s.lockId).toBeNull()
  })

  it('un autre mot ne peut pas être commencé pendant un verrouillage', () => {
    const s = press(press(fight([enemy(1, 'chat'), enemy(2, 'lune')]), 'c'), 'l')
    expect(s.errors).toBe(1)
    expect(s.lockId).toBe(1)
  })

  it('Retour arrière abandonne la cible et perd sa progression', () => {
    const s = unlock(press(fight([enemy(1, 'chat')]), 'c'))
    expect(s.lockId).toBeNull()
    expect(s.enemies[0].typed).toBe(0)
  })

  it('le multiplicateur de combo augmente les points', () => {
    const s = typeWord(fight([enemy(1, 'abcdefghijkl')], { combo: 9 }), 'a')
    // 10e caractère juste d'affilée : x2 pour ce caractère.
    expect(s.score).toBe(20)
  })

  it('un mot doré rapporte une prime', () => {
    const plain = typeWord(fight([enemy(1, 'chat')]), 'chat')
    const gold = typeWord(fight([enemy(1, 'chat', { golden: true })]), 'chat')
    expect(gold.score).toBeGreaterThan(plain.score)
  })
})

describe('dégâts', () => {
  it('un ennemi qui touche le joueur coûte une vie et casse le combo', () => {
    let s = fight([enemy(1, 'chat', { x: PLAYER_X + 0.001 })], { combo: 7 })
    s = tick(s, 100, seeded(1))
    expect(s.hp).toBe(START_HP - 1)
    expect(s.combo).toBe(0)
    expect(s.enemies).toEqual([])
    expect(s.floorHpLost).toBe(1)
    expect(s.shakeMs).toBeGreaterThan(0)
  })

  it('la partie est perdue à 0 vie', () => {
    const s = tick(fight([enemy(1, 'chat', { x: PLAYER_X })], { hp: 1 }), 16, seeded(1))
    expect(s.phase).toBe('over')
  })

  it('perdre la cible verrouillée libère le verrou', () => {
    let s = press(fight([enemy(1, 'chat', { x: PLAYER_X + 0.001 })]), 'c')
    s = tick(s, 100, seeded(1))
    expect(s.lockId).toBeNull()
  })

  it('les ennemis avancent vers le joueur', () => {
    const s = tick(fight([enemy(1, 'chat', { x: 0.8 })]), 1000, seeded(1))
    expect(s.enemies[0].x).toBeLessThan(0.8)
  })
})

describe('fin d\'étage et reliques', () => {
  it('étage vidé : prime, 3 offres et phase de choix', () => {
    let s = typeWord(fight([enemy(1, 'chat')]), 'chat')
    s = tick(s, 16, seeded(3))
    expect(s.phase).toBe('upgrade')
    expect(s.offers).toHaveLength(3)
    expect(new Set(s.offers).size).toBe(3)
    expect(s.floorsCleared).toBe(1)
    // 100 de base + 200 sans dégât, à l'étage 1.
    expect(s.lastBonus).toBe(300)
  })

  it('pas de prime « sans dégât » après avoir été touché', () => {
    let s = fight([enemy(1, 'chat')], { floorHpLost: 1 })
    s = tick(typeWord(s, 'chat'), 16, seeded(3))
    expect(s.lastBonus).toBe(100)
  })

  it('armure : +1 vie max et +1 vie', () => {
    const s = { ...fight(), phase: 'upgrade' as const, offers: ['armor' as const] }
    const n = chooseRelic(s, 'armor')
    expect(n.maxHp).toBe(START_HP + 1)
    expect(n.hp).toBe(START_HP + 1)
    expect(n.offers).toEqual([])
  })

  it('cœur : soigne sans dépasser le max', () => {
    const s = { ...fight([], { hp: 4 }), phase: 'upgrade' as const, offers: ['heart' as const] }
    expect(chooseRelic(s, 'heart').hp).toBe(START_HP)
  })

  it('une relique non proposée est refusée', () => {
    const s = { ...fight(), phase: 'upgrade' as const, offers: ['armor' as const] }
    expect(chooseRelic(s, 'nova')).toBe(s)
  })

  it('les offres excluent le cœur à pleine vie et l\'aimant déjà possédé', () => {
    const full = fight([], { relics: { magnet: 1 } })
    for (let seed = 0; seed < 30; seed++) {
      const offers = pickOffers(full, seeded(seed), 9)
      expect(offers).not.toContain('heart')
      expect(offers).not.toContain('magnet')
    }
  })

  it('bouclier : absorbe une erreur sans casser le combo', () => {
    const base = fight([enemy(1, 'chat'), enemy(2, 'lune')])
    let s = chooseRelic({ ...base, phase: 'upgrade', offers: ['shield'] }, 'shield')
    s = { ...s, phase: 'fight' }
    s = press(typeWord(s, 'ch'), 'z')
    expect(s.shield).toBe(2)
    expect(s.combo).toBe(2)
    expect(s.enemies.find((e) => e.id === 2)?.x).toBeCloseTo(0.8)
  })

  it('aimant : une erreur ne fait que diviser le combo par deux', () => {
    const s = press(fight([enemy(1, 'chat')], { combo: 20, relics: { magnet: 1 } }), 'z')
    expect(s.combo).toBe(10)
  })

  it('sablier : les ennemis avancent moins vite', () => {
    const plain = tick(fight([enemy(1, 'chat')]), 1000, seeded(1))
    const slowed = tick(fight([enemy(1, 'chat')], { relics: { hourglass: 2 } }), 1000, seeded(1))
    expect(slowed.enemies[0].x).toBeGreaterThan(plain.enemies[0].x)
  })

  it('gel : les ennemis ne bougent pas pendant le gel d\'un nouvel étage', () => {
    const entered = enterFloor({ ...newRun(), relics: { frost: 1 } }, 1, { pool: POOL })
    expect(entered.freezeMs).toBe(3000)
    const frozen = tick({ ...entered, enemies: [enemy(1, 'chat')] }, 1000, seeded(1))
    expect(frozen.enemies[0].x).toBe(0.8)
  })

  it('nova : abat tous les ennemis à l\'écran au palier de combo', () => {
    const s = fight([enemy(1, 'abcdefghij'), enemy(2, 'lune'), enemy(3, 'vent')], {
      combo: 24,
      relics: { nova: 1 },
    })
    const n = press(s, 'a')
    expect(n.enemies).toEqual([])
    expect(n.kills).toBe(3)
    expect(n.fx.some((f) => f.kind === 'nova')).toBe(true)
  })

  it('vampire : soigne tous les N mots abattus', () => {
    let s = fight([enemy(1, 'chat')], { hp: 3, relics: { vampire: 1 }, sinceHeal: 8 })
    s = typeWord(s, 'chat')
    expect(s.hp).toBe(4)
    expect(s.sinceHeal).toBe(0)
  })
})

describe('boss', () => {
  const boss = (text = 'Un test.') =>
    enterFloor(newRun(), 3, { pool: POOL, bossText: text, bossName: 'B' })

  it('avance caractère par caractère, espaces compris', () => {
    const s = typeWord(boss('a b'), 'a b')
    expect(s.phase).toBe('upgrade')
  })

  it('une erreur ne fait pas avancer le texte et charge la jauge', () => {
    const s = press(boss(), 'x')
    expect(s.boss?.pos).toBe(0)
    expect(s.boss?.charge).toBe(1200)
    expect(s.errors).toBe(1)
  })

  it('exige les majuscules mais tolère les accents', () => {
    expect(press(boss('Été'), 'e').boss?.pos).toBe(0)
    expect(press(boss('Été'), 'E').boss?.pos).toBe(1)
    expect(press(boss('éé'), 'e').boss?.pos).toBe(1)
  })

  it('taper vide la jauge de colère', () => {
    const s0 = { ...boss(), boss: { ...boss().boss!, charge: 3000 } }
    const s = press(s0, 'U')
    expect(s.boss?.charge).toBe(3000 - bossDrainMs(3, 0))
  })

  it('le boss frappe quand la jauge est pleine', () => {
    let s = boss()
    s = tick(s, BOSS_STRIKE_MS - 1, seeded(1))
    expect(s.hp).toBe(START_HP)
    s = tick(s, 10, seeded(1))
    expect(s.hp).toBe(START_HP - 1)
    expect(s.boss?.charge).toBe(0)
  })

  it('vaincre le boss donne une prime et ouvre le choix de relique', () => {
    const s = typeWord(boss('Salut.'), 'Salut.')
    expect(s.phase).toBe('upgrade')
    expect(s.score).toBeGreaterThan(300)
    expect(s.kills).toBe(1)
  })
})

describe('statistiques', () => {
  it('précision = frappes justes / frappes totales', () => {
    expect(accuracy(newRun())).toBe(1)
    const s = press(typeWord(fight([enemy(1, 'chat')]), 'cha'), 'z')
    expect(accuracy(s)).toBeCloseTo(3 / 4)
  })

  it('le temps et les effets visuels s\'écoulent', () => {
    let s = typeWord(fight([enemy(1, 'chat')]), 'chat')
    expect(s.fx.length).toBeGreaterThan(0)
    s = tick(s, 2000, seeded(1))
    expect(s.fx).toEqual([])
    expect(s.time).toBe(2000)
  })
})

describe('partie simulée', () => {
  /** Un joueur parfait qui tape toujours l'ennemi le plus proche, 1 touche / 120 ms. */
  function bot(s: QuestState, rng: () => number, ms: number): QuestState {
    let cur = s
    for (let t = 0; t < ms && cur.phase === 'fight'; t += 120) {
      cur = tick(cur, 120, rng)
      if (cur.phase !== 'fight') break
      const locked = cur.enemies.find((e) => e.id === cur.lockId)
      const target = locked ?? cur.enemies.reduce<Enemy | null>((a, b) => (!a || b.x < a.x ? b : a), null)
      if (target) cur = press(cur, target.word[target.typed], rng)
    }
    return cur
  }

  it('un joueur à ~8 touches/s passe l\'étage 1 sans perdre de vie', () => {
    const rng = seeded(42)
    const s = bot(enterFloor(newRun(), 1, { pool: POOL }), rng, 120_000)
    expect(s.phase).toBe('upgrade')
    expect(s.hp).toBe(START_HP)
    expect(s.floorHpLost).toBe(0)
    expect(s.kills).toBe(s.total)
  })

  it('un joueur qui ne tape jamais perd la partie', () => {
    const rng = seeded(7)
    let s = enterFloor(newRun(), 1, { pool: POOL })
    for (let i = 0; i < 6000 && s.phase === 'fight'; i++) s = tick(s, 50, rng)
    expect(s.phase).toBe('over')
    expect(s.hp).toBeLessThanOrEqual(0)
  })
})

import { describe, expect, it } from 'vitest'
import { HAND_WORD, SCENES, demoWords, frameAt, sceneDuration, type SceneDef } from './demo'
import { FOE_IDS } from './foes'

const parry: SceneDef = { kind: 'parry', trick: 'plain' }
const feint: SceneDef = { kind: 'feint', trick: 'plain' }
const hit: SceneDef = { kind: 'hit', trick: 'plain' }

describe('scènes de démonstration', () => {
  it('chaque adversaire a au moins une scène, avec la ruse qui le caractérise', () => {
    for (const id of FOE_IDS) expect(SCENES[id].length).toBeGreaterThan(0)
    expect(SCENES.shift[0].trick).toBe('mirror')
    expect(SCENES.esc[0].trick).toBe('fading')
    expect(SCENES.back[0].trick).toBe('scramble')
    expect(SCENES.caps.some((s) => s.kind === 'feint')).toBe(true)
  })

  it('les mots d\'exemple sont cohérents avec leur déguisement', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (const id of FOE_IDS) {
        for (const scene of SCENES[id]) {
          const { answer, shown } = demoWords(lang, scene)
          if (scene.trick === 'mirror') expect(shown).toBe([...answer].reverse().join(''))
          if (scene.trick === 'scramble') {
            expect(shown).not.toBe(answer)
            expect(shown[0]).toBe(answer[0])
            expect([...shown].sort().join('')).toBe([...answer].sort().join(''))
          }
          if (scene.trick === 'plain' || scene.trick === 'fading') expect(shown).toBe(answer)
        }
      }
    }
  })

  it('les mots d\'exemple d\'une même scène n\'ont pas la même initiale que le coup du joueur', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (const id of FOE_IDS) {
        for (const scene of SCENES[id]) {
          expect(demoWords(lang, scene).answer[0]).not.toBe(HAND_WORD[lang][0])
        }
      }
    }
  })
})

describe('chronologie', () => {
  it('une parade se déroule : apparition, ruse, frappe du mot, parade, coup', () => {
    const n = 4
    const stages = [0, 1200, 3000, 2400 + 230 * n + 500, sceneDuration(parry, n) - 800].map((t) => frameAt(parry, n, 5, t).stage)
    expect(stages).toEqual(['appear', 'trick', 'type', 'parry', 'strike'])
  })

  it('les lettres tapées avancent jusqu\'à la fin du mot, puis la carte disparaît', () => {
    const n = 4
    let last = -1
    for (let t = 0; t < sceneDuration(parry, n); t += 50) {
      const f = frameAt(parry, n, 5, t)
      expect(f.typed).toBeGreaterThanOrEqual(last)
      expect(f.typed).toBeLessThanOrEqual(n)
      last = f.typed
    }
    const done = frameAt(parry, n, 5, 2400 + 230 * n)
    expect(done.card).toBe(false)
    expect(done.foe).toBe('stunned')
  })

  it('le compte à rebours ne se vide jamais avant la parade', () => {
    const n = 6
    for (let t = 0; t < 2400 + 230 * n; t += 50) {
      expect(frameAt(parry, n, 5, t).windupLeft).toBeGreaterThan(0)
    }
  })

  it('le coup du joueur se tape puis affiche ses dégâts', () => {
    const n = 4
    const total = sceneDuration(parry, n, 5)
    expect(frameAt(parry, n, 5, total - 100).damage).toBe(true)
    expect(frameAt(parry, n, 5, total - 100).handTyped).toBe(5)
    const early = frameAt(parry, n, 5, 2400 + 230 * n + 1700 + 100)
    expect(early.damage).toBe(false)
  })

  it('une feinte se perd dans le vide sans que le joueur tape rien', () => {
    expect(frameAt(feint, 5, 5, 500).stage).toBe('feintTell')
    expect(frameAt(feint, 5, 5, 3000).stage).toBe('feintWait')
    const open = frameAt(feint, 5, 5, 5500)
    expect(open.stage).toBe('feintOpen')
    expect(open.foe).toBe('stunned')
    expect(open.typed).toBe(0)
    expect(frameAt(feint, 5, 5, 3000).typed).toBe(0)
  })

  it('une attaque non parée touche le joueur', () => {
    expect(frameAt(hit, 4, 5, 2000).stage).toBe('hitWait')
    const f = frameAt(hit, 4, 5, 4300)
    expect(f.stage).toBe('hit')
    expect(f.playerHit).toBe(true)
    expect(f.foeStrike).toBe(true)
    expect(f.card).toBe(false)
  })

  it('chaque scène a une durée finie et croissante avec la longueur du mot', () => {
    for (const scene of [parry, feint, hit]) {
      expect(sceneDuration(scene, 4)).toBeGreaterThan(3000)
      expect(Number.isFinite(sceneDuration(scene, 4))).toBe(true)
    }
    expect(sceneDuration(parry, 7)).toBeGreaterThan(sceneDuration(parry, 4))
  })

  it('chaque lettre du coup final est déjà un petit coup, jusqu\'à l\'arrivée des dégâts', () => {
    const n = 4
    const strikeStart = 2400 + 230 * n + 1700
    const taps: number[] = []
    for (let t = strikeStart; t < strikeStart + 140 * 5 + 1100; t += 20) {
      const f = frameAt(parry, n, 5, t)
      if (f.tap) taps.push(f.handTyped)
      if (f.tap) expect(f.foe).toBe('hurt')
      if (f.damage) expect(f.tap).toBe(false)
    }
    // 4 lettres sur 5 déclenchent un petit coup (la 5e est le coup final).
    expect([...new Set(taps)]).toEqual([1, 2, 3, 4])
  })
})

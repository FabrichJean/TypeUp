import { describe, expect, it } from 'vitest'
import { SUPER_MAX, SUPER_MIN, fightPool, pickSuperText } from './content'

describe('fightPool', () => {
  const list = Array.from({ length: 9000 }, (_, i) => `${String.fromCharCode(97 + (i % 26))}${'abc'.repeat(1 + (i % 4))}${i}`.replace(/\d/g, 'x'))

  it('ne garde que des mots de 3 à 10 lettres, sans chiffres ni apostrophes', () => {
    const pool = fightPool(["l'eau", 'a2b', 'été', 'forêt', 'oui', 'ab', 'internationalisation', ...list])
    for (const w of pool) {
      expect(w).toMatch(/^\p{L}+$/u)
      expect(w.length).toBeGreaterThanOrEqual(3)
      expect(w.length).toBeLessThanOrEqual(10)
    }
  })

  it('se limite aux mots les plus fréquents quand la liste est grande', () => {
    const big = Array.from({ length: 12000 }, (_, i) => `mot${'x'.repeat(i % 5)}`.replace(/\d/g, '') + 'a'.repeat(3))
    const rare = 'zzzzzzrare'
    expect(fightPool([...big, rare])).not.toContain(rare)
  })

  it('se rabat sur toute la liste si les plus fréquents ne suffisent pas', () => {
    const tiny = ['chat', 'lune', 'vent']
    expect(fightPool(tiny)).toEqual(tiny)
  })
})

describe('pickSuperText', () => {
  it('renvoie une vraie phrase de longueur raisonnable, dans les deux langues', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (let i = 0; i < 40; i++) {
        const text = pickSuperText(lang, Math.random)
        expect(text.length).toBeGreaterThanOrEqual(SUPER_MIN)
        expect(text.length).toBeLessThanOrEqual(SUPER_MAX)
        expect(text).not.toMatch(/\s{2,}/)
      }
    }
  })

  it('est déterministe pour un hasard donné', () => {
    expect(pickSuperText('fr', () => 0.3)).toBe(pickSuperText('fr', () => 0.3))
  })
})

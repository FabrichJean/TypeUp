import { describe, expect, it } from 'vitest'
import { computeXp, levelInfo, xpForLevel } from './xp'

describe('computeXp', () => {
  it('récompense précision et combo', () => {
    const base = computeXp({ correctChars: 200, accuracy: 1, maxCombo: 0 })
    expect(base).toBe(200)
    expect(computeXp({ correctChars: 200, accuracy: 1, maxCombo: 100 })).toBe(400)
    expect(computeXp({ correctChars: 200, accuracy: 0.5, maxCombo: 0 })).toBe(50)
  })
  it('plafonne le bonus de combo à 100', () => {
    expect(computeXp({ correctChars: 100, accuracy: 1, maxCombo: 9999 })).toBe(200)
  })
  it('vaut 0 sans caractère juste', () => {
    expect(computeXp({ correctChars: 0, accuracy: 1, maxCombo: 0 })).toBe(0)
  })
})

describe('levelInfo', () => {
  it('commence au niveau 1', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, into: 0, needed: 100, progress: 0 })
  })
  it('change de niveau pile aux seuils', () => {
    expect(levelInfo(99).level).toBe(1)
    expect(levelInfo(100).level).toBe(2)
    expect(levelInfo(299).level).toBe(2)
    expect(levelInfo(300).level).toBe(3)
    expect(xpForLevel(3)).toBe(300)
    expect(xpForLevel(4)).toBe(600)
  })
  it('calcule la progression dans le niveau', () => {
    expect(levelInfo(200)).toMatchObject({ level: 2, into: 100, needed: 200, progress: 0.5 })
  })
  it('gère les valeurs négatives ou décimales', () => {
    expect(levelInfo(-5).level).toBe(1)
    expect(levelInfo(100.9).level).toBe(2)
  })
})

import { describe, expect, it } from 'vitest'
import { PACKS, buildText, getPack, isPackId, type SourceId } from './packs'
import { isTypeable, normalizeText } from './normalize'
import { SOURCES } from './sources'

/** RNG déterministe (mulberry32). */
function seeded(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Packs dont le contenu vient de passages écrits à la main (classiques ou repli). */
const withTexts = PACKS.filter((p) => !p.words)

describe('PACKS', () => {
  it('ont des identifiants uniques', () => {
    const ids = PACKS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ont du contenu local dans les deux langues (sauf le pack Mots)', () => {
    for (const p of withTexts) {
      expect(p.texts.fr.length, `${p.id}/fr`).toBeGreaterThanOrEqual(5)
      expect(p.texts.en.length, `${p.id}/en`).toBeGreaterThanOrEqual(5)
    }
  })

  it('le pack Mots n\'a pas de passages en dur', () => {
    const words = getPack('words')
    expect(words?.words).toBe(true)
    expect(words?.texts).toEqual({ fr: [], en: [] })
  })

  it('ne référencent que des sources connues', () => {
    const known = Object.keys(SOURCES)
    for (const p of PACKS) {
      for (const source of Object.values(p.sources ?? {}) as SourceId[]) {
        expect(known, `${p.id}`).toContain(source)
      }
    }
  })

  it('sont tapables après normalisation (hors code)', () => {
    for (const p of withTexts.filter((p) => p.id !== 'code')) {
      for (const lang of ['fr', 'en'] as const) {
        for (const t of p.texts[lang]) {
          const n = normalizeText(t)
          expect(isTypeable(n), `${p.id}/${lang}: ${n}`).toBe(true)
        }
      }
    }
  })

  it('getPack / isPackId', () => {
    expect(getPack('jokes')?.id).toBe('jokes')
    expect(getPack('nope')).toBeUndefined()
    expect(isPackId('poems')).toBe(true)
    expect(isPackId('words')).toBe(true)
    expect(isPackId('x')).toBe(false)
  })
})

describe('buildText', () => {
  it('atteint la longueur minimale, même en rejouant les passages', () => {
    const out = buildText(['abc', 'def'], 50, seeded(1))
    expect(out.length).toBeGreaterThanOrEqual(50)
    expect(out).not.toMatch(/\s{2,}/)
  })

  it('est reproductible avec le même RNG et varie avec un autre', () => {
    const texts = getPack('twisters')!.texts.fr
    expect(buildText(texts, 300, seeded(7))).toBe(buildText(texts, 300, seeded(7)))
    expect(buildText(texts, 300, seeded(7))).not.toBe(buildText(texts, 300, seeded(8)))
  })

  it('normalise les passages', () => {
    expect(buildText(['cœur  « ok »'], 1, seeded(1))).toBe('coeur "ok"')
  })

  it('refuse une réserve vide', () => {
    expect(() => buildText([], 10)).toThrow()
    expect(() => buildText(['  '], 10)).toThrow()
  })
})

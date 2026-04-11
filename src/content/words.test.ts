import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildWordsText, clearWordCache, isLevel, loadWordList } from './words'

const BIG = Array.from({ length: 4000 }, (_, i) => `w${i}`)
const idx = (token: string) => Number(token.slice(1))

describe('isLevel', () => {
  it('reconnaît les trois niveaux', () => {
    expect(isLevel('easy')).toBe(true)
    expect(isLevel('hard')).toBe(true)
    expect(isLevel('xxl')).toBe(false)
    expect(isLevel(undefined)).toBe(false)
  })
})

describe('buildWordsText', () => {
  it('atteint la longueur minimale', () => {
    expect(buildWordsText(BIG, 'medium', 500).length).toBeGreaterThanOrEqual(500)
  })

  it('pioche dans la tranche du niveau', () => {
    const tokens = (level: 'easy' | 'medium' | 'hard') =>
      buildWordsText(BIG, level, 3000).split(' ').map(idx)
    expect(Math.max(...tokens('easy'))).toBeLessThan(500)
    expect(Math.max(...tokens('medium'))).toBeLessThan(3000)
    expect(Math.min(...tokens('hard'))).toBeGreaterThanOrEqual(3000)
  })

  it('ne répète jamais le même mot deux fois de suite, même avec un RNG figé', () => {
    const tokens = buildWordsText(BIG, 'medium', 200, () => 0).split(' ')
    for (let i = 1; i < tokens.length; i++) expect(tokens[i]).not.toBe(tokens[i - 1])
  })

  it('pioche dans toute la liste quand elle est trop courte pour la tranche', () => {
    const tiny = Array.from({ length: 10 }, (_, i) => `w${i}`)
    const text = buildWordsText(tiny, 'hard', 100)
    expect(text.split(' ').every((w) => idx(w) < 10)).toBe(true)
  })

  it('refuse une liste vide', () => {
    expect(() => buildWordsText([], 'easy', 10)).toThrow()
  })
})

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as unknown as Response
}

describe('loadWordList', () => {
  beforeEach(() => clearWordCache())

  it('charge la liste de la langue demandée', async () => {
    const fetchFn = vi.fn(async (..._args: unknown[]) => jsonResponse(BIG))
    const list = await loadWordList('fr', { fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '/' })
    expect(list).toHaveLength(4000)
    expect(fetchFn.mock.calls[0][0]).toBe('/words/fr.json')
  })

  it('ne charge chaque langue qu\'une fois', async () => {
    const fetchFn = vi.fn(async (..._args: unknown[]) => jsonResponse(BIG))
    const opts = { fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '/' }
    await Promise.all([loadWordList('en', opts), loadWordList('en', opts)])
    await loadWordList('en', opts)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('renvoie null sans mettre l\'échec en cache (on peut réessayer)', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(BIG))
    const opts = { fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '/' }
    expect(await loadWordList('fr', opts)).toBeNull()
    expect(await loadWordList('fr', opts)).toHaveLength(4000)
  })

  it('rejette les fichiers qui ne sont pas des listes de mots', async () => {
    const bad = (body: unknown) =>
      loadWordList('fr', {
        fetchFn: (async () => jsonResponse(body)) as unknown as typeof fetch,
        baseUrl: '/',
      })
    expect(await bad({ words: [] })).toBeNull()
    clearWordCache()
    expect(await bad(['a', 'b'])).toBeNull() // trop court : probablement tronqué
    clearWordCache()
    expect(await bad(Array.from({ length: 80 }, () => 42))).toBeNull()
  })
})

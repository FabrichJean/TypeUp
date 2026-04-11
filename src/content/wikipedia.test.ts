import { describe, expect, it, vi } from 'vitest'
import { fetchWikipediaExcerpt } from './wikipedia'

const GOOD =
  'Le Mont Blanc est le point culminant des Alpes et de l’Europe occidentale. Il se situe à la frontière entre la France et l’Italie.'

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as unknown as Response
}

describe('fetchWikipediaExcerpt', () => {
  it('renvoie un texte normalisé', async () => {
    const fetchFn = vi.fn(async (..._args: unknown[]) =>
      jsonResponse({ title: 'Mont Blanc', extract: GOOD }),
    )
    const r = await fetchWikipediaExcerpt('fr', { fetchFn: fetchFn as unknown as typeof fetch })
    expect(r?.title).toBe('Mont Blanc')
    expect(r?.text).toContain("l'Europe occidentale")
    expect(fetchFn).toHaveBeenCalledOnce()
    expect(String(fetchFn.mock.calls[0][0])).toContain('fr.wikipedia.org')
  })

  it('renvoie null quand le réseau échoue (sans lever d\'exception)', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    const r = await fetchWikipediaExcerpt('en', {
      fetchFn: fetchFn as unknown as typeof fetch,
      attempts: 2,
    })
    expect(r).toBeNull()
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('saute les articles inutilisables puis réessaie', async () => {
    const responses = [
      jsonResponse({ title: 'Court', extract: 'Trop court.' }),
      jsonResponse({ title: 'Москва', extract: 'Москва — столица России, крупнейший город страны и один из крупнейших городов мира.' }),
      jsonResponse({ title: 'Homonymie', type: 'disambiguation', extract: GOOD }),
      jsonResponse({ title: 'Mont Blanc', extract: GOOD }),
    ]
    const fetchFn = vi.fn(async () => responses.shift() as Response)
    const r = await fetchWikipediaExcerpt('fr', {
      fetchFn: fetchFn as unknown as typeof fetch,
      attempts: 4,
    })
    expect(r?.title).toBe('Mont Blanc')
    expect(fetchFn).toHaveBeenCalledTimes(4)
  })

  it('ignore les réponses HTTP en erreur et le JSON inattendu', async () => {
    const responses = [jsonResponse({}, false), jsonResponse(null)]
    const fetchFn = vi.fn(async () => responses.shift() as Response)
    const r = await fetchWikipediaExcerpt('fr', {
      fetchFn: fetchFn as unknown as typeof fetch,
      attempts: 2,
    })
    expect(r).toBeNull()
  })
})

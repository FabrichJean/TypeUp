import { describe, expect, it, vi } from 'vitest'
import { SOURCES, parseJokes, parseOnThisDay, parsePoetry } from './sources'

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as unknown as Response
}

function fakeFetch(body: unknown) {
  return vi.fn(async (..._args: unknown[]) => jsonResponse(body))
}

describe('parseOnThisDay', () => {
  it('formate « année: texte » et écarte les événements inutilisables', () => {
    const out = parseOnThisDay({
      events: [
        { text: 'Chute du mur de Berlin : la frontière entre les deux Allemagnes s’ouvre.', year: 1989 },
        { text: 'Trop court', year: 2000 },
        { text: 'Texte avec un symbole ☃ inattendu qui dépasse quarante caractères', year: 1900 },
        { text: 'Événement avant notre ère qui dépasse largement quarante caractères', year: -44 },
        { text: 123, year: 1 },
        null,
      ],
    })
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('1989')
    expect(out[0].text).toBe(
      "1989: Chute du mur de Berlin : la frontière entre les deux Allemagnes s'ouvre.",
    )
  })

  it('renvoie [] pour une réponse inattendue', () => {
    expect(parseOnThisDay(null)).toEqual([])
    expect(parseOnThisDay({})).toEqual([])
    expect(parseOnThisDay({ events: 'x' })).toEqual([])
  })
})

describe('parseJokes', () => {
  it('lit une blague seule, en deux parties, et un lot', () => {
    const single = { error: false, type: 'single', joke: 'Pourquoi les poules traversent-elles la route ? Pour aller de l’autre côté.' }
    const twopart = { type: 'twopart', setup: 'Que fait une fraise sur un cheval ?', delivery: 'Tagada, tagada, tagada !' }
    expect(parseJokes(single)[0].text).toBe(
      "Pourquoi les poules traversent-elles la route ? Pour aller de l'autre côté.",
    )
    expect(parseJokes(twopart)[0].text).toBe('Que fait une fraise sur un cheval ? Tagada, tagada, tagada !')
    expect(parseJokes({ error: false, amount: 2, jokes: [single, twopart] })).toHaveLength(2)
  })

  it('dédoublonne, ignore les erreurs et les blagues inutilisables', () => {
    const j = { type: 'single', joke: 'Une blague assez longue pour être gardée telle quelle.' }
    expect(parseJokes({ jokes: [j, j] })).toHaveLength(1)
    expect(parseJokes({ error: true, message: 'No matching joke found' })).toEqual([])
    expect(parseJokes({ type: 'single', joke: 'Trop court' })).toEqual([])
    expect(parseJokes({ type: 'single', joke: 'Une blague avec un emoji 😀 qui ne se tape pas au clavier' })).toEqual([])
    expect(parseJokes(null)).toEqual([])
  })

  it('remet les retours à la ligne sur une seule ligne', () => {
    const out = parseJokes({ type: 'single', joke: 'Première ligne\nseconde ligne assez longue ensemble' })
    expect(out[0].text).toBe('Première ligne seconde ligne assez longue ensemble')
  })
})

describe('parsePoetry', () => {
  const dickinson = {
    title: 'Hope',
    author: 'Emily Dickinson',
    lines: [
      'Hope is the thing with feathers',
      'That perches in the soul,',
      '',
      'And sings the tune without the words,',
      'And never stops at all,',
      '',
      'And sweetest in the gale is heard;',
    ],
  }

  it('assemble des strophes jusqu\'à une longueur suffisante', () => {
    const out = parsePoetry([dickinson])
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('Hope - Emily Dickinson')
    expect(out[0].text.startsWith('Hope is the thing with feathers That perches in the soul,')).toBe(true)
    expect(out[0].text).toContain('And sings the tune')
    expect(out[0].text.length).toBeLessThanOrEqual(300)
    expect(out[0].text).not.toContain('gale')
  })

  it('écarte les poèmes trop courts, sans strophe exploitable ou mal formés', () => {
    const tooShort = { title: 'T', author: 'A', lines: ['Short', 'poem'] }
    const hugeStanza = { title: 'T', author: 'A', lines: [Array.from({ length: 40 }, () => 'words and words and').join(' ')] }
    expect(parsePoetry([tooShort, hugeStanza, { title: 1 }, null, { title: 'T', author: 'A', lines: 'x' }])).toEqual([])
    expect(parsePoetry({ status: 404 })).toEqual([])
  })

  it('normalise les guillemets typographiques', () => {
    const p = { title: 'T', author: 'A', lines: ['Here’s a good place at the corner—I must stand and see the show,', 'And so it goes on and on and on.'] }
    expect(parsePoetry([p])[0].text.startsWith("Here's a good place at the corner-I")).toBe(true)
  })
})

describe('SOURCES', () => {
  it('onthisday interroge le bon jour et la bonne langue', async () => {
    const fetchFn = fakeFetch({ events: [] })
    await SOURCES.onthisday('fr', { fetchFn: fetchFn as unknown as typeof fetch, now: new Date(2026, 10, 4) })
    expect(String(fetchFn.mock.calls[0][0])).toBe(
      'https://fr.wikipedia.org/api/rest_v1/feed/onthisday/events/11/04',
    )
  })

  it('jokes demande la bonne langue, le mode sûr et un lot', async () => {
    const fetchFn = fakeFetch({ error: false, jokes: [] })
    await SOURCES.jokes('en', { fetchFn: fetchFn as unknown as typeof fetch })
    const url = String(fetchFn.mock.calls[0][0])
    expect(url).toContain('lang=en')
    expect(url).toContain('safe-mode')
    expect(url).toContain('amount=10')
  })

  it('wikipedia renvoie les articles exploitables', async () => {
    const extract = 'Le Mont Blanc est le point culminant des Alpes et de l’Europe occidentale. Il se situe à la frontière.'
    const fetchFn = fakeFetch({ title: 'Mont Blanc', extract })
    const out = await SOURCES.wikipedia('fr', { fetchFn: fetchFn as unknown as typeof fetch })
    expect(out).toHaveLength(3)
    expect(out[0].title).toBe('Mont Blanc')
  })

  it('toutes les sources renvoient [] quand le réseau échoue', async () => {
    const fetchFn = vi.fn(async (..._args: unknown[]) => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    for (const source of Object.values(SOURCES)) {
      expect(await source('fr', { fetchFn })).toEqual([])
    }
  })

  it('toutes les sources renvoient [] sur une erreur HTTP', async () => {
    const fetchFn = vi.fn(async (..._args: unknown[]) => jsonResponse({}, false)) as unknown as typeof fetch
    for (const source of Object.values(SOURCES)) {
      expect(await source('en', { fetchFn })).toEqual([])
    }
  })
})

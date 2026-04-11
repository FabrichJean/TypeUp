import { describe, expect, it } from 'vitest'
import { loadRoundText, minCharsFor } from './session-text'
import type { Source } from './sources'

const WORDS = Array.from({ length: 200 }, (_, i) => `mot${i}`)

describe('minCharsFor', () => {
  it('a un plancher et croît avec la durée', () => {
    expect(minCharsFor(15)).toBe(300)
    expect(minCharsFor(60)).toBe(900)
  })
})

describe('loadRoundText : packs classiques', () => {
  it('construit un texte local assez long', async () => {
    const r = await loadRoundText('twisters', 'fr', 60)
    expect(r.text.length).toBeGreaterThanOrEqual(900)
    expect(r.offline).toBeUndefined()
    expect(r.title).toBeUndefined()
  })
})

describe('loadRoundText : pack Mots', () => {
  it('tire les mots de la liste chargée', async () => {
    const r = await loadRoundText('words', 'fr', 30, { loadWords: async () => WORDS })
    expect(r.text.length).toBeGreaterThanOrEqual(450)
    expect(r.text.split(' ').every((w) => WORDS.includes(w))).toBe(true)
    expect(r.offline).toBeUndefined()
  })

  it('respecte la difficulté demandée', async () => {
    const big = Array.from({ length: 4000 }, (_, i) => `w${i}`)
    const hard = await loadRoundText('words', 'en', 30, { level: 'hard', loadWords: async () => big })
    expect(hard.text.split(' ').every((w) => Number(w.slice(1)) >= 3000)).toBe(true)
    const easy = await loadRoundText('words', 'en', 30, { level: 'easy', loadWords: async () => big })
    expect(easy.text.split(' ').every((w) => Number(w.slice(1)) < 500)).toBe(true)
  })

  it('retombe sur des proverbes locaux si la liste est introuvable', async () => {
    const r = await loadRoundText('words', 'fr', 30, { loadWords: async () => null })
    expect(r.offline).toBe(true)
    expect(r.text.length).toBeGreaterThanOrEqual(450)
  })
})

describe('loadRoundText : packs en ligne', () => {
  it('assemble les morceaux de la source', async () => {
    const wikipedia: Source = async () => [
      { title: 'A', text: 'Texte A.' },
      { title: 'C', text: 'Texte C.' },
    ]
    const r = await loadRoundText('wiki', 'fr', 30, { sources: { wikipedia } })
    expect(r.text).toContain('Texte A.')
    expect(r.text).toContain('Texte C.')
    expect(r.title?.split(' · ').sort()).toEqual(['A', 'C'])
    expect(r.offline).toBeUndefined()
  })

  it('n\'en garde que ce qu\'il faut et abrège les titres', async () => {
    const onthisday: Source = async () =>
      Array.from({ length: 50 }, (_, i) => ({
        title: `T${i}`,
        text: `${'x'.repeat(58)}${String(i).padStart(2, '0')}`,
      }))
    const r = await loadRoundText('onthisday', 'en', 15, { sources: { onthisday } })
    expect(r.text.length).toBeGreaterThanOrEqual(300)
    expect(r.text.length).toBeLessThan(1000)
    expect(r.title?.endsWith(' …')).toBe(true)
  })

  it('ré-interroge la source tant qu\'il manque du texte', async () => {
    let call = 0
    const wikipedia: Source = async () => {
      call++
      return [{ title: `A${call}`, text: `${call}`.repeat(200) }]
    }
    const r = await loadRoundText('wiki', 'en', 30, { sources: { wikipedia } }) // il faut 450 caractères
    expect(call).toBe(3)
    expect(r.text.length).toBeGreaterThanOrEqual(600)
  })

  it('s\'arrête quand la source n\'apporte plus rien de nouveau', async () => {
    let call = 0
    const onthisday: Source = async () => {
      call++
      return [{ title: '1990', text: 'Toujours le même événement, trop court pour suffire.' }]
    }
    const r = await loadRoundText('onthisday', 'fr', 60, { sources: { onthisday } })
    expect(call).toBe(2)
    expect(r.text).toBe('Toujours le même événement, trop court pour suffire.')
  })

  it('ne boucle pas sur une source injoignable', async () => {
    let call = 0
    const jokes: Source = async () => {
      call++
      return []
    }
    const r = await loadRoundText('jokes', 'fr', 30, { sources: { jokes } })
    expect(call).toBe(1)
    expect(r.offline).toBe(true)
  })

  it('dédoublonne les titres identiques', async () => {
    const jokes: Source = async () => [
      { title: 'JokeAPI', text: 'a'.repeat(200) },
      { title: 'JokeAPI', text: 'b'.repeat(200) },
    ]
    const r = await loadRoundText('jokes', 'fr', 15, { sources: { jokes } })
    expect(r.title).toBe('JokeAPI')
  })

  it('retombe sur les passages locaux si la source ne renvoie rien', async () => {
    const jokes: Source = async () => []
    const r = await loadRoundText('jokes', 'en', 30, { sources: { jokes } })
    expect(r.offline).toBe(true)
    expect(r.text.length).toBeGreaterThanOrEqual(450)
  })

  it('utilise le contenu local, sans le signaler hors-ligne, dans une langue sans source', async () => {
    const poetry: Source = async () => {
      throw new Error('ne doit pas être appelée en français')
    }
    const r = await loadRoundText('poems', 'fr', 30, { sources: { poetry } })
    expect(r.offline).toBeUndefined()
    expect(r.title).toBeUndefined()
  })
})

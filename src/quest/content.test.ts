import { describe, expect, it } from 'vitest'
import { fallbackWords, fitBossText, poolFor } from './content'
import { wordLengths } from './engine'

/** Liste factice classée par « fréquence » : mots de longueurs variées. */
const LIST = Array.from({ length: 4000 }, (_, i) => {
  const len = 3 + (i % 9)
  return String.fromCharCode(97 + (i % 26)).repeat(len) + String.fromCharCode(97 + ((i * 7) % 26))
})

describe('poolFor', () => {
  it('ne garde que des mots de la bonne longueur, en lettres seulement', () => {
    for (const floor of [1, 4, 9, 20]) {
      const [min, max] = wordLengths(floor)
      const pool = poolFor(['il y a', "l'eau", 'ça', ...LIST], floor)
      expect(pool.length).toBeGreaterThan(0)
      for (const w of pool) {
        expect(w.length).toBeGreaterThanOrEqual(min)
        expect(w.length).toBeLessThanOrEqual(max)
        expect(w).toMatch(/^\p{L}+$/u)
      }
    }
  })

  it('accepte les mots accentués', () => {
    const pool = poolFor(['été', 'forêt', 'garçon', ...LIST.slice(0, 10)], 1)
    expect(pool).toContain('été')
  })

  it('se rabat sur toute la liste si la tranche est trop pauvre', () => {
    const tiny = ['chat', 'lune', 'pomme', 'table']
    expect(poolFor(tiny, 8).length).toBeGreaterThan(0)
  })

  it('renvoie quelque chose même si aucun mot ne tient dans les bornes', () => {
    const pool = poolFor(['internationalisation', 'incompréhensiblement'], 1)
    expect(pool.length).toBe(2)
  })
})

describe('fallbackWords', () => {
  it('tire des mots utilisables des textes embarqués, dans les deux langues', () => {
    for (const lang of ['fr', 'en'] as const) {
      const words = fallbackWords(lang)
      expect(words.length).toBeGreaterThan(100)
      expect(words.every((w) => /^\p{L}+$/u.test(w) && w.length >= 3)).toBe(true)
      expect(new Set(words).size).toBe(words.length)
    }
  })
})

describe('fitBossText', () => {
  const long = 'Michael Shannon Davison, né le 21 mars 1917 et mort le 7 septembre 2006, est un militaire américain de l\'armée de terre des États-Unis. Il a servi pendant plus de trente ans dans de nombreux pays, sur plusieurs continents, avant de prendre sa retraite.'

  it('rallonge un peu la coupe pour finir la phrase', () => {
    const cut = fitBossText(long, 130)
    expect(cut.endsWith('États-Unis.')).toBe(true)
    expect(cut.length).toBeGreaterThan(130)
  })

  it('ne dépasse pas la limite élargie quand aucune fin de phrase n\'est proche', () => {
    const noStops = 'mot '.repeat(200).trim()
    expect(fitBossText(noStops, 100).length).toBeLessThanOrEqual(100)
  })

  it('laisse intact un texte déjà assez court', () => {
    expect(fitBossText('Court.', 130)).toBe('Court.')
  })
})

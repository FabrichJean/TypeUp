import { describe, expect, it } from 'vitest'
import { isTypeable, normalizeText, truncateAtSentence } from './normalize'

describe('normalizeText', () => {
  it('remplace les apostrophes et guillemets typographiques', () => {
    expect(normalizeText('l’été « magique » “ok”')).toBe('l\'été "magique" "ok"')
  })
  it('remplace tirets longs, points de suspension et ligatures', () => {
    expect(normalizeText('a – b — c… cœur Œuvre æther')).toBe('a - b - c... coeur Oeuvre aether')
  })
  it('ramène les espaces insécables et multiples à une espace simple', () => {
    expect(normalizeText('  a b c   d\n e ')).toBe('a b c d e')
  })
})

describe('isTypeable', () => {
  it('accepte le texte latin accentué et la ponctuation courante', () => {
    expect(isTypeable('Où est l\'été ? Très bien (100 %), merci !')).toBe(true)
  })
  it('refuse les alphabets non latins et les symboles exotiques', () => {
    expect(isTypeable('Привет')).toBe(false)
    expect(isTypeable('日本語')).toBe(false)
    expect(isTypeable('a → b')).toBe(false)
  })
})

describe('truncateAtSentence', () => {
  const first = 'Une phrase assez longue pour dépasser largement les quatre-vingts premiers caractères, vraiment.'
  const long = `${first} ${'Mot '.repeat(100)}`
  it('ne touche pas un texte court', () => {
    expect(truncateAtSentence('Court.', 300)).toBe('Court.')
  })
  it('coupe en fin de phrase quand c\'est possible', () => {
    const out = truncateAtSentence(long, 300)
    expect(out.endsWith('vraiment.')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(300)
  })
  it('sinon coupe en fin de mot', () => {
    const out = truncateAtSentence('mot '.repeat(100), 50)
    expect(out.length).toBeLessThanOrEqual(50)
    expect(out.endsWith('mot')).toBe(true)
  })
})

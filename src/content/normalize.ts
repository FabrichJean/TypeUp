/**
 * Rend un texte « tapable » au clavier : guillemets/apostrophes typographiques,
 * tirets longs, ligatures et espaces insécables sont ramenés à des caractères simples.
 */
export function normalizeText(input: string): string {
  return input
    .replace(/[‘’‛ʼ]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/«\s*/g, '"')
    .replace(/\s*»/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'Oe')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'Ae')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Lettres latines (accentuées ou non), chiffres, espaces et ponctuation courante. */
const TYPEABLE = /^[\p{Script=Latin}\p{N} .,;:!?'"()%&/+°-]+$/u

export function isTypeable(text: string): boolean {
  return TYPEABLE.test(text)
}

/**
 * Coupe un texte à `max` caractères maximum, de préférence en fin de phrase,
 * sinon en fin de mot.
 */
export function truncateAtSentence(text: string, max = 300): string {
  if (text.length <= max) return text
  const head = text.slice(0, max)
  const sentenceEnd = Math.max(
    head.lastIndexOf('. '),
    head.lastIndexOf('! '),
    head.lastIndexOf('? '),
  )
  if (sentenceEnd >= 80) return head.slice(0, sentenceEnd + 1)
  const wordEnd = head.lastIndexOf(' ')
  return (wordEnd > 0 ? head.slice(0, wordEnd) : head).replace(/[,;:\s-]+$/, '')
}

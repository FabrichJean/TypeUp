import { isTypeable, normalizeText, truncateAtSentence } from '../content/normalize'
import { getPack, type Lang, type PackId } from '../content/packs'

const LETTERS_ONLY = /^\p{L}+$/u
/** Seuls les mots les plus courants servent de coups et d'attaques : ils doivent se lire d'un coup d'œil. */
const COMMON = 6000

/** Mots de combat : lettres seulement, 3 à 10 lettres, parmi les plus fréquents. */
export function fightPool(list: readonly string[]): string[] {
  const fits = (w: string) => w.length >= 3 && w.length <= 10 && LETTERS_ONLY.test(w)
  const common = list.slice(0, COMMON).filter(fits)
  return common.length >= 200 ? common : list.filter(fits)
}

const SUPER_PACKS: readonly PackId[] = ['proverbs', 'facts', 'twisters', 'poems']
export const SUPER_MIN = 45
export const SUPER_MAX = 95

/** Phrase du coup spécial : un vrai texte court, tiré des passages embarqués (toujours disponible). */
export function pickSuperText(lang: Lang, rng: () => number = Math.random): string {
  const passages = SUPER_PACKS.flatMap((id) => getPack(id)?.texts[lang] ?? [])
    .map(normalizeText)
    .filter((t) => isTypeable(t))
  const fits = passages.filter((t) => t.length >= SUPER_MIN && t.length <= SUPER_MAX)
  if (fits.length > 0) return fits[Math.floor(rng() * fits.length)]
  const source = passages.length > 0 ? passages[Math.floor(rng() * passages.length)] : 'Tape vite, tape juste.'
  return truncateAtSentence(source, SUPER_MAX)
}

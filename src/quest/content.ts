import { loadRoundText } from '../content/session-text'
import { PACKS, getPack, type Lang, type PackId } from '../content/packs'
import { truncateAtSentence } from '../content/normalize'
import { LEVEL_RANGES, type Level } from '../content/words'
import { bossIndex, wordLengths } from './engine'

const LETTERS_ONLY = /^\p{L}+$/u
/** Sous ce seuil, une tranche est trop pauvre : on élargit. */
const MIN_POOL = 30

/** Difficulté du vocabulaire selon l'étage. */
function levelFor(floor: number): Level {
  return floor <= 3 ? 'easy' : floor <= 7 ? 'medium' : 'hard'
}

/**
 * Mots utilisables comme ennemis à cet étage : un seul « mot » (lettres uniquement),
 * de la bonne longueur, dans la tranche de fréquence du niveau.
 */
export function poolFor(list: readonly string[], floor: number): string[] {
  const [min, max] = wordLengths(floor)
  const fits = (w: string) => w.length >= min && w.length <= max && LETTERS_ONLY.test(w)
  let [lo, hi] = LEVEL_RANGES[levelFor(floor)]
  hi = Math.min(hi, list.length)
  const ranged = hi - lo >= MIN_POOL ? list.slice(lo, hi).filter(fits) : []
  if (ranged.length >= MIN_POOL) return ranged
  const all = list.filter(fits)
  return all.length > 0 ? all : list.filter((w) => LETTERS_ONLY.test(w))
}

/** Mots de secours tirés des textes embarqués (liste de fréquence indisponible). */
export function fallbackWords(lang: Lang): string[] {
  const words = new Set<string>()
  for (const pack of PACKS) {
    for (const text of pack.texts[lang]) {
      for (const w of text.toLowerCase().split(/[^\p{L}]+/u)) {
        if (w.length >= 3 && LETTERS_ONLY.test(w)) words.add(w)
      }
    }
  }
  return [...words]
}

/** Packs dont les textes servent de boss, dans l'ordre d'apparition. */
const BOSS_PACKS: readonly PackId[] = ['wiki', 'facts', 'proverbs', 'onthisday', 'poems', 'twisters', 'jokes']

export interface BossText {
  text: string
  name: string
}

/** Longueur visée : de plus en plus longs, plafonnés. */
const bossLength = (index: number): number => Math.min(130 + 30 * index, 260)

/**
 * Coupe `text` près de `cap` caractères en privilégiant une fin de phrase : si la coupe à `cap`
 * tombe en plein milieu d'une phrase, on accepte jusqu'à 80 % de plus pour la terminer.
 */
export function fitBossText(text: string, cap: number): string {
  for (const factor of [1, 1.4, 1.8]) {
    const cut = truncateAtSentence(text, Math.round(cap * factor))
    if (/[.!?]$/.test(cut)) return cut
  }
  return truncateAtSentence(text, cap)
}

/**
 * Texte du boss n° `index` : un vrai texte (Wikipédia, anecdotes, poèmes…), repli local garanti.
 * Ne rejette jamais.
 */
export async function loadBossText(lang: Lang, index: number): Promise<BossText> {
  const packId = BOSS_PACKS[index % BOSS_PACKS.length]
  const pack = getPack(packId) ?? PACKS[0]
  const round = await loadRoundText(packId, lang, 10)
  const text = fitBossText(round.text, bossLength(index))
  const name = round.title?.split(' · ')[0] || pack.label[lang]
  return { text, name }
}

/** Texte de boss pour un étage donné. */
export const loadBossForFloor = (lang: Lang, floor: number): Promise<BossText> =>
  loadBossText(lang, bossIndex(floor))

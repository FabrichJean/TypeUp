import type { Excerpt } from './http'
import { PACKS, buildText, getPack, shuffle, type Lang, type PackId, type SourceId } from './packs'
import { SOURCES, type Source } from './sources'
import { buildWordsText, loadWordList, type Level } from './words'

export interface RoundText {
  text: string
  /** Titre(s) de la source, si elle est en ligne. */
  title?: string
  /** Un texte local remplace une source (en ligne ou liste de mots) indisponible. */
  offline?: boolean
}

interface Options {
  /** Difficulté du pack « Mots ». */
  level?: Level
  /** Remplace une ou plusieurs sources en ligne (tests). */
  sources?: Partial<Record<SourceId, Source>>
  loadWords?: typeof loadWordList
  rng?: () => number
}

/** Longueur de texte à prévoir : de quoi tenir `duration` s à ~180 WPM. */
export function minCharsFor(duration: number): number {
  return Math.max(300, duration * 15)
}

/** Nombre maximal d'appels à une source pour réunir assez de texte. */
const MAX_SOURCE_CALLS = 3

const totalLength = (excerpts: Excerpt[]) => excerpts.reduce((n, e) => n + e.text.length + 1, 0)

/**
 * Interroge une source jusqu'à avoir assez de texte (sans doublons).
 * S'arrête dès qu'un appel n'apporte rien de nouveau (source vide, injoignable ou déjà épuisée).
 */
async function gather(source: Source, lang: Lang, minChars: number): Promise<Excerpt[]> {
  const seen = new Set<string>()
  const all: Excerpt[] = []
  for (let call = 0; call < MAX_SOURCE_CALLS && totalLength(all) < minChars; call++) {
    const before = all.length
    for (const e of await source(lang)) {
      if (!seen.has(e.text)) {
        seen.add(e.text)
        all.push(e)
      }
    }
    if (all.length === before) break
  }
  return all
}

/** Mélange les morceaux et en garde assez pour atteindre `minChars`. */
function assemble(excerpts: Excerpt[], minChars: number, rng: () => number): RoundText {
  const used: Excerpt[] = []
  let length = 0
  for (const e of shuffle(excerpts, rng)) {
    used.push(e)
    length = totalLength(used)
    if (length >= minChars) break
  }
  const titles = [...new Set(used.map((e) => e.title))]
  return {
    text: used.map((e) => e.text).join(' '),
    title: titles.slice(0, 3).join(' · ') + (titles.length > 3 ? ' …' : ''),
  }
}

/**
 * Prépare le texte d'une manche. Ne rejette jamais :
 * - pack « Mots » : mots tirés de la grande liste de fréquence ;
 * - pack en ligne : morceaux de la source, sinon repli sur les passages locaux ;
 * - pack classique : passages locaux.
 */
export async function loadRoundText(
  packId: PackId,
  lang: Lang,
  duration: number,
  { level = 'medium', sources = {}, loadWords = loadWordList, rng = Math.random }: Options = {},
): Promise<RoundText> {
  const pack = getPack(packId) ?? PACKS[0]
  const minChars = minCharsFor(duration)
  const local = (from = pack) => buildText(from.texts[lang], minChars, rng)

  if (pack.words) {
    const list = await loadWords(lang)
    if (list) return { text: buildWordsText(list, level, minChars, rng) }
    return { text: local(getPack('proverbs') ?? pack), offline: true }
  }

  const sourceId = pack.sources?.[lang]
  if (sourceId) {
    const source = sources[sourceId] ?? SOURCES[sourceId]
    const excerpts = await gather(source, lang, minChars)
    if (excerpts.length > 0) return assemble(excerpts, minChars, rng)
    return { text: local(), offline: true }
  }
  return { text: local() }
}

import { fetchJson, type Excerpt, type FetchOptions } from './http'
import type { Lang } from './packs'
import { isTypeable, normalizeText, truncateAtSentence } from './normalize'

interface Options extends FetchOptions {
  /** Nombre d'articles essayés avant d'abandonner. */
  attempts?: number
}

const MIN_LENGTH = 80

function parseSummary(json: unknown): Excerpt | null {
  if (typeof json !== 'object' || json === null) return null
  const { title, extract, type } = json as Record<string, unknown>
  if (typeof title !== 'string' || typeof extract !== 'string') return null
  if (type === 'disambiguation') return null
  const text = truncateAtSentence(normalizeText(extract), 300)
  if (text.length < MIN_LENGTH || !isTypeable(text)) return null
  return { title, text }
}

/**
 * Récupère le début d'un article Wikipédia au hasard, prêt à être tapé.
 * Renvoie `null` (jamais d'exception) si le réseau échoue ou si aucun article
 * essayé n'est exploitable : l'appelant doit prévoir un repli.
 */
export async function fetchWikipediaExcerpt(
  lang: Lang,
  { attempts = 3, ...http }: Options = {},
): Promise<Excerpt | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/random/summary`
  for (let i = 0; i < attempts; i++) {
    const excerpt = parseSummary(await fetchJson(url, http))
    if (excerpt) return excerpt
  }
  return null
}

import { fetchJson, type Excerpt, type FetchOptions } from './http'
import { isTypeable, normalizeText } from './normalize'
import type { Lang, SourceId } from './packs'
import { fetchWikipediaExcerpt } from './wikipedia'

export interface SourceOptions extends FetchOptions {
  /** Date du jour (injectable pour les tests). */
  now?: Date
}

/** Une source en ligne : renvoie des morceaux de texte, ou `[]` si elle est injoignable. */
export type Source = (lang: Lang, options?: SourceOptions) => Promise<Excerpt[]>

// ---------- Wikipédia : articles au hasard ----------

const fetchWikipedia: Source = async (lang, { fetchFn, timeoutMs } = {}) => {
  // Plusieurs articles en parallèle pour avoir assez de matière à taper.
  const results = await Promise.all(
    Array.from({ length: 3 }, () =>
      fetchWikipediaExcerpt(lang, { fetchFn, timeoutMs, attempts: 2 }),
    ),
  )
  return results.filter((r) => r !== null)
}

// ---------- Wikipédia : « Ce jour-là » ----------

/** Événements historiques du jour, au format « 1989: texte ». */
export function parseOnThisDay(json: unknown): Excerpt[] {
  const events = (json as { events?: unknown } | null)?.events
  if (!Array.isArray(events)) return []
  const out: Excerpt[] = []
  for (const ev of events as Array<Record<string, unknown>>) {
    if (typeof ev?.text !== 'string' || typeof ev.year !== 'number' || ev.year <= 0) continue
    const text = normalizeText(`${ev.year}: ${ev.text}`)
    if (text.length >= 40 && text.length <= 260 && isTypeable(text)) {
      out.push({ title: String(ev.year), text })
    }
  }
  return out
}

const fetchOnThisDay: Source = async (lang, { now = new Date(), ...http } = {}) => {
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const url = `https://${lang}.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`
  return parseOnThisDay(await fetchJson(url, http))
}

// ---------- JokeAPI : blagues ----------

/** Accepte une blague seule ou un lot (`jokes`), en un ou deux morceaux (`setup` + `delivery`). */
export function parseJokes(json: unknown): Excerpt[] {
  if (typeof json !== 'object' || json === null) return []
  const data = json as Record<string, unknown>
  if (data.error === true) return []
  const items = Array.isArray(data.jokes) ? data.jokes : [data]
  const seen = new Set<string>()
  const out: Excerpt[] = []
  for (const item of items as Array<Record<string, unknown>>) {
    const raw =
      typeof item?.joke === 'string'
        ? item.joke
        : typeof item?.setup === 'string' && typeof item.delivery === 'string'
          ? `${item.setup} ${item.delivery}`
          : null
    if (raw === null) continue
    const text = normalizeText(raw)
    if (text.length < 20 || text.length > 300 || !isTypeable(text) || seen.has(text)) continue
    seen.add(text)
    out.push({ title: 'JokeAPI', text })
  }
  return out
}

const fetchJokes: Source = async (lang, http = {}) =>
  parseJokes(
    await fetchJson(`https://v2.jokeapi.dev/joke/Any?lang=${lang}&safe-mode&amount=10`, http),
  )

// ---------- PoetryDB : poèmes (anglais) ----------

/** Extrait une strophe de chaque poème (de quoi faire 60 à 300 caractères). */
export function parsePoetry(json: unknown): Excerpt[] {
  if (!Array.isArray(json)) return []
  const out: Excerpt[] = []
  for (const poem of json as Array<Record<string, unknown>>) {
    if (typeof poem?.title !== 'string' || typeof poem.author !== 'string') continue
    if (!Array.isArray(poem.lines)) continue
    const stanzas: string[] = []
    let current: string[] = []
    for (const line of poem.lines) {
      if (typeof line !== 'string') continue
      if (line.trim() === '') {
        if (current.length > 0) stanzas.push(current.join(' '))
        current = []
      } else {
        current.push(line.trim())
      }
    }
    if (current.length > 0) stanzas.push(current.join(' '))

    let text = ''
    for (const stanza of stanzas) {
      const next = normalizeText(text ? `${text} ${stanza}` : stanza)
      if (next.length > 300) break
      text = next
      if (text.length >= 80) break
    }
    if (text.length >= 60 && isTypeable(text)) {
      out.push({ title: `${poem.title} - ${poem.author}`, text })
    }
  }
  return out
}

const fetchPoetry: Source = async (_lang, http = {}) =>
  // Beaucoup de poèmes d'un coup : une bonne part n'a pas de strophe tapable (latin, symboles…).
  parsePoetry(await fetchJson('https://poetrydb.org/random/12', http))

// ---------- Registre ----------

export const SOURCES: Record<SourceId, Source> = {
  wikipedia: fetchWikipedia,
  onthisday: fetchOnThisDay,
  jokes: fetchJokes,
  poetry: fetchPoetry,
}

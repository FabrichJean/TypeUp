import { fetchJson } from './http'
import type { Lang } from './packs'

export const LEVELS = ['easy', 'medium', 'hard'] as const
export type Level = (typeof LEVELS)[number]

export function isLevel(value: unknown): value is Level {
  return LEVELS.some((l) => l === value)
}

/** Tranche [début, fin[ de la liste (classée par fréquence) dans laquelle on pioche. */
export const LEVEL_RANGES: Record<Level, readonly [number, number]> = {
  easy: [0, 500],
  medium: [0, 3000],
  hard: [3000, 20000],
}

/** En dessous, la liste est jugée corrompue ou tronquée. */
const MIN_LIST = 50
/** Si une tranche contient moins de mots, on pioche dans toute la liste. */
const MIN_SPAN = 20

/**
 * Assemble des mots tirés au hasard (jamais deux fois le même d'affilée)
 * jusqu'à atteindre `minChars` caractères.
 */
export function buildWordsText(
  list: readonly string[],
  level: Level,
  minChars: number,
  rng: () => number = Math.random,
): string {
  if (list.length === 0) throw new Error('buildWordsText: liste de mots vide')
  let [lo, hi] = LEVEL_RANGES[level]
  hi = Math.min(hi, list.length)
  if (hi - lo < MIN_SPAN) {
    lo = 0
    hi = list.length
  }
  const span = hi - lo
  let out = ''
  let prev = -1
  while (out.length < minChars) {
    let i = lo + Math.floor(rng() * span)
    if (i === prev && span > 1) i = lo + ((i - lo + 1) % span)
    prev = i
    out += (out ? ' ' : '') + list[i]
  }
  return out
}

function parseWordList(json: unknown): string[] | null {
  if (!Array.isArray(json)) return null
  const words = json.filter((w): w is string => typeof w === 'string' && w.length > 0)
  return words.length >= MIN_LIST ? words : null
}

const cache = new Map<Lang, Promise<string[] | null>>()

/** Vide le cache (tests). */
export function clearWordCache(): void {
  cache.clear()
}

interface LoadOptions {
  fetchFn?: typeof fetch
  baseUrl?: string
}

/**
 * Charge la liste de mots d'une langue (public/words/<lang>.json) une seule fois.
 * Renvoie `null` en cas d'échec ; un échec n'est pas mis en cache, on pourra réessayer.
 */
export function loadWordList(
  lang: Lang,
  { fetchFn, baseUrl = import.meta.env.BASE_URL }: LoadOptions = {},
): Promise<string[] | null> {
  const cached = cache.get(lang)
  if (cached) return cached
  const promise = fetchJson(`${baseUrl}words/${lang}.json`, { fetchFn, timeoutMs: 8000 })
    .then(parseWordList)
    .then((list) => {
      if (!list) cache.delete(lang)
      return list
    })
  cache.set(lang, promise)
  return promise
}

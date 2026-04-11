import type { Lang } from '../content/packs'
import { isLevel, type Level } from '../content/words'

export interface SessionRecord {
  id: string
  /** Horodatage (ms depuis epoch). */
  at: number
  packId: string
  lang: Lang
  /** Difficulté, pour le pack « Mots » uniquement. */
  level?: Level
  /** Durée du test en secondes. */
  duration: number
  wpm: number
  rawWpm: number
  /** 0..1 */
  accuracy: number
  maxCombo: number
  xp: number
  /** Caractère attendu -> nombre de ratés. */
  mistakes: Record<string, number>
}

export interface HistoryStore {
  version: 1
  /** XP totale cumulée. */
  xp: number
  sessions: SessionRecord[]
}

/** Sous-ensemble de l'API Storage dont on a besoin (facilite les tests). */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const HISTORY_KEY = 'typeup.history'
export const MAX_SESSIONS = 500

export function emptyStore(): HistoryStore {
  return { version: 1, xp: 0, sessions: [] }
}

/** `localStorage` s'il est disponible (peut lever en navigation privée / données bloquées). */
export function browserStorage(): KeyValueStorage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is SessionRecord {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.at === 'number' &&
    typeof r.packId === 'string' &&
    (r.lang === 'fr' || r.lang === 'en') &&
    (r.level === undefined || isLevel(r.level)) &&
    typeof r.duration === 'number' &&
    typeof r.wpm === 'number' &&
    typeof r.rawWpm === 'number' &&
    typeof r.accuracy === 'number' &&
    typeof r.maxCombo === 'number' &&
    typeof r.xp === 'number' &&
    typeof r.mistakes === 'object' &&
    r.mistakes !== null
  )
}

/** Charge l'historique ; toute donnée absente, corrompue ou d'une autre version donne un historique vide. */
export function loadStore(storage: KeyValueStorage | null = browserStorage()): HistoryStore {
  if (!storage) return emptyStore()
  try {
    const raw = storage.getItem(HISTORY_KEY)
    if (!raw) return emptyStore()
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return emptyStore()
    const d = data as Record<string, unknown>
    if (d.version !== 1 || typeof d.xp !== 'number' || !Array.isArray(d.sessions)) {
      return emptyStore()
    }
    return { version: 1, xp: Math.max(0, d.xp), sessions: d.sessions.filter(isRecord) }
  } catch {
    return emptyStore()
  }
}

/** Renvoie `false` si l'écriture a échoué (quota dépassé, stockage indisponible). */
export function saveStore(
  store: HistoryStore,
  storage: KeyValueStorage | null = browserStorage(),
): boolean {
  if (!storage) return false
  try {
    storage.setItem(HISTORY_KEY, JSON.stringify(store))
    return true
  } catch {
    return false
  }
}

export function addSession(store: HistoryStore, record: SessionRecord): HistoryStore {
  return {
    version: 1,
    xp: store.xp + record.xp,
    sessions: [...store.sessions, record].slice(-MAX_SESSIONS),
  }
}

/**
 * Meilleur WPM sur un pack dans une langue (0 s'il n'y a pas d'historique).
 * Avec `level`, ne compte que les sessions de cette difficulté (pack « Mots »).
 */
export function bestWpm(store: HistoryStore, packId: string, lang: Lang, level?: Level): number {
  return store.sessions
    .filter(
      (s) => s.packId === packId && s.lang === lang && (level === undefined || s.level === level),
    )
    .reduce((best, s) => Math.max(best, s.wpm), 0)
}

/** Touches les plus ratées, toutes sessions confondues. */
export function aggregateMistakes(
  store: HistoryStore,
  n = 8,
): Array<{ key: string; count: number }> {
  const total: Record<string, number> = {}
  for (const s of store.sessions) {
    for (const [key, count] of Object.entries(s.mistakes)) {
      if (typeof count === 'number') total[key] = (total[key] ?? 0) + count
    }
  }
  return Object.entries(total)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, n)
}

export interface Summary {
  sessions: number
  bestWpm: number
  avgWpm: number
  avgAccuracy: number
}

export function summarize(store: HistoryStore): Summary {
  const n = store.sessions.length
  if (n === 0) return { sessions: 0, bestWpm: 0, avgWpm: 0, avgAccuracy: 0 }
  const sum = (f: (s: SessionRecord) => number) => store.sessions.reduce((a, s) => a + f(s), 0)
  return {
    sessions: n,
    bestWpm: Math.max(...store.sessions.map((s) => s.wpm)),
    avgWpm: sum((s) => s.wpm) / n,
    avgAccuracy: sum((s) => s.accuracy) / n,
  }
}

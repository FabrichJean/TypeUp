import { browserStorage, type KeyValueStorage } from './history'

export const QUEST_KEY = 'typeup.quest'

export interface QuestStats {
  version: 1
  runs: number
  bestScore: number
  /** Étage le plus profond atteint. */
  bestFloor: number
  totalKills: number
}

export interface RunSummary {
  score: number
  floor: number
  kills: number
}

export function emptyQuestStats(): QuestStats {
  return { version: 1, runs: 0, bestScore: 0, bestFloor: 0, totalKills: 0 }
}

const count = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null

/** Charge les stats ; toute donnée absente, corrompue ou d'une autre version donne des stats vides. */
export function loadQuestStats(storage: KeyValueStorage | null = browserStorage()): QuestStats {
  if (!storage) return emptyQuestStats()
  try {
    const raw = storage.getItem(QUEST_KEY)
    if (!raw) return emptyQuestStats()
    const d = JSON.parse(raw) as Record<string, unknown> | null
    if (typeof d !== 'object' || d === null || d.version !== 1) return emptyQuestStats()
    const runs = count(d.runs)
    const bestScore = count(d.bestScore)
    const bestFloor = count(d.bestFloor)
    const totalKills = count(d.totalKills)
    if (runs === null || bestScore === null || bestFloor === null || totalKills === null) {
      return emptyQuestStats()
    }
    return { version: 1, runs, bestScore, bestFloor, totalKills }
  } catch {
    return emptyQuestStats()
  }
}

/** Renvoie `false` si l'écriture a échoué. */
export function saveQuestStats(
  stats: QuestStats,
  storage: KeyValueStorage | null = browserStorage(),
): boolean {
  if (!storage) return false
  try {
    storage.setItem(QUEST_KEY, JSON.stringify(stats))
    return true
  } catch {
    return false
  }
}

export function recordRun(stats: QuestStats, run: RunSummary): QuestStats {
  return {
    version: 1,
    runs: stats.runs + 1,
    bestScore: Math.max(stats.bestScore, Math.round(run.score)),
    bestFloor: Math.max(stats.bestFloor, run.floor),
    totalKills: stats.totalKills + run.kills,
  }
}

import { browserStorage, type KeyValueStorage } from './history'

export const FIGHT_KEY = 'typeup.fight'

export interface FightStats {
  version: 1
  runs: number
  /** Tournois gagnés jusqu'au bout. */
  clears: number
  /** Plus grand nombre d'adversaires battus dans un tournoi. */
  bestRounds: number
  bestScore: number
  totalParries: number
  /** Duels gagnés, par adversaire (les duels ne comptent pas dans les records du tournoi). */
  duelWins: Record<string, number>
  /** Survie : parties jouées, record d'adversaires battus d'affilée, meilleur score. */
  survivalRuns: number
  bestSurvival: number
  bestSurvivalScore: number
}

export interface FightSummary {
  score: number
  roundsWon: number
  cleared: boolean
  parries: number
  /** Renseigné pour un duel : l'adversaire affronté. Sinon, c'est un tournoi. */
  duelFoe?: string
  /** Partie de survie (sans fin). */
  endless?: boolean
}

export function emptyFightStats(): FightStats {
  return { version: 1, runs: 0, clears: 0, bestRounds: 0, bestScore: 0, totalParries: 0, duelWins: {}, survivalRuns: 0, bestSurvival: 0, bestSurvivalScore: 0 }
}

const count = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null

/** Victoires en duel : une donnée absente ou abîmée donne simplement « aucune ». */
function parseDuelWins(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const out: Record<string, number> = {}
  for (const [foe, n] of Object.entries(value)) {
    const wins = count(n)
    if (wins !== null && wins > 0) out[foe] = wins
  }
  return out
}

/** Charge les stats ; toute donnée absente, corrompue ou d'une autre version donne des stats vides. */
export function loadFightStats(storage: KeyValueStorage | null = browserStorage()): FightStats {
  if (!storage) return emptyFightStats()
  try {
    const raw = storage.getItem(FIGHT_KEY)
    if (!raw) return emptyFightStats()
    const d = JSON.parse(raw) as Record<string, unknown> | null
    if (typeof d !== 'object' || d === null || d.version !== 1) return emptyFightStats()
    const values = [d.runs, d.clears, d.bestRounds, d.bestScore, d.totalParries].map(count)
    if (values.some((v) => v === null)) return emptyFightStats()
    const [runs, clears, bestRounds, bestScore, totalParries] = values as number[]
    return {
      version: 1,
      runs,
      clears,
      bestRounds,
      bestScore,
      totalParries,
      duelWins: parseDuelWins(d.duelWins),
      // Champs ajoutés après coup : une sauvegarde plus ancienne n'en a pas.
      survivalRuns: count(d.survivalRuns) ?? 0,
      bestSurvival: count(d.bestSurvival) ?? 0,
      bestSurvivalScore: count(d.bestSurvivalScore) ?? 0,
    }
  } catch {
    return emptyFightStats()
  }
}

/** Renvoie `false` si l'écriture a échoué. */
export function saveFightStats(
  stats: FightStats,
  storage: KeyValueStorage | null = browserStorage(),
): boolean {
  if (!storage) return false
  try {
    storage.setItem(FIGHT_KEY, JSON.stringify(stats))
    return true
  } catch {
    return false
  }
}

export function recordTournament(stats: FightStats, run: FightSummary): FightStats {
  return {
    ...stats,
    version: 1,
    runs: stats.runs + 1,
    clears: stats.clears + (run.cleared ? 1 : 0),
    bestRounds: Math.max(stats.bestRounds, run.roundsWon),
    bestScore: Math.max(stats.bestScore, Math.round(run.score)),
    totalParries: stats.totalParries + run.parries,
  }
}

/** Un duel : on retient les parades et la victoire, sans toucher aux records du tournoi. */
export function recordDuel(stats: FightStats, foe: string, run: FightSummary): FightStats {
  return {
    ...stats,
    totalParries: stats.totalParries + run.parries,
    duelWins: run.cleared ? { ...stats.duelWins, [foe]: (stats.duelWins[foe] ?? 0) + 1 } : stats.duelWins,
  }
}

/** Une partie de survie : ses records restent à part de ceux du tournoi. */
export function recordSurvival(stats: FightStats, run: FightSummary): FightStats {
  return {
    ...stats,
    totalParries: stats.totalParries + run.parries,
    survivalRuns: stats.survivalRuns + 1,
    bestSurvival: Math.max(stats.bestSurvival, run.roundsWon),
    bestSurvivalScore: Math.max(stats.bestSurvivalScore, Math.round(run.score)),
  }
}

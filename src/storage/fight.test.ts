import { describe, expect, it } from 'vitest'
import { FIGHT_KEY, emptyFightStats, loadFightStats, recordDuel, recordSurvival, recordTournament, saveFightStats } from './fight'
import type { KeyValueStorage } from './history'

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const data = { ...initial }
  return {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v
    },
  }
}

describe('stats du Combat', () => {
  it('repart de zéro sans stockage ni donnée', () => {
    expect(loadFightStats(null)).toEqual(emptyFightStats())
    expect(loadFightStats(memoryStorage())).toEqual(emptyFightStats())
  })

  it('relit ce qui a été sauvegardé', () => {
    const storage = memoryStorage()
    const stats = recordTournament(emptyFightStats(), { score: 4321.7, roundsWon: 3, cleared: false, parries: 12 })
    expect(saveFightStats(stats, storage)).toBe(true)
    expect(loadFightStats(storage)).toEqual(stats)
  })

  it('ignore une donnée corrompue ou d\'une autre version', () => {
    const bad = [
      '{',
      'null',
      '[]',
      JSON.stringify({ version: 2 }),
      JSON.stringify({ version: 1, runs: -1, clears: 0, bestRounds: 0, bestScore: 0, totalParries: 0 }),
      JSON.stringify({ version: 1, runs: 1, clears: 'x', bestRounds: 0, bestScore: 0, totalParries: 0 }),
      JSON.stringify({ version: 1, runs: 1 }),
    ]
    for (const raw of bad) {
      expect(loadFightStats(memoryStorage({ [FIGHT_KEY]: raw }))).toEqual(emptyFightStats())
    }
  })

  it('signale un échec d\'écriture', () => {
    const broken: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(saveFightStats(emptyFightStats(), broken)).toBe(false)
    expect(saveFightStats(emptyFightStats(), null)).toBe(false)
  })

  it('cumule les tournois et garde les meilleurs chiffres', () => {
    let stats = recordTournament(emptyFightStats(), { score: 500, roundsWon: 2, cleared: false, parries: 5 })
    stats = recordTournament(stats, { score: 9000, roundsWon: 6, cleared: true, parries: 20 })
    stats = recordTournament(stats, { score: 100, roundsWon: 1, cleared: false, parries: 1 })
    expect(stats).toEqual({ ...emptyFightStats(), runs: 3, clears: 1, bestRounds: 6, bestScore: 9000, totalParries: 26 })
  })

  it('un duel compte les parades et la victoire, sans toucher aux records du tournoi', () => {
    const base = recordTournament(emptyFightStats(), { score: 800, roundsWon: 2, cleared: false, parries: 3 })
    const won = recordDuel(base, 'caps', { score: 9999, roundsWon: 1, cleared: true, parries: 4, duelFoe: 'caps' })
    expect(won).toEqual({ ...base, totalParries: 7, duelWins: { caps: 1 } })
    const twice = recordDuel(won, 'caps', { score: 1, roundsWon: 1, cleared: true, parries: 0, duelFoe: 'caps' })
    expect(twice.duelWins).toEqual({ caps: 2 })
    const lost = recordDuel(twice, 'esc', { score: 5, roundsWon: 0, cleared: false, parries: 1, duelFoe: 'esc' })
    expect(lost.duelWins).toEqual({ caps: 2 })
    expect(lost.totalParries).toBe(8)
    expect(lost.runs).toBe(1)
  })

  it('relit les victoires en duel, et d\'anciennes stats sans ce champ restent valides', () => {
    const storage = memoryStorage()
    const stats = recordDuel(emptyFightStats(), 'shift', { score: 1, roundsWon: 1, cleared: true, parries: 2, duelFoe: 'shift' })
    saveFightStats(stats, storage)
    expect(loadFightStats(storage).duelWins).toEqual({ shift: 1 })
    const old = JSON.stringify({ version: 1, runs: 4, clears: 1, bestRounds: 5, bestScore: 777, totalParries: 9 })
    expect(loadFightStats(memoryStorage({ [FIGHT_KEY]: old }))).toEqual({
      ...emptyFightStats(), runs: 4, clears: 1, bestRounds: 5, bestScore: 777, totalParries: 9,
    })
    const messy = JSON.stringify({ version: 1, runs: 0, clears: 0, bestRounds: 0, bestScore: 0, totalParries: 0, duelWins: { a: 2, b: -1, c: 'x', d: 0 } })
    expect(loadFightStats(memoryStorage({ [FIGHT_KEY]: messy })).duelWins).toEqual({ a: 2 })
  })

  it('une partie de survie garde ses records à part du tournoi', () => {
    const base = recordTournament(emptyFightStats(), { score: 800, roundsWon: 2, cleared: false, parries: 3 })
    let stats = recordSurvival(base, { score: 5000, roundsWon: 8, cleared: false, parries: 10, endless: true })
    expect(stats).toEqual({ ...base, totalParries: 13, survivalRuns: 1, bestSurvival: 8, bestSurvivalScore: 5000 })
    stats = recordSurvival(stats, { score: 100, roundsWon: 2, cleared: false, parries: 0, endless: true })
    expect(stats.bestSurvival).toBe(8)
    expect(stats.bestSurvivalScore).toBe(5000)
    expect(stats.survivalRuns).toBe(2)
    expect(stats.runs).toBe(1)
    expect(stats.bestScore).toBe(800)
  })

  it('relit les records de survie', () => {
    const storage = memoryStorage()
    const stats = recordSurvival(emptyFightStats(), { score: 321, roundsWon: 7, cleared: false, parries: 1, endless: true })
    saveFightStats(stats, storage)
    expect(loadFightStats(storage)).toEqual(stats)
  })
})

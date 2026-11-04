import { describe, expect, it } from 'vitest'
import type { KeyValueStorage } from './history'
import { QUEST_KEY, emptyQuestStats, loadQuestStats, recordRun, saveQuestStats } from './quest'

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v
    },
  }
}

describe('stats de la Quête', () => {
  it('repart de zéro sans stockage ni donnée', () => {
    expect(loadQuestStats(null)).toEqual(emptyQuestStats())
    expect(loadQuestStats(memoryStorage())).toEqual(emptyQuestStats())
  })

  it('relit ce qui a été sauvegardé', () => {
    const storage = memoryStorage()
    const stats = recordRun(emptyQuestStats(), { score: 1234.6, floor: 5, kills: 40 })
    expect(saveQuestStats(stats, storage)).toBe(true)
    expect(loadQuestStats(storage)).toEqual(stats)
  })

  it('ignore une donnée corrompue ou d\'une autre version', () => {
    for (const raw of ['{', 'null', '[]', JSON.stringify({ version: 2 }), JSON.stringify({ version: 1, runs: -1, bestScore: 0, bestFloor: 0, totalKills: 0 }), JSON.stringify({ version: 1, runs: 'x' })]) {
      expect(loadQuestStats(memoryStorage({ [QUEST_KEY]: raw }))).toEqual(emptyQuestStats())
    }
  })

  it('signale un échec d\'écriture', () => {
    const broken: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(saveQuestStats(emptyQuestStats(), broken)).toBe(false)
    expect(saveQuestStats(emptyQuestStats(), null)).toBe(false)
  })

  it('cumule les parties et garde les meilleurs chiffres', () => {
    let stats = recordRun(emptyQuestStats(), { score: 500, floor: 4, kills: 20 })
    stats = recordRun(stats, { score: 300, floor: 6, kills: 15 })
    expect(stats).toEqual({ version: 1, runs: 2, bestScore: 500, bestFloor: 6, totalKills: 35 })
  })
})

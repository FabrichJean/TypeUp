import { describe, expect, it } from 'vitest'
import {
  HISTORY_KEY,
  MAX_SESSIONS,
  addSession,
  aggregateMistakes,
  bestWpm,
  emptyStore,
  loadStore,
  saveStore,
  summarize,
  type KeyValueStorage,
  type SessionRecord,
} from './history'

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & {
  data: Record<string, string>
} {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v
    },
  }
}

function rec(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 'id',
    at: 1,
    packId: 'jokes',
    lang: 'fr',
    duration: 30,
    wpm: 40,
    rawWpm: 45,
    accuracy: 0.95,
    maxCombo: 20,
    xp: 100,
    mistakes: {},
    ...over,
  }
}

describe('loadStore / saveStore', () => {
  it('fait un aller-retour', () => {
    const storage = memoryStorage()
    const store = addSession(emptyStore(), rec({ mistakes: { e: 2 } }))
    expect(saveStore(store, storage)).toBe(true)
    expect(loadStore(storage)).toEqual(store)
  })

  it('renvoie un historique vide si rien n\'est stocké ou sans stockage', () => {
    expect(loadStore(memoryStorage())).toEqual(emptyStore())
    expect(loadStore(null)).toEqual(emptyStore())
    expect(saveStore(emptyStore(), null)).toBe(false)
  })

  it('résiste au JSON corrompu et aux mauvaises versions', () => {
    expect(loadStore(memoryStorage({ [HISTORY_KEY]: '{oops' }))).toEqual(emptyStore())
    expect(loadStore(memoryStorage({ [HISTORY_KEY]: '42' }))).toEqual(emptyStore())
    expect(
      loadStore(memoryStorage({ [HISTORY_KEY]: JSON.stringify({ version: 99, xp: 5, sessions: [] }) })),
    ).toEqual(emptyStore())
  })

  it('écarte les sessions mal formées mais garde les bonnes', () => {
    const raw = JSON.stringify({ version: 1, xp: 10, sessions: [rec(), { wpm: 'x' }, null] })
    const loaded = loadStore(memoryStorage({ [HISTORY_KEY]: raw }))
    expect(loaded.sessions).toHaveLength(1)
    expect(loaded.xp).toBe(10)
  })

  it('garde la difficulté et écarte une difficulté invalide', () => {
    const raw = JSON.stringify({
      version: 1,
      xp: 0,
      sessions: [rec({ level: 'hard' }), { ...rec({ id: 'bad' }), level: 'xxl' }],
    })
    const loaded = loadStore(memoryStorage({ [HISTORY_KEY]: raw }))
    expect(loaded.sessions).toHaveLength(1)
    expect(loaded.sessions[0].level).toBe('hard')
  })

  it('signale un échec d\'écriture (quota dépassé)', () => {
    const storage: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(saveStore(emptyStore(), storage)).toBe(false)
  })
})

describe('addSession', () => {
  it('cumule l\'XP et ne mute pas l\'ancien état', () => {
    const a = emptyStore()
    const b = addSession(a, rec({ xp: 30 }))
    const c = addSession(b, rec({ xp: 12 }))
    expect(a.sessions).toHaveLength(0)
    expect(c.xp).toBe(42)
    expect(c.sessions).toHaveLength(2)
  })

  it('garde seulement les MAX_SESSIONS plus récentes', () => {
    let s = emptyStore()
    for (let i = 0; i < MAX_SESSIONS + 5; i++) s = addSession(s, rec({ id: String(i) }))
    expect(s.sessions).toHaveLength(MAX_SESSIONS)
    expect(s.sessions[0].id).toBe('5')
  })
})

describe('requêtes', () => {
  const store = [
    rec({ wpm: 30, mistakes: { e: 2, a: 1 } }),
    rec({ wpm: 55, mistakes: { e: 3 } }),
    rec({ wpm: 70, packId: 'code' }),
    rec({ wpm: 99, lang: 'en' }),
  ].reduce(addSession, emptyStore())

  it('bestWpm filtre par pack et langue', () => {
    expect(bestWpm(store, 'jokes', 'fr')).toBe(55)
    expect(bestWpm(store, 'code', 'fr')).toBe(70)
    expect(bestWpm(store, 'poems', 'fr')).toBe(0)
  })

  it('bestWpm filtre par difficulté quand elle est donnée', () => {
    const words = [
      rec({ packId: 'words', level: 'easy', wpm: 80 }),
      rec({ packId: 'words', level: 'hard', wpm: 35 }),
    ].reduce(addSession, emptyStore())
    expect(bestWpm(words, 'words', 'fr')).toBe(80)
    expect(bestWpm(words, 'words', 'fr', 'hard')).toBe(35)
    expect(bestWpm(words, 'words', 'fr', 'medium')).toBe(0)
  })

  it('aggregateMistakes additionne et trie', () => {
    expect(aggregateMistakes(store, 5)).toEqual([
      { key: 'e', count: 5 },
      { key: 'a', count: 1 },
    ])
  })

  it('summarize', () => {
    const s = summarize(store)
    expect(s.sessions).toBe(4)
    expect(s.bestWpm).toBe(99)
    expect(s.avgWpm).toBeCloseTo((30 + 55 + 70 + 99) / 4)
    expect(summarize(emptyStore())).toEqual({ sessions: 0, bestWpm: 0, avgWpm: 0, avgAccuracy: 0 })
  })
})

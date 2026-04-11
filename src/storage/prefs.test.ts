import { describe, expect, it } from 'vitest'
import { PREFS_KEY, defaultPrefs, loadPrefs, savePrefs } from './prefs'
import type { KeyValueStorage } from './history'

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const data = { ...initial }
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) }
}

describe('prefs', () => {
  it('renvoie les valeurs par défaut sans stockage ou sans donnée', () => {
    expect(loadPrefs(null)).toEqual(defaultPrefs())
    expect(loadPrefs(memoryStorage())).toEqual(defaultPrefs())
  })

  it('fait un aller-retour', () => {
    const storage = memoryStorage()
    const prefs = {
      ...defaultPrefs(),
      lang: 'en' as const,
      packId: 'words' as const,
      level: 'hard' as const,
      duration: 60 as const,
      sound: true,
    }
    savePrefs(prefs, storage)
    expect(loadPrefs(storage)).toEqual(prefs)
  })

  it('remplace chaque valeur invalide par sa valeur par défaut', () => {
    const raw = JSON.stringify({
      lang: 'de',
      packId: 'nope',
      level: 'xxl',
      duration: 45,
      strictAccents: 'oui',
      sound: 1,
    })
    expect(loadPrefs(memoryStorage({ [PREFS_KEY]: raw }))).toEqual(defaultPrefs())
  })

  it('résiste au JSON corrompu', () => {
    expect(loadPrefs(memoryStorage({ [PREFS_KEY]: '{' }))).toEqual(defaultPrefs())
  })
})

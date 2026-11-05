import { describe, expect, it } from 'vitest'
import { PREFS_KEY, defaultPrefs, loadPrefs, nextTheme, savePrefs } from './prefs'
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
      theme: 'dark' as const,
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
      theme: 'sepia',
      fightStyle: 'pixel',
    })
    expect(loadPrefs(memoryStorage({ [PREFS_KEY]: raw }))).toEqual(defaultPrefs())
  })

  it('d\'anciennes préférences sans thème donnent le thème automatique', () => {
    const raw = JSON.stringify({ lang: 'en', packId: 'code', duration: 15 })
    expect(loadPrefs(memoryStorage({ [PREFS_KEY]: raw })).theme).toBe('system')
  })

  it('le style de combat est « stickmen » par défaut, et un choix valide est conservé', () => {
    expect(defaultPrefs().fightStyle).toBe('stick')
    const raw = JSON.stringify({ lang: 'fr', fightStyle: 'keys' })
    expect(loadPrefs(memoryStorage({ [PREFS_KEY]: raw })).fightStyle).toBe('keys')
    expect(loadPrefs(memoryStorage({ [PREFS_KEY]: JSON.stringify({ lang: 'fr' }) })).fightStyle).toBe('stick')
  })

  it('nextTheme fait tourner Auto -> Clair -> Sombre -> Auto', () => {
    expect(nextTheme('system')).toBe('light')
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('system')
  })

  it('résiste au JSON corrompu', () => {
    expect(loadPrefs(memoryStorage({ [PREFS_KEY]: '{' }))).toEqual(defaultPrefs())
  })
})

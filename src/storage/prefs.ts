import { isPackId, type Lang, type PackId } from '../content/packs'
import { isLevel, type Level } from '../content/words'
import { browserStorage, type KeyValueStorage } from './history'

export const DURATIONS = [15, 30, 60] as const
export type Duration = (typeof DURATIONS)[number]

/** « system » suit le réglage du système d'exploitation. */
export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

function isTheme(v: unknown): v is Theme {
  return THEMES.some((t) => t === v)
}

/** Auto -> Clair -> Sombre -> Auto… */
export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
}

/** Rendu des combattants du mode Combat. */
export const FIGHT_STYLES = ['stick', 'keys'] as const
export type FightStyle = (typeof FIGHT_STYLES)[number]

function isFightStyle(v: unknown): v is FightStyle {
  return FIGHT_STYLES.some((s) => s === v)
}

export interface Prefs {
  lang: Lang
  packId: PackId
  /** Difficulté du pack « Mots ». */
  level: Level
  duration: Duration
  /** Exige les accents exacts (sinon « e » vaut « é »). */
  strictAccents: boolean
  sound: boolean
  theme: Theme
  fightStyle: FightStyle
}

export const PREFS_KEY = 'typeup.prefs'

export function defaultPrefs(): Prefs {
  return {
    lang: 'fr',
    packId: 'words',
    level: 'medium',
    duration: 30,
    strictAccents: false,
    sound: false,
    theme: 'system',
    fightStyle: 'stick',
  }
}

function isDuration(v: unknown): v is Duration {
  return DURATIONS.some((d) => d === v)
}

export function loadPrefs(storage: KeyValueStorage | null = browserStorage()): Prefs {
  const base = defaultPrefs()
  if (!storage) return base
  try {
    const raw = storage.getItem(PREFS_KEY)
    if (!raw) return base
    const d: unknown = JSON.parse(raw)
    if (typeof d !== 'object' || d === null) return base
    const p = d as Record<string, unknown>
    return {
      lang: p.lang === 'fr' || p.lang === 'en' ? p.lang : base.lang,
      packId: isPackId(p.packId) ? p.packId : base.packId,
      level: isLevel(p.level) ? p.level : base.level,
      duration: isDuration(p.duration) ? p.duration : base.duration,
      strictAccents: typeof p.strictAccents === 'boolean' ? p.strictAccents : base.strictAccents,
      sound: typeof p.sound === 'boolean' ? p.sound : base.sound,
      theme: isTheme(p.theme) ? p.theme : base.theme,
      fightStyle: isFightStyle(p.fightStyle) ? p.fightStyle : base.fightStyle,
    }
  } catch {
    return base
  }
}

export function savePrefs(prefs: Prefs, storage: KeyValueStorage | null = browserStorage()): void {
  if (!storage) return
  try {
    storage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // préférences non critiques : on ignore l'échec
  }
}

import type { Strings } from '../i18n'
import { nextTheme, type Theme } from '../storage/prefs'

const ICONS: Record<Theme, string> = { system: '🖥️', light: '☀️', dark: '🌙' }

interface Props {
  theme: Theme
  t: Strings
  onChange: (theme: Theme) => void
}

/** Bouton unique qui fait tourner Auto -> Clair -> Sombre. */
export function ThemeToggle({ theme, t, onChange }: Props) {
  const names: Record<Theme, string> = {
    system: t.themeSystem,
    light: t.themeLight,
    dark: t.themeDark,
  }
  const label = `${t.theme} : ${names[theme]}`
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      title={label}
      onClick={() => onChange(nextTheme(theme))}
    >
      <span aria-hidden="true">{ICONS[theme]}</span>
    </button>
  )
}

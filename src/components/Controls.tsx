import { PACKS } from '../content/packs'
import { LEVELS } from '../content/words'
import type { Strings } from '../i18n'
import { DURATIONS, type Prefs } from '../storage/prefs'
import { PackIcon } from './PackIcon'

interface Props {
  prefs: Prefs
  t: Strings
  onChange: (patch: Partial<Prefs>) => void
}

export function Controls({ prefs, t, onChange }: Props) {
  const { lang } = prefs
  return (
    <div className="controls">
      <div className="chips" role="group" aria-label="Packs">
        {PACKS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`chip${p.id === prefs.packId ? ' chip--on' : ''}`}
            aria-pressed={p.id === prefs.packId}
            title={p.blurb[lang]}
            onClick={() => onChange({ packId: p.id })}
          >
            <PackIcon id={p.id} />
            {p.label[lang]}
          </button>
        ))}
      </div>

      <div className="options">
        {prefs.packId === 'words' && (
          <div className="segmented" role="group" aria-label={t.difficulty}>
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                className={l === prefs.level ? 'on' : ''}
                aria-pressed={l === prefs.level}
                onClick={() => onChange({ level: l })}
              >
                {t[l]}
              </button>
            ))}
          </div>
        )}
        <div className="segmented" role="group" aria-label={t.duration}>
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              className={d === prefs.duration ? 'on' : ''}
              aria-pressed={d === prefs.duration}
              onClick={() => onChange({ duration: d })}
            >
              {d}s
            </button>
          ))}
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={prefs.strictAccents}
            onChange={(e) => onChange({ strictAccents: e.target.checked })}
          />
          {t.strictAccents}
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={prefs.sound}
            onChange={(e) => onChange({ sound: e.target.checked })}
          />
          {t.sound}
        </label>
      </div>
    </div>
  )
}

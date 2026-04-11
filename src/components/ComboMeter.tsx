import { comboMultiplier, comboProgress } from '../engine/typing'

export function ComboMeter({ combo, label }: { combo: number; label: string }) {
  const mult = comboMultiplier(combo)
  return (
    <div className={`combo combo--x${Math.min(mult, 5)}`} aria-label={`${label} x${mult}`}>
      {/* key = palier : la classe d'animation se rejoue à chaque montée */}
      <span key={mult} className="combo-mult">
        x{mult}
      </span>
      <div className="combo-bar" aria-hidden="true">
        <div className="combo-fill" style={{ width: `${Math.round(comboProgress(combo) * 100)}%` }} />
      </div>
      <span className="combo-count">
        {combo} {label.toLowerCase()}
      </span>
    </div>
  )
}

import { ChevronsUp, CornerDownLeft, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { topMistakes } from '../engine/typing'
import { levelInfo } from '../engine/xp'
import type { Strings } from '../i18n'
import type { SessionRecord } from '../storage/history'
import { Mascot } from './Mascot'

export interface RoundResult {
  record: SessionRecord
  /** Niveau avant / après cette manche. */
  levelBefore: number
  levelAfter: number
  isRecord: boolean
  /** XP totale après la manche (pour la barre de niveau). */
  totalXp: number
}

interface Props {
  result: RoundResult
  t: Strings
  onRetry: () => void
  onHistory: () => void
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** Compteur animé de 0 à `target` (direct si l'utilisateur préfère moins d'animations). */
function useCountUp(target: number, ms = 900): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))
  useEffect(() => {
    if (prefersReducedMotion()) return
    const stop = new AbortController()
    const start = performance.now()
    const tick = (now: number) => {
      if (stop.signal.aborted) return
      const p = Math.min(1, (now - start) / ms)
      setValue(Math.round(target * (1 - (1 - p) ** 3)))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return () => stop.abort()
  }, [target, ms])
  return value
}

export function Results({ result, t, onRetry, onHistory }: Props) {
  const { record, levelBefore, levelAfter, isRecord, totalXp } = result
  const xpShown = useCountUp(record.xp)
  const lvl = levelInfo(totalXp)
  const missed = topMistakes(record.mistakes, 6)
  const leveledUp = levelAfter > levelBefore

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        onRetry()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onRetry])

  return (
    <section className="results" aria-live="polite">
      <Mascot mood={isRecord || leveledUp ? 'hyped' : record.accuracy >= 0.9 ? 'happy' : 'idle'} />
      <h2>{t.resultsTitle}</h2>

      {(isRecord || leveledUp) && (
        <div className="badges">
          {isRecord && (
            <span className="badge badge--record">
              <Trophy className="icon" aria-hidden="true" />
              {t.newRecord}
            </span>
          )}
          {leveledUp && (
            <span className="badge badge--level">
              <ChevronsUp className="icon" aria-hidden="true" />
              {t.levelUp(levelAfter)}
            </span>
          )}
        </div>
      )}

      <div className="big-wpm">
        <span className="big-wpm-value">{Math.round(record.wpm)}</span>
        <span className="big-wpm-unit">WPM</span>
      </div>

      <dl className="result-grid">
        <div>
          <dt>{t.accuracy}</dt>
          <dd>{Math.round(record.accuracy * 100)}%</dd>
        </div>
        <div>
          <dt>{t.raw}</dt>
          <dd>{Math.round(record.rawWpm)}</dd>
        </div>
        <div>
          <dt>{t.bestCombo}</dt>
          <dd>{record.maxCombo}</dd>
        </div>
      </dl>

      <div className="xp-gain">
        <span>
          +{xpShown} XP <small>{t.xpGained}</small>
        </span>
        <div className="xp-bar" aria-hidden="true">
          <div className="xp-fill" style={{ width: `${Math.round(lvl.progress * 100)}%` }} />
        </div>
        <small>
          {t.level} {lvl.level} · {lvl.into}/{lvl.needed} XP
        </small>
      </div>

      <div className="missed">
        <h3>{t.missedKeys}</h3>
        {missed.length === 0 ? (
          <p>{t.noMistakes}</p>
        ) : (
          <ul>
            {missed.map(({ key, count }) => (
              <li key={key}>
                <kbd>{key === ' ' ? t.space : key}</kbd> ×{count}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="actions">
        <button type="button" className="btn btn--primary" onClick={onRetry} autoFocus>
          {t.retry}
          <kbd aria-label="Entrée">
            <CornerDownLeft className="icon" aria-hidden="true" />
          </kbd>
        </button>
        <button type="button" className="btn" onClick={onHistory}>
          {t.seeHistory}
        </button>
      </div>
    </section>
  )
}

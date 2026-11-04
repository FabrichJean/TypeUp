import { Ghost } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { RoundText } from '../content/session-text'
import { comboMultiplier, getMetrics, type TypingState } from '../engine/typing'
import { useTypingTest } from '../hooks/useTypingTest'
import type { Strings } from '../i18n'
import { playCombo, playError } from '../sound'
import { ComboMeter } from './ComboMeter'
import { Mascot, type Mood } from './Mascot'
import { TypingArea } from './TypingArea'

interface Props {
  round: RoundText
  /** Durée en secondes. */
  duration: number
  strictAccents: boolean
  sound: boolean
  /** WPM du meilleur score sur ce pack (0 = pas de fantôme). */
  ghostWpm: number
  t: Strings
  onFinish: (final: TypingState) => void
  onRestart: () => void
}

export function Game({
  round,
  duration,
  strictAccents,
  sound,
  ghostWpm,
  t,
  onFinish,
  onRestart,
}: Props) {
  const { state, now, remainingMs, input } = useTypingTest({
    text: round.text,
    duration,
    strictAccents,
    onFinish,
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const composing = useRef(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const m = getMetrics(state, now)
  const mult = comboMultiplier(state.combo)

  // Sons : un « ding » à chaque palier de combo, un « bzzt » à chaque erreur.
  useEffect(() => {
    if (sound && mult > 1) playCombo(mult)
  }, [mult]) // eslint-disable-line -- le réglage `sound` est constant pendant une manche
  useEffect(() => {
    if (sound && state.lastErrorAt !== null) playError()
  }, [state.lastErrorAt]) // eslint-disable-line -- idem

  const recentError = state.lastErrorAt !== null && now - state.lastErrorAt < 700
  const mood: Mood = recentError
    ? 'oops'
    : state.combo >= 30
      ? 'hyped'
      : state.combo >= 10
        ? 'happy'
        : 'idle'

  const ghostIndex =
    ghostWpm > 0 && state.startedAt !== null
      ? Math.min(Math.floor((ghostWpm * 5 * m.elapsedMs) / 60000), round.text.length - 1)
      : null

  const sync = (el: HTMLInputElement) => {
    const accepted = input(el.value)
    if (accepted !== el.value) el.value = accepted
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' || e.key === 'Escape') {
      e.preventDefault()
      onRestart()
    } else if (e.key === 'Enter' || e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') {
      e.preventDefault() // le texte est sur une seule ligne et le curseur reste en fin de saisie
    }
  }

  const started = state.startedAt !== null

  return (
    <section className="game" aria-label={t.play}>
      <div className="hud">
        <div className="stat stat--time">
          <span className="stat-value" role="timer">
            {Math.ceil(remainingMs / 1000)}
          </span>
          <span className="stat-label">{t.time}</span>
        </div>
        <div className="stat">
          <span className="stat-value">{started ? Math.round(m.wpm) : 0}</span>
          <span className="stat-label">WPM</span>
        </div>
        <div className="stat">
          <span className="stat-value">{Math.round(m.accuracy * 100)}%</span>
          <span className="stat-label">{t.accuracy}</span>
        </div>
        <div className="hud-combo">
          <ComboMeter combo={state.combo} label={t.combo} />
          <Mascot mood={mood} />
        </div>
      </div>

      <div className="stage">
        <TypingArea
          target={round.text}
          typed={state.typed}
          strictAccents={strictAccents}
          ghostIndex={ghostIndex}
          focused={focused}
        />
        <input
          ref={inputRef}
          className="capture"
          type="text"
          aria-label={t.inputLabel}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          onInput={(e) => {
            if (!composing.current) sync(e.currentTarget)
          }}
          onCompositionStart={() => {
            composing.current = true
          }}
          onCompositionEnd={(e) => {
            composing.current = false
            sync(e.currentTarget)
          }}
        />
      </div>

      <p className="hints">
        <span>{started ? t.restartHint : t.startHint}</span>
        {ghostIndex !== null && (
          <span className="ghost-note with-icon">
            <Ghost className="icon" aria-hidden="true" />
            {t.ghost(Math.round(ghostWpm))}
          </span>
        )}
        {round.offline && <span className="warn-note">{t.offlineNotice}</span>}
        {round.title && (
          <span className="source">
            {t.source} {round.title}
          </span>
        )}
      </p>
    </section>
  )
}

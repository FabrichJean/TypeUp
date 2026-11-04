import {
  CornerDownLeft,
  Crosshair,
  Dumbbell,
  HeartPulse,
  Pause,
  RotateCcw,
  Shield,
  ShieldHalf,
  Skull,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  Cross,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lang } from '../../content/packs'
import { fold, MAX_BURST } from '../../engine/typing'
import { pickSuperText, fightPool } from '../../fight/content'
import {
  MOVE_DMG,
  accuracy,
  cancelLock,
  chooseTech,
  enterRound,
  newFight,
  press,
  startSuper,
  superReady,
  tick,
  type FightState,
} from '../../fight/engine'
import { FOES, type TechId } from '../../fight/foes'
import type { FightStrings } from '../../fight/strings'
import { playCombo, playDone, playError, playHurt, playKO, playKey, playKill, playOver, playParry, playSuper } from '../../sound'
import type { FightSummary } from '../../storage/fight'
import { Mascot, type Mood } from '../Mascot'
import { AttackCard } from './AttackCard'
import { Briefing } from './Briefing'
import { FoeArt, type FoeMood } from './FoeArt'
import { KeyboardFloor, type LastKey } from './KeyboardFloor'

interface Props {
  lang: Lang
  words: readonly string[]
  sound: boolean
  t: FightStrings
  prevBest: number
  /** Index de l'adversaire d'un duel ; absent pour le tournoi complet. */
  duelFoe?: number
  /** Affiche d'abord la présentation de l'adversaire (sautée pour une revanche). */
  briefing: boolean
  onEnd: (run: FightSummary) => void
  onAgain: () => void
  onMenu: () => void
}

const TECH_ICONS: Record<TechId, LucideIcon> = {
  reflex: Timer,
  power: Dumbbell,
  focus: Crosshair,
  counter: Swords,
  vitality: HeartPulse,
  stoneskin: ShieldHalf,
  medic: Cross,
}

const DIGIT_INDEX: Record<string, number> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Numpad1: 0,
  Numpad2: 1,
  Numpad3: 2,
}

export function FightRun({ lang, words, sound, t, prevBest, duelFoe, briefing: showBriefing, onEnd, onAgain, onMenu }: Props) {
  const duel = duelFoe !== undefined
  const pool = useMemo(() => fightPool(words), [words])
  const [state, setState] = useState<FightState>(() => enterRound(newFight(duel), duelFoe ?? 0, pool))
  const [paused, setPaused] = useState(false)
  /** Adversaire dont on affiche la présentation (le jeu est alors en pause). */
  const [briefing, setBriefing] = useState<number | null>(showBriefing ? (duelFoe ?? 0) : null)
  const [lastKey, setLastKey] = useState<LastKey | null>(null)

  const stateRef = useRef(state)
  const pausedRef = useRef(showBriefing)
  const briefingRef = useRef(briefing)
  const inputRef = useRef<HTMLInputElement>(null)
  const composing = useRef(false)
  const ended = useRef(false)
  const keyCount = useRef(0)

  const commit = useCallback((next: FightState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const setPause = useCallback((value: boolean) => {
    pausedRef.current = value
    setPaused(value)
    if (!value) inputRef.current?.focus()
  }, [])

  // Boucle de jeu. Les longues pauses (onglet en arrière-plan) sont plafonnées à 50 ms.
  useEffect(() => {
    inputRef.current?.focus()
    const clock = { last: performance.now(), raf: 0 }
    const frame = (now: number) => {
      const dt = Math.min(now - clock.last, 50)
      clock.last = now
      if (!pausedRef.current) {
        const current = stateRef.current
        const next = tick(current, dt)
        if (next !== current) commit(next)
      }
      clock.raf = requestAnimationFrame(frame)
    }
    clock.raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(clock.raf)
  }, [commit])

  // Pause automatique quand on quitte l'onglet.
  useEffect(() => {
    const onHide = () => {
      const phase = stateRef.current.phase
      if (document.hidden && (phase === 'fight' || phase === 'super')) setPause(true)
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [setPause])

  // Fin du tournoi : signalée une seule fois.
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !ended.current) {
      ended.current = true
      onEnd({
        score: state.score,
        roundsWon: state.roundsWon,
        cleared: state.phase === 'victory',
        parries: state.stats.parries,
        duelFoe: duelFoe === undefined ? undefined : FOES[duelFoe].id,
      })
    }
  }, [state.phase, state.score, state.roundsWon, state.stats.parries, duelFoe, onEnd])

  // Sons : on compare l'état à celui de l'image précédente.
  const prev = useRef(state)
  useEffect(() => {
    const p = prev.current
    prev.current = state
    if (!sound || state === p) return
    if (state.phase === 'defeat' && p.phase !== 'defeat') return playOver()
    if (state.phase === 'victory' && p.phase !== 'victory') return playDone()
    if (state.phase === 'ko' && p.phase !== 'ko') return playKO()
    if (state.phase === 'super' && p.phase !== 'super') return playSuper()
    if (state.hp < p.hp) return playHurt()
    if (state.stats.parries > p.stats.parries) return playParry()
    if (state.stats.moves > p.stats.moves) return playKill(Math.min(state.chain, 8))
    if (state.lastErrorAt !== p.lastErrorAt) return playError()
    if (state.chain > p.chain && state.chain % 5 === 0) return playCombo(state.chain / 5)
    if (state.stats.correct > p.stats.correct) playKey()
  }, [state, sound])

  const nextRound = useCallback(
    (id: TechId) => {
      const s = stateRef.current
      if (s.phase !== 'between' || !s.offers.includes(id)) return
      // La technique est prise ; on présente d'abord le prochain adversaire.
      commit(chooseTech(s, id))
      pausedRef.current = true
      briefingRef.current = s.round + 1
      setBriefing(s.round + 1)
    },
    [commit],
  )

  const startFight = useCallback(() => {
    const round = briefingRef.current
    if (round === null) return
    briefingRef.current = null
    setBriefing(null)
    commit(enterRound(stateRef.current, round, pool))
    pausedRef.current = false
    setPaused(false)
  }, [commit, pool])

  // Une fois la présentation fermée, la zone de saisie apparaît : on lui donne le focus.
  useEffect(() => {
    if (briefing === null) inputRef.current?.focus()
  }, [briefing])

  const launchSuper = useCallback(() => {
    const s = stateRef.current
    if (pausedRef.current || !superReady(s)) return
    commit(startSuper(s, pickSuperText(lang)))
    inputRef.current?.focus()
  }, [commit, lang])

  const handleChars = (chars: string) => {
    if (pausedRef.current || chars.length > MAX_BURST) return
    for (const ch of chars) {
      const current = stateRef.current
      const next = press(current, ch)
      if (next === current) continue
      commit(next)
      const ok = next.stats.correct > current.stats.correct
      setLastKey({ key: fold(ch).toLowerCase(), n: ++keyCount.current, ok })
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const s = stateRef.current
    const playing = s.phase === 'fight' || s.phase === 'super'
    if (e.key === 'Escape') {
      e.preventDefault()
      if (playing) setPause(!pausedRef.current)
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      const next = cancelLock(s)
      if (next !== s && !pausedRef.current) commit(next)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (s.phase === 'fight') launchSuper()
      else if (s.phase === 'defeat' || s.phase === 'victory') onAgain()
    } else if (s.phase === 'between' && e.code in DIGIT_INDEX) {
      e.preventDefault()
      const id = s.offers[DIGIT_INDEX[e.code]]
      if (id) nextRound(id)
    } else if (e.key === 'Tab' || e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
    }
  }

  if (briefing !== null) return <Briefing lang={lang} foeIndex={briefing} t={t} onStart={startFight} />

  const foe = FOES[state.round]
  const foeText = t.foes[foe.id]
  const playing = state.phase === 'fight' || state.phase === 'super'
  const now = state.time
  const within = (stamp: number | null, ms: number) => stamp !== null && now - stamp < ms

  const foeMood: FoeMood =
    state.foeHp <= 0
      ? 'ko'
      : state.foeStunMs > 0 || state.phase === 'super'
        ? 'stunned'
        : within(state.lastFoeHitAt, 260)
          ? 'hurt'
          : state.attacks.length > 0
            ? 'windup'
            : 'idle'
  const playerMood: Mood =
    state.phase === 'defeat' || within(state.lastPlayerHitAt, 600) || state.stunMs > 0
      ? 'oops'
      : state.chain >= 6 || state.phase === 'super' || state.phase === 'victory'
        ? 'hyped'
        : state.chain >= 3
          ? 'happy'
          : 'idle'

  const foePct = (state.foeHp / state.foeMax) * 100
  const hpPct = (state.hp / state.maxHp) * 100
  const ready = superReady(state)
  const run = state.superRun
  const isRecord = !duel && state.score > prevBest

  const arenaClass = [
    'f-arena',
    state.shakeMs > 0 && 'f-arena--shake',
    state.phase === 'super' && 'f-arena--super',
    within(state.lastPlayerHitAt, 220) && 'f-arena--flash',
    state.phase === 'ko' && 'f-arena--ko',
  ]
    .filter(Boolean)
    .join(' ')

  const playerClass = [
    'f-player',
    within(state.lastMoveAt, 260) && `f-player--attack f-player--${state.lastMoveKind}`,
    within(state.lastPlayerHitAt, 320) && 'f-player--hurt',
    within(state.lastParryAt, 420) && 'f-player--parry',
    state.phase === 'super' && 'f-player--super',
  ]
    .filter(Boolean)
    .join(' ')

  const foeClass = [
    'f-foe',
    `f-foe--${foe.id}`,
    `f-foe--${foeMood}`,
    within(state.lastPlayerHitAt, 300) && 'f-foe--strike',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="fight-run" aria-label={t.title} style={{ '--hue': foe.hue } as React.CSSProperties}>
      <div className="f-top">
        <div className="f-fighter f-fighter--left">
          <div className="f-name">
            <strong>{t.you}</strong>
            <small>
              {Math.ceil(state.hp)}/{state.maxHp}
            </small>
          </div>
          <div className="f-hp" role="progressbar" aria-valuemin={0} aria-valuemax={state.maxHp} aria-valuenow={state.hp}>
            <span className="f-hp-ghost" style={{ width: `${hpPct}%` }} />
            <span className={`f-hp-fill ${hpPct < 30 ? 'f-hp-fill--low' : ''}`} style={{ width: `${hpPct}%` }} />
          </div>
        </div>

        <div className="f-round">
          <small>{duel ? t.duelLabel : t.round(state.round + 1, FOES.length)}</small>
          <Swords className="icon" aria-hidden="true" />
        </div>

        <div className="f-fighter f-fighter--right">
          <div className="f-name">
            <strong>{foeText.name}</strong>
            <small>
              {Math.ceil(state.foeHp)}/{state.foeMax}
            </small>
          </div>
          <div className="f-hp f-hp--foe" role="progressbar" aria-valuemin={0} aria-valuemax={state.foeMax} aria-valuenow={state.foeHp}>
            <span className="f-hp-ghost" style={{ width: `${foePct}%` }} />
            <span className="f-hp-fill" style={{ width: `${foePct}%` }} />
          </div>
        </div>
      </div>

      <div
        className={arenaClass}
        onPointerDown={(e) => {
          e.preventDefault() // garde le focus sur la zone de saisie (sinon la perte de focus mettrait en pause)
          if (pausedRef.current) setPause(false)
          else inputRef.current?.focus()
        }}
      >
        <div className="f-bg" aria-hidden="true" />
        <KeyboardFloor lang={lang} last={lastKey} />

        <div className={playerClass} aria-hidden="true">
          <Mascot mood={playerMood} />
          {within(state.lastParryAt, 420) && <span className="f-guard" />}
        </div>

        <div className={foeClass} aria-hidden="true">
          <FoeArt id={foe.id} mood={foeMood} />
          {foeMood === 'stunned' && (
            <span className="f-stars">
              <i />
              <i />
              <i />
            </span>
          )}
        </div>

        {state.chain >= 2 && (
          <div className="f-chain" key={state.chain}>
            <strong>x{state.chain}</strong>
            <small>{t.chain}</small>
          </div>
        )}

        {state.phase === 'fight' && state.attacks.length > 0 && (
          <div className="f-attacks">
            {state.attacks.map((a) => (
              <AttackCard key={a.id} a={a} locked={state.lock?.kind === 'attack' && state.lock.id === a.id} t={t} />
            ))}
          </div>
        )}

        {state.fx.map((f) => (
          <span key={f.id} className={`f-fx f-fx--${f.kind} f-fx--${f.side}`}>
            {f.text}
          </span>
        ))}

        {state.phase === 'super' && run && (
          <div className="f-super">
            <h3>
              <Sparkles className="icon" aria-hidden="true" />
              {t.superTitle}
            </h3>
            <p className="f-super-text">
              <span className="f-done">{run.text.slice(0, run.pos)}</span>
              <span className="q-cur">{run.text.charAt(run.pos)}</span>
              {run.text.slice(run.pos + 1)}
            </p>
            <div className="q-bar q-bar--rage">
              <span style={{ width: `${Math.min(1, run.timeLeft / Math.min(24000, Math.max(10000, run.text.length * 260))) * 100}%` }} />
            </div>
          </div>
        )}

        {state.phase === 'intro' && (
          <div className="q-overlay f-intro">
            <small>{duel ? t.duelLabel : t.round(state.round + 1, FOES.length)}</small>
            <h2>{foeText.name}</h2>
            <p className="f-taunt">« {foeText.taunt} »</p>
            <p className="f-tip">{foeText.tip}</p>
          </div>
        )}

        {paused && playing && (
          <div className="q-overlay q-overlay--pause">
            <Pause className="icon icon--xl" aria-hidden="true" />
            <h2>{t.paused}</h2>
            <p>{t.resume}</p>
          </div>
        )}

        {state.phase === 'between' && state.offers.length > 0 && (
          <div className="q-overlay q-overlay--upgrade">
            <h2>{t.koTitle}</h2>
            <h3>{t.chooseTech}</h3>
            <div className="q-offers">
              {state.offers.map((id, i) => {
                const Icon = TECH_ICONS[id]
                return (
                  <button key={id} type="button" className="q-relic" onPointerDown={(e) => e.stopPropagation()} onClick={() => nextRound(id)}>
                    <kbd>{i + 1}</kbd>
                    <Icon className="icon" width={30} height={30} aria-hidden="true" />
                    <strong>{t.techs[id].name}</strong>
                    <span>{t.techs[id].desc}</span>
                    {(state.techs[id] ?? 0) > 0 && <small>x{state.techs[id]} →</small>}
                  </button>
                )
              })}
            </div>
            <p className="q-hint">{t.chooseHint}</p>
          </div>
        )}

        {(state.phase === 'victory' || state.phase === 'defeat') && (
          <div className="q-overlay q-overlay--over">
            {state.phase === 'victory' ? <Trophy className="icon icon--xl f-gold" aria-hidden="true" /> : <Skull className="icon icon--xl" aria-hidden="true" />}
            <h2>{state.phase === 'victory' ? (duel ? t.duelVictory : t.victory) : t.defeat}</h2>
            <p>
              {state.phase === 'victory'
                ? duel
                  ? t.duelVictoryLine(foeText.name)
                  : t.victoryLine
                : duel
                  ? t.duelDefeatLine(foeText.name)
                  : t.defeatLine(state.round + 1, FOES.length)}
            </p>
            {isRecord && (
              <span className="badge badge--record">
                <Trophy className="icon" aria-hidden="true" />
                {t.newBest}
              </span>
            )}
            <dl className="result-grid">
              <div>
                <dt>{t.score}</dt>
                <dd>{state.score.toLocaleString(lang)}</dd>
              </div>
              {!duel && (
                <div>
                  <dt>{t.roundsWon}</dt>
                  <dd>{state.roundsWon}</dd>
                </div>
              )}
              <div>
                <dt>{t.parriesStat}</dt>
                <dd>{state.stats.parries}</dd>
              </div>
              <div>
                <dt>{t.bestChain}</dt>
                <dd>{state.maxChain}</dd>
              </div>
              <div>
                <dt>{t.accuracy}</dt>
                <dd>{Math.round(accuracy(state) * 100)}%</dd>
              </div>
            </dl>
            <div className="actions">
              <button type="button" className="btn btn--primary" onPointerDown={(e) => e.stopPropagation()} onClick={onAgain} autoFocus>
                <RotateCcw className="icon" aria-hidden="true" />
                {duel ? t.rematch : t.again}
              </button>
              <button type="button" className="btn" onPointerDown={(e) => e.stopPropagation()} onClick={onMenu}>
                {t.menu}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="f-hand">
        <span className="f-hand-title">{t.yourMoves}</span>
        {state.hand.map((m) => {
          const locked = state.lock?.kind === 'move' && state.lock.id === m.id
          return (
            <div key={m.id} className={`f-move f-move--${m.kind} ${locked ? 'f-move--lock' : ''}`}>
              <small>
                {t.moves[m.kind]} <b>{MOVE_DMG[m.kind]}</b>
              </small>
              <span className="f-word">
                <span className="f-done">{m.word.slice(0, m.typed)}</span>
                {m.word.slice(m.typed)}
              </span>
            </div>
          )
        })}
        {state.stunMs > 0 && (
          <span className="f-stun">
            <Shield className="icon" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className={`f-meter ${ready ? 'f-meter--ready' : ''}`}>
        <span className="f-meter-label">
          <Sparkles className="icon" aria-hidden="true" />
          {t.superLabel}
        </span>
        <div className="q-bar q-bar--meter" aria-hidden="true">
          <span style={{ width: `${state.meter}%` }} />
        </div>
        <button type="button" className="btn btn--primary f-super-btn" disabled={!ready} onPointerDown={(e) => e.preventDefault()} onClick={launchSuper}>
          {ready ? t.superReady : `${Math.floor(state.meter)}%`}
          {ready && (
            <kbd aria-label={t.superHint}>
              <CornerDownLeft className="icon" aria-hidden="true" />
            </kbd>
          )}
        </button>
      </div>

      <p className="hints">
        <span>{t.pauseHint}</span>
        <span>{t.backspaceHint}</span>
      </p>

      <input
        ref={inputRef}
        className="capture"
        type="text"
        aria-label={t.inputLabel}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={onKeyDown}
        onBlur={() => {
          const phase = stateRef.current.phase
          if (phase === 'fight' || phase === 'super') setPause(true)
        }}
        onInput={(e) => {
          if (composing.current) return
          const el = e.currentTarget
          const value = el.value
          el.value = ''
          handleChars(value)
        }}
        onCompositionStart={() => {
          composing.current = true
        }}
        onCompositionEnd={(e) => {
          composing.current = false
          const el = e.currentTarget
          const value = el.value
          el.value = ''
          handleChars(value)
        }}
      />
    </section>
  )
}

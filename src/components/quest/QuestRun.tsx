import { Bug, Crown, Flame, Heart, Pause, RotateCcw, Shield, Skull, Swords, Trophy } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang } from '../../content/packs'
import { comboMultiplier, MAX_BURST } from '../../engine/typing'
import {
  BOSS_STRIKE_MS,
  LANES,
  accuracy,
  bossIndex,
  chooseRelic,
  enterFloor,
  isBossFloor,
  newRun,
  press,
  tick,
  unlock,
  type FloorContext,
  type QuestState,
} from '../../quest/engine'
import { loadBossForFloor, loadBossText, poolFor, type BossText } from '../../quest/content'
import { RELIC_IDS, type RelicId } from '../../quest/relics'
import type { QuestStrings } from '../../quest/strings'
import {
  playCombo,
  playDone,
  playError,
  playHurt,
  playKey,
  playKill,
  playOver,
} from '../../sound'
import type { RunSummary } from '../../storage/quest'
import { Mascot, type Mood } from '../Mascot'
import { RelicIcon } from './RelicIcon'

interface Props {
  lang: Lang
  words: readonly string[]
  sound: boolean
  t: QuestStrings
  /** Meilleur score avant cette partie (pour annoncer un record). */
  prevBest: number
  onEnd: (run: RunSummary) => void
  onAgain: () => void
  onMenu: () => void
}

const DIGIT_INDEX: Record<string, number> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Numpad1: 0,
  Numpad2: 1,
  Numpad3: 2,
}

const laneTop = (lane: number): string => `${((lane + 0.5) / LANES) * 100}%`

export function QuestRun({ lang, words, sound, t, prevBest, onEnd, onAgain, onMenu }: Props) {
  const [state, setState] = useState<QuestState>(() =>
    enterFloor(newRun(), 1, { pool: poolFor(words, 1) }),
  )
  const [paused, setPaused] = useState(false)
  const [preparing, setPreparing] = useState(false)

  const stateRef = useRef(state)
  const pausedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const composing = useRef(false)
  const busy = useRef(false)
  const alive = useRef(true)
  const ended = useRef(false)
  const bossRef = useRef<Promise<BossText> | null>(null)

  const commit = useCallback((next: QuestState) => {
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
    alive.current = true
    bossRef.current = loadBossText(lang, 0)
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
    return () => {
      alive.current = false
      cancelAnimationFrame(clock.raf)
    }
  }, [lang, commit])

  // Pause automatique quand on quitte l'onglet.
  useEffect(() => {
    const onHide = () => {
      const phase = stateRef.current.phase
      if (document.hidden && (phase === 'fight' || phase === 'boss')) setPause(true)
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [setPause])

  // Fin de partie : on la signale une seule fois.
  useEffect(() => {
    if (state.phase === 'over' && !ended.current) {
      ended.current = true
      onEnd({ score: state.score, floor: state.floor, kills: state.kills })
    }
  }, [state.phase, state.score, state.floor, state.kills, onEnd])

  // Sons : on compare l'état à celui de l'image précédente.
  const prev = useRef(state)
  useEffect(() => {
    const p = prev.current
    prev.current = state
    if (!sound || state === p) return
    if (state.phase === 'over' && p.phase !== 'over') return playOver()
    if (state.hp < p.hp) return playHurt()
    if (state.phase === 'upgrade' && p.phase !== 'upgrade') return playDone()
    if (state.kills > p.kills) return playKill(comboMultiplier(state.combo))
    if (state.errors > p.errors) return playError()
    if (comboMultiplier(state.combo) > comboMultiplier(p.combo)) return playCombo(comboMultiplier(state.combo))
    if (state.correct > p.correct) playKey()
  }, [state, sound])

  const advance = useCallback(
    async (id: RelicId) => {
      const s = stateRef.current
      if (busy.current || s.phase !== 'upgrade' || !s.offers.includes(id)) return
      busy.current = true
      commit(chooseRelic(s, id))
      inputRef.current?.focus()

      const floor = s.floor + 1
      let ctx: FloorContext = { pool: poolFor(words, floor) }
      if (isBossFloor(floor)) {
        setPreparing(true)
        const boss = await (bossRef.current ?? loadBossForFloor(lang, floor))
        // Le boss suivant se prépare pendant qu'on affronte celui-ci.
        bossRef.current = loadBossText(lang, bossIndex(floor) + 1)
        ctx = { ...ctx, bossText: boss.text, bossName: boss.name }
        if (alive.current) setPreparing(false)
      }
      if (alive.current) commit(enterFloor(stateRef.current, floor, ctx))
      busy.current = false
    },
    [commit, lang, words],
  )

  const handleChars = (chars: string) => {
    if (pausedRef.current || chars.length > MAX_BURST) return
    for (const ch of chars) {
      const current = stateRef.current
      const next = press(current, ch)
      if (next !== current) commit(next)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const s = stateRef.current
    const playing = s.phase === 'fight' || s.phase === 'boss'
    if (e.key === 'Escape') {
      e.preventDefault()
      if (playing) setPause(!pausedRef.current)
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      const next = unlock(s)
      if (next !== s && !pausedRef.current) commit(next)
    } else if (s.phase === 'upgrade' && e.code in DIGIT_INDEX) {
      e.preventDefault()
      const id = s.offers[DIGIT_INDEX[e.code]]
      if (id) void advance(id)
    } else if (s.phase === 'over' && e.key === 'Enter') {
      e.preventDefault()
      onAgain()
    } else if (
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key.startsWith('Arrow') ||
      e.key === 'Home' ||
      e.key === 'End'
    ) {
      e.preventDefault()
    }
  }

  const boss = state.boss
  const bossFight = state.phase === 'boss' && boss !== null
  const heat = Math.min(state.combo / 50, 1)
  const mult = comboMultiplier(state.combo)
  const recentTrouble =
    (state.lastHitAt !== null && state.time - state.lastHitAt < 700) ||
    (state.lastErrorAt !== null && state.time - state.lastErrorAt < 500)
  const mood: Mood = recentTrouble ? 'oops' : state.combo >= 30 ? 'hyped' : state.combo >= 10 ? 'happy' : 'idle'
  const playing = state.phase === 'fight' || state.phase === 'boss'
  const relicEntries = RELIC_IDS.filter((id) => (state.relics[id] ?? 0) > 0)
  const flawless = state.floorHpLost === 0
  const isRecord = state.score > prevBest

  const arenaClass = [
    'q-arena',
    state.shakeMs > 0 && 'q-arena--shake',
    state.hp <= 2 && state.phase !== 'over' && 'q-arena--danger',
    state.freezeMs > 0 && 'q-arena--frozen',
    bossFight && 'q-arena--boss',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="quest-run" aria-label={t.title}>
      <div className="q-hud">
        <div className="q-hearts" role="img" aria-label={`${t.hp} : ${Math.max(0, state.hp)}/${state.maxHp}`}>
          {Array.from({ length: state.maxHp }, (_, i) => (
            <Heart
              key={i}
              className={`icon q-heart ${i < state.hp ? 'q-heart--full' : ''}`}
              fill={i < state.hp ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          ))}
          {state.shield > 0 && (
            <span className="q-shield" title={t.shield}>
              <Shield className="icon" aria-hidden="true" />
              {state.shield}
            </span>
          )}
        </div>

        <div className="q-floor">
          {bossFight ? <Skull className="icon" aria-hidden="true" /> : <Swords className="icon" aria-hidden="true" />}
          <span>
            {t.floor} {state.floor}
          </span>
          {!bossFight && state.phase === 'fight' && (
            <small>
              {Math.min(state.spawned, state.total)}/{state.total}
            </small>
          )}
        </div>

        <div className="q-score" aria-live="off">
          <strong>{state.score.toLocaleString(lang)}</strong>
          <small>{t.score}</small>
        </div>

        <div className={`q-combo ${mult > 1 ? 'q-combo--on' : ''}`}>
          <Flame className="icon" aria-hidden="true" />
          <strong>{state.combo}</strong>
          {mult > 1 && <span className="q-mult">x{mult}</span>}
        </div>
      </div>

      <div
        className={arenaClass}
        style={{ '--heat': heat } as React.CSSProperties}
        onPointerDown={(e) => {
          e.preventDefault() // garde le focus sur la zone de saisie (sinon la perte de focus mettrait en pause)
          if (pausedRef.current) setPause(false)
          else inputRef.current?.focus()
        }}
      >
        <div className="q-bg" aria-hidden="true" />

        <div className="q-player" aria-hidden="true">
          <Mascot mood={mood} />
        </div>

        {state.phase === 'fight' &&
          state.enemies.map((e) => (
            <div
              key={e.id}
              className={[
                'q-enemy',
                e.golden && 'q-enemy--gold',
                state.lockId === e.id && 'q-enemy--lock',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ left: `${e.x * 100}%`, top: laneTop(e.lane), '--x': e.x } as React.CSSProperties}
            >
              {e.golden ? (
                <Crown className="icon" aria-hidden="true" />
              ) : (
                <Bug className="icon" aria-hidden="true" />
              )}
              <span className="q-word">
                <span className="q-done">{e.word.slice(0, e.typed)}</span>
                {e.word.slice(e.typed)}
              </span>
            </div>
          ))}

        {bossFight && boss && (
          <div className="q-boss">
            <div className="q-boss-head">
              <Skull className="icon icon--lg" aria-hidden="true" />
              <strong>{boss.name}</strong>
              <div
                className="q-bar q-bar--hp"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={boss.text.length}
                aria-valuenow={boss.text.length - boss.pos}
              >
                <span style={{ width: `${(1 - boss.pos / boss.text.length) * 100}%` }} />
              </div>
            </div>
            <p className="q-boss-text">
              <span className="q-done">{boss.text.slice(0, boss.pos)}</span>
              <span className="q-cur">{boss.text.charAt(boss.pos)}</span>
              {boss.text.slice(boss.pos + 1)}
            </p>
            <div className="q-rage" title={t.bossRage}>
              <span>{t.bossRage}</span>
              <div className="q-bar q-bar--rage">
                <span style={{ width: `${Math.min(boss.charge / BOSS_STRIKE_MS, 1) * 100}%` }} />
              </div>
            </div>
          </div>
        )}

        {state.fx.map((f) => (
          <span key={f.id} className={`q-fx q-fx--${f.kind}`} style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%` }}>
            {f.text}
          </span>
        ))}
        {state.fx.some((f) => f.kind === 'nova') && <div className="q-nova" aria-hidden="true" />}

        {playing && state.bannerMs > 0 && (
          <div className="q-banner" aria-live="polite">
            {bossFight ? t.bossBanner : t.floorBanner(state.floor)}
          </div>
        )}

        {preparing && (
          <div className="q-overlay" role="status">
            <p>{t.preparing}</p>
          </div>
        )}

        {paused && playing && (
          <div className="q-overlay q-overlay--pause">
            <Pause className="icon icon--xl" aria-hidden="true" />
            <h2>{t.paused}</h2>
            <p>{t.resume}</p>
          </div>
        )}

        {state.phase === 'upgrade' && !preparing && state.offers.length > 0 && (
          <div className="q-overlay q-overlay--upgrade">
            <h2>{t.floorCleared}</h2>
            <p className="q-bonus">
              {t.bonus(state.lastBonus)}
              {flawless && ` · ${t.flawless}`}
            </p>
            <h3>{t.chooseRelic}</h3>
            <div className="q-offers">
              {state.offers.map((id, i) => (
                <button
                  key={id}
                  type="button"
                  className="q-relic"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => void advance(id)}
                >
                  <kbd>{i + 1}</kbd>
                  <RelicIcon id={id} size={30} />
                  <strong>{t.relics[id].name}</strong>
                  <span>{t.relics[id].desc}</span>
                  {(state.relics[id] ?? 0) > 0 && <small>x{state.relics[id]} →</small>}
                </button>
              ))}
            </div>
            <p className="q-hint">{t.chooseHint}</p>
          </div>
        )}

        {state.phase === 'over' && (
          <div className="q-overlay q-overlay--over">
            <Skull className="icon icon--xl" aria-hidden="true" />
            <h2>{t.gameOver}</h2>
            <p>{t.reachedFloor(state.floor)}</p>
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
              <div>
                <dt>{t.kills}</dt>
                <dd>{state.kills}</dd>
              </div>
              <div>
                <dt>{t.bestCombo}</dt>
                <dd>{state.maxCombo}</dd>
              </div>
              <div>
                <dt>{t.accuracy}</dt>
                <dd>{Math.round(accuracy(state) * 100)}%</dd>
              </div>
            </dl>
            <div className="actions">
              <button type="button" className="btn btn--primary" onPointerDown={(e) => e.stopPropagation()} onClick={onAgain} autoFocus>
                <RotateCcw className="icon" aria-hidden="true" />
                {t.again}
              </button>
              <button type="button" className="btn" onPointerDown={(e) => e.stopPropagation()} onClick={onMenu}>
                {t.menu}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="q-foot">
        {relicEntries.length > 0 && (
          <ul className="q-relics" aria-label="Reliques">
            {relicEntries.map((id) => (
              <li key={id} title={`${t.relics[id].name} : ${t.relics[id].desc}`}>
                <RelicIcon id={id} size={18} />
                {(state.relics[id] ?? 0) > 1 && <small>x{state.relics[id]}</small>}
              </li>
            ))}
          </ul>
        )}
        <p className="hints">
          <span>{t.pauseHint}</span>
          {!bossFight && <span>{t.unlockHint}</span>}
          <span className="with-icon">
            <Crown className="icon" aria-hidden="true" />
            {t.golden}
          </span>
        </p>
      </div>

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
          if (phase === 'fight' || phase === 'boss') setPause(true)
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

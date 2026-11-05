import { CornerDownLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Lang } from '../../content/packs'
import { HAND_DAMAGE, HAND_WORD, SCENES, demoWords, frameAt, sceneDuration, type DemoFrame, type SceneDef } from '../../fight/demo'
import type { Attack } from '../../fight/engine'
import { FOES } from '../../fight/foes'
import type { FightStrings } from '../../fight/strings'
import { Mascot, type Mood } from '../Mascot'
import type { FightStyle } from '../../storage/prefs'
import { AttackCard } from './AttackCard'
import { FoeArt } from './FoeArt'
import { StickFighter } from './StickFighter'
import type { PoseName } from '../../fight/poses'
import type { Look } from '../../shop/catalog'

interface Props {
  lang: Lang
  foeIndex: number
  t: FightStrings
  fightStyle: FightStyle
  look: Look
  onStart: () => void
}

/** Pause entre deux scènes (ms). */
const GAP_MS = 700

function captionFor(frame: DemoFrame, scene: SceneDef, words: { answer: string; shown: string }, t: FightStrings): string {
  const d = t.demo
  switch (frame.stage) {
    case 'appear':
      return d.appear
    case 'trick':
      if (scene.trick === 'mirror') return d.mirror(words.shown, words.answer)
      if (scene.trick === 'scramble') return d.scramble(words.shown, words.answer)
      if (scene.trick === 'fading') return d.fading
      return d.plain
    case 'type':
      return scene.trick === 'mirror'
        ? d.mirror(words.shown, words.answer)
        : scene.trick === 'scramble'
          ? d.scramble(words.shown, words.answer)
          : d.type
    case 'parry':
      return d.parry
    case 'strike':
      return d.strike
    case 'feintTell':
      return d.feintTell
    case 'feintWait':
      return d.feintWait
    case 'feintOpen':
      return d.feintOpen
    case 'hitWait':
      return d.hitWait
    case 'hit':
      return d.hit
  }
}

/** Écran de présentation avant un combat : une démonstration animée de la ruse de l'adversaire. */
export function Briefing({ lang, foeIndex, t, fightStyle, look, onStart }: Props) {
  const stick = fightStyle === 'stick'
  const foe = FOES[foeIndex]
  const text = t.foes[foe.id]
  const scenes = SCENES[foe.id]
  const hand = HAND_WORD[lang]

  const durations = scenes.map((s) => sceneDuration(s, demoWords(lang, s).answer.length, hand.length) + GAP_MS)
  const loop = durations.reduce((a, b) => a + b, 0)

  // Horloge de l'animation (ms depuis l'ouverture de l'écran).
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const id = setInterval(() => setElapsed(performance.now() - start), 50)
    return () => clearInterval(id)
  }, [])

  // Entrée lance le combat.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onStart()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStart])

  let local = elapsed % loop
  let index = 0
  while (index < scenes.length - 1 && local >= durations[index]) {
    local -= durations[index]
    index += 1
  }
  const scene = scenes[index]
  const words = demoWords(lang, scene)
  const frame = frameAt(scene, words.answer.length, hand.length, Math.min(local, durations[index] - GAP_MS))
  const caption = captionFor(frame, scene, words, t)

  const fake: Attack = {
    id: 0,
    answer: words.answer,
    shown: words.shown,
    typed: frame.typed,
    trick: scene.trick,
    feint: scene.kind === 'feint',
    heavy: false,
    elapsed: (1 - frame.windupLeft) * 1000,
    windup: 1000,
    dmg: 10,
    fadeRank: Array.from({ length: words.answer.length }, (_, i) => i),
  }

  const foeStickPose: PoseName =
    frame.tap ? 'flinch' : frame.foe === 'hurt' ? 'hurt' : frame.foe === 'stunned' ? 'stunned' : frame.foeStrike ? 'hook' : frame.foe === 'windup' ? 'windup' : 'idle'
  const playerStickPose: PoseName = frame.playerHit
    ? 'hurt'
    : frame.tap
      ? frame.handTyped % 2 === 0
        ? 'jab'
        : 'cross'
    : frame.foe === 'hurt'
      ? 'hook'
      : frame.stage === 'parry'
        ? 'victory'
        : frame.stage === 'type' || frame.stage === 'feintWait'
          ? 'guard'
          : 'idle'
  const playerMood: Mood = frame.playerHit ? 'oops' : frame.damage ? 'hyped' : frame.stage === 'parry' ? 'happy' : 'idle'
  const foeClass = ['f-foe', `f-foe--${foe.id}`, `f-foe--${frame.foe}`, frame.foeStrike && 'f-foe--strike'].filter(Boolean).join(' ')
  const playerClass = ['f-player', frame.playerHit && 'f-player--hurt', frame.tap ? 'f-player--tap' : frame.foe === 'hurt' && 'f-player--attack f-player--hook']
    .filter(Boolean)
    .join(' ')

  return (
    <section className="briefing" aria-label={t.briefingTitle} style={{ '--hue': foe.hue } as React.CSSProperties}>
      <small className="briefing-kicker">{t.briefingTitle}</small>
      <h2>{text.name}</h2>
      <p className="f-taunt">« {text.taunt} »</p>

      <div className={stick ? 'f-arena f-arena--stick f-demo' : 'f-arena f-demo'}>
        <div className="f-bg" aria-hidden="true" />
        {stick && <div className="stick-floor" aria-hidden="true" />}
        <div className={playerClass} aria-hidden="true">
          {stick ? <StickFighter who="player" pose={playerStickPose} facing="right" look={look} /> : <Mascot mood={playerMood} />}
        </div>
        <div className={foeClass} aria-hidden="true">
          {stick ? <StickFighter who={foe.id} pose={foeStickPose} facing="left" /> : <FoeArt id={foe.id} mood={frame.foe === 'hurt' ? 'hurt' : frame.foe} />}
        </div>

        {frame.card && (
          <div className="f-demo-card">
            <AttackCard a={fake} locked={frame.stage === 'type'} t={t} />
          </div>
        )}

        {frame.stage === 'type' && (
          <div className="f-demo-keys" aria-hidden="true">
            {[...words.answer].map((ch, i) => (
              <kbd key={i} className={i < frame.typed ? 'on' : ''}>
                {ch}
              </kbd>
            ))}
          </div>
        )}

        {frame.stage === 'strike' && (
          <div className="f-demo-hand" aria-hidden="true">
            <div className="f-move f-move--hook">
              <small>
                {t.moves.hook} <b>9</b>
              </small>
              <span className="f-word">
                <span className="f-done">{hand.slice(0, frame.handTyped)}</span>
                {hand.slice(frame.handTyped)}
              </span>
            </div>
          </div>
        )}

        {frame.stage === 'parry' && <span key={`p${index}`} className="f-fx f-fx--parry f-fx--center">PARRY</span>}
        {frame.stage === 'feintOpen' && <span key={`f${index}`} className="f-fx f-fx--whiff f-fx--foe">FEINT</span>}
        {frame.damage && <span key={`d${index}`} className="f-fx f-fx--crit f-fx--foe">-{HAND_DAMAGE}</span>}
        {frame.stage === 'hit' && <span key={`h${index}`} className="f-fx f-fx--hurt f-fx--player">-10</span>}

        {scenes.length > 1 && <span className="f-demo-count">{t.demoLabel(index + 1, scenes.length)}</span>}
      </div>

      <p className="briefing-caption" aria-live="polite">
        {caption}
      </p>
      <p className="f-tip">{text.tip}</p>

      <button type="button" className="btn btn--primary btn--lg" onClick={onStart} autoFocus>
        {t.fightNow}
        <kbd aria-label="Entrée">
          <CornerDownLeft className="icon" aria-hidden="true" />
        </kbd>
      </button>
    </section>
  )
}

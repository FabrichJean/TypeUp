import { Flame, ShieldAlert } from 'lucide-react'
import { fadeHidden, type Attack } from '../../fight/engine'
import type { FightStrings } from '../../fight/strings'

/** Une attaque en préparation : mot (déguisé), compte à rebours et avancement. */
export function AttackCard({ a, locked, t }: { a: Attack; locked: boolean; t: FightStrings }) {
  const hidden = fadeHidden(a)
  const letters = [...a.shown]
  return (
    <div
      className={['f-attack', a.feint && 'f-attack--feint', a.heavy && 'f-attack--heavy', locked && 'f-attack--lock']
        .filter(Boolean)
        .join(' ')}
      data-trick={a.trick}
      data-feint={a.feint}
    >
      <div className="f-attack-head">
        {a.heavy ? <Flame className="icon" aria-hidden="true" /> : <ShieldAlert className="icon" aria-hidden="true" />}
        <span>{a.feint ? t.feintTag : a.heavy ? t.heavyTag : t.incoming}</span>
      </div>
      <div className="f-word" aria-label={a.shown}>
        {letters.map((ch, i) => (
          <span
            // Les lettres d'un mot ne changent jamais d'ordre : l'index est une clé stable.
            key={i}
            className={[
              a.trick === 'plain' && i < a.typed && 'f-done',
              a.trick === 'fading' && a.fadeRank[i] < hidden && 'f-gone',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {ch}
          </span>
        ))}
      </div>
      <div className="f-pips" aria-hidden="true">
        {Array.from({ length: a.answer.length }, (_, i) => (
          <span key={i} className={i < a.typed ? 'on' : ''} />
        ))}
      </div>
      <div className="f-timer" aria-hidden="true">
        <span style={{ width: `${Math.max(0, 1 - a.elapsed / a.windup) * 100}%` }} />
      </div>
    </div>
  )
}

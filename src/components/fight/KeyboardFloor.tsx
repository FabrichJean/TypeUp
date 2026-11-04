import { memo } from 'react'
import type { Lang } from '../../content/packs'

const ROWS: Record<Lang, readonly string[]> = {
  fr: ['azertyuiop', 'qsdfghjklm', 'wxcvbn'],
  en: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
}

export interface LastKey {
  /** Lettre (déjà ramenée en minuscule, sans accent). */
  key: string
  /** Compteur de frappes : change à chaque frappe pour relancer l'animation. */
  n: number
  ok: boolean
}

/** Le sol de l'arène est un clavier géant : chaque touche tapée s'illumine. */
export const KeyboardFloor = memo(function KeyboardFloor({ lang, last }: { lang: Lang; last: LastKey | null }) {
  return (
    <div className="kb-floor" aria-hidden="true">
      {ROWS[lang].map((row, i) => (
        <div key={row} className="kb-row" style={{ marginLeft: `${i * 14}px` }}>
          {[...row].map((letter) => {
            const hit = last?.key === letter
            return (
              <span
                // Un changement de clé relance l'animation de la touche frappée.
                key={hit ? `${letter}-${last.n}` : letter}
                className={hit ? (last.ok ? 'kb-key kb-key--ok' : 'kb-key kb-key--bad') : 'kb-key'}
              >
                {letter}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
})

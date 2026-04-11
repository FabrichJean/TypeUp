export type Mood = 'idle' | 'happy' | 'hyped' | 'oops'

/** Petite touche de clavier vivante : réagit aux séries et aux erreurs. */
export function Mascot({ mood }: { mood: Mood }) {
  return (
    <svg className={`mascot mascot--${mood}`} viewBox="0 0 80 80" aria-hidden="true">
      <rect className="mascot-base" x="6" y="14" width="68" height="60" rx="15" />
      <rect className="mascot-top" x="10" y="8" width="60" height="52" rx="13" />
      {mood === 'idle' && (
        <g className="mascot-face">
          <circle cx="30" cy="32" r="4" />
          <circle cx="50" cy="32" r="4" />
          <path d="M32 44 h16" className="stroke" />
        </g>
      )}
      {mood === 'happy' && (
        <g className="mascot-face">
          <path d="M25 34 q5 -8 10 0" className="stroke" />
          <path d="M45 34 q5 -8 10 0" className="stroke" />
          <path d="M30 43 q10 11 20 0" className="stroke" />
        </g>
      )}
      {mood === 'hyped' && (
        <g className="mascot-face">
          <circle cx="30" cy="31" r="6" />
          <circle cx="50" cy="31" r="6" />
          <circle cx="32" cy="29" r="2" className="shine" />
          <circle cx="52" cy="29" r="2" className="shine" />
          <ellipse cx="40" cy="47" rx="8" ry="6" />
        </g>
      )}
      {mood === 'oops' && (
        <g className="mascot-face">
          <path d="M25 28 l10 10 M35 28 l-10 10" className="stroke" />
          <path d="M45 28 l10 10 M55 28 l-10 10" className="stroke" />
          <path d="M30 48 q5 -6 10 0 q5 6 10 0" className="stroke" />
        </g>
      )}
    </svg>
  )
}

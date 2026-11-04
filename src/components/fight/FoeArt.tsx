import { FOES, type FoeId } from '../../fight/foes'

export type FoeMood = 'idle' | 'windup' | 'hurt' | 'stunned' | 'ko'

interface FaceProps {
  cx: number
  cy: number
  mood: FoeMood
  /** Échelle du visage. */
  k?: number
}

/** Visage commun : l'expression suit l'humeur du combattant. */
function Face({ cx, cy, mood, k = 1 }: FaceProps) {
  const dx = 13 * k
  const r = 5.5 * k
  const stroke = { strokeWidth: 3 * k, strokeLinecap: 'round' as const, fill: 'none' }
  if (mood === 'ko') {
    return (
      <g className="foe-face">
        <path d={`M${cx - dx - 5 * k} ${cy - 5 * k}l${10 * k} ${10 * k}m0 ${-10 * k}l${-10 * k} ${10 * k}`} className="foe-stroke" {...stroke} />
        <path d={`M${cx + dx - 5 * k} ${cy - 5 * k}l${10 * k} ${10 * k}m0 ${-10 * k}l${-10 * k} ${10 * k}`} className="foe-stroke" {...stroke} />
        <path d={`M${cx - 8 * k} ${cy + 14 * k}h${16 * k}`} className="foe-stroke" {...stroke} />
      </g>
    )
  }
  if (mood === 'hurt') {
    return (
      <g className="foe-face">
        <path d={`M${cx - dx - 6 * k} ${cy - 6 * k}l${11 * k} ${6 * k}l${-11 * k} ${6 * k}`} className="foe-stroke" {...stroke} />
        <path d={`M${cx + dx + 6 * k} ${cy - 6 * k}l${-11 * k} ${6 * k}l${11 * k} ${6 * k}`} className="foe-stroke" {...stroke} />
        <ellipse cx={cx} cy={cy + 15 * k} rx={5 * k} ry={6 * k} className="foe-mouth" />
      </g>
    )
  }
  if (mood === 'stunned') {
    return (
      <g className="foe-face">
        {[-dx, dx].map((o) => (
          <g key={o}>
            <circle cx={cx + o} cy={cy} r={r + 2 * k} className="foe-stroke" {...stroke} />
            <circle cx={cx + o} cy={cy} r={r - 3 * k} className="foe-eye" />
          </g>
        ))}
        <path d={`M${cx - 10 * k} ${cy + 15 * k}q${5 * k} ${-6 * k} ${10 * k} 0q${5 * k} ${6 * k} ${10 * k} 0`} className="foe-stroke" {...stroke} />
      </g>
    )
  }
  const angry = mood === 'windup'
  return (
    <g className="foe-face">
      <circle cx={cx - dx} cy={cy} r={r} className={angry ? 'foe-eye foe-eye--hot' : 'foe-eye'} />
      <circle cx={cx + dx} cy={cy} r={r} className={angry ? 'foe-eye foe-eye--hot' : 'foe-eye'} />
      {angry ? (
        <>
          <path d={`M${cx - dx - 9 * k} ${cy - 11 * k}l${18 * k} ${7 * k}`} className="foe-stroke" {...stroke} />
          <path d={`M${cx + dx + 9 * k} ${cy - 11 * k}l${-18 * k} ${7 * k}`} className="foe-stroke" {...stroke} />
          <path d={`M${cx - 11 * k} ${cy + 17 * k}l${5 * k} ${-7 * k}l${6 * k} ${7 * k}l${6 * k} ${-7 * k}l${5 * k} ${7 * k}`} className="foe-stroke" {...stroke} />
        </>
      ) : (
        <path d={`M${cx - 9 * k} ${cy + 14 * k}h${18 * k}`} className="foe-stroke" {...stroke} />
      )}
    </g>
  )
}

interface CapProps {
  x: number
  y?: number
  w: number
  h: number
  legend?: string
  mood: FoeMood
  k?: number
}

/** Une touche de clavier : socle, dessus, légende et visage. */
function Cap({ x, y = 0, w, h, legend, mood, k = 1 }: CapProps) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect className="foe-base" x="0" y="14" width={w} height={h - 14} rx="18" />
      <rect className="foe-top" x="5" y="2" width={w - 10} height={h - 26} rx="16" />
      {legend && (
        <text className="foe-legend" x="16" y="24" fontSize="13">
          {legend}
        </text>
      )}
      <Face cx={w / 2} cy={(h - 26) / 2 + 12} mood={mood} k={k} />
    </g>
  )
}

/** Dessin d'un adversaire : une touche de clavier avec sa personnalité. */
export function FoeArt({ id, mood }: { id: FoeId; mood: FoeMood }) {
  const hue = FOES.find((f) => f.id === id)?.hue ?? 0
  const style = { '--hue': hue } as React.CSSProperties
  const hot = mood === 'windup' || mood === 'hurt'

  if (id === 'space') {
    return (
      <svg className={`foe-art foe-art--${id}`} style={style} viewBox="0 0 230 100" aria-hidden="true">
        <Cap x={0} w={230} h={100} mood={mood} />
        <path d="M70 80q45 12 90 0" className="foe-stroke" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    )
  }
  if (id === 'ctrl') {
    return (
      <svg className={`foe-art foe-art--${id}`} style={style} viewBox="0 0 330 140" aria-hidden="true">
        <Cap x={0} y={14} w={100} h={110} legend="Ctrl" mood={mood} k={0.8} />
        <Cap x={230} y={14} w={100} h={110} legend="Del" mood={mood} k={0.8} />
        <Cap x={85} y={0} w={160} h={140} legend="Alt" mood={mood} k={1.15} />
      </svg>
    )
  }
  const legends: Partial<Record<FoeId, string>> = { esc: 'esc' }
  return (
    <svg className={`foe-art foe-art--${id}`} style={style} viewBox="0 0 150 140" aria-hidden="true">
      <Cap x={0} w={150} h={140} legend={legends[id]} mood={mood} />
      {id === 'shift' && <path d="M24 30l9-10l9 10h-5v9h-8v-9z" className="foe-legend-fill" />}
      {id === 'caps' && (
        <>
          <text className="foe-legend" x="16" y="30" fontSize="18" fontWeight="800">
            A
          </text>
          <circle cx="126" cy="26" r="7" className={hot ? 'foe-led foe-led--on' : 'foe-led'} />
        </>
      )}
      {id === 'back' && (
        <>
          <path d="M44 28h-22m0 0l8-8m-8 8l8 8" className="foe-legend-stroke" />
          <rect x="94" y="14" width="40" height="14" rx="7" className="foe-eraser" />
        </>
      )}
    </svg>
  )
}

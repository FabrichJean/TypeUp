import { FOES, type FoeId } from '../../fight/foes'
import { POSES, POSE_SECONDS, SHIN, THIGH, type Joint, type PoseName, type Streak } from '../../fight/poses'
import { DEFAULT_LOOK, type Look } from '../../shop/catalog'
import { Hat } from './Hats'

export type Who = 'player' | FoeId

interface Props {
  who: Who
  pose: PoseName
  /** Côté vers lequel le combattant regarde. */
  facing: 'left' | 'right'
  /** Tenue du joueur (ignorée pour les adversaires). */
  look?: Look
  /** Teinte imposée à un adversaire (en survie, elle change à chaque tour). */
  hue?: number
}

// Géométrie du squelette (repère de la figure : bassin en (0,0), vers la droite = devant).
const TORSO = 56
const HEAD_R = 18
const SHOULDER = -48
const UPPER_ARM = 36
const FOREARM = 34
/** Hauteur du bassin dans le dessin, et du sol. */
const HIP = { x: 110, y: 166 }
const GROUND = 262

const rot = (deg: number): React.CSSProperties => ({ transform: `rotate(${deg}deg)` })

/** Un segment de membre : effilé, avec le bout arrondi (le « muscle » du stickman). */
function Seg({ len, w0, w1 }: { len: number; w0: number; w1: number }) {
  const r0 = w0 / 2
  const r1 = w1 / 2
  return <path className="stick-seg" d={`M${-r0} 0L${-r1} ${len}A${r1} ${r1} 0 0 0 ${r1} ${len}L${r0} 0A${r0} ${r0} 0 0 0 ${-r0} 0Z`} />
}

/** Traînée de vitesse derrière un membre qui frappe, dans le repère du segment. */
function Trail({ kind, len }: { kind: Streak['kind']; len: number }) {
  if (kind === 'slash') return <path className="stick-slash" d={`M-7 2Q-44 ${len * 0.45} -9 ${len + 6}Q-24 ${len * 0.5} -7 2Z`} />
  return (
    <g className="stick-lines">
      <line x1="-13" y1={len - 6} x2="-13" y2={len - 52} />
      <line x1="13" y1={len - 2} x2="13" y2={len - 44} />
      <line x1="0" y1={len + 12} x2="0" y2={len - 30} />
    </g>
  )
}

function Arm({ joint, dark, streak }: { joint: Joint; dark?: boolean; streak?: Streak['kind'] }) {
  return (
    <g className={dark ? 'stick-limb stick-limb--back' : 'stick-limb'} transform={`translate(0 ${SHOULDER})`}>
      <g className="stick-joint" style={rot(joint[0])}>
        <Seg len={UPPER_ARM} w0={16} w1={13} />
        <g transform={`translate(0 ${UPPER_ARM})`}>
          <g className="stick-joint" style={rot(joint[1])}>
            <Seg len={FOREARM} w0={13} w1={11} />
            {streak && <Trail kind={streak} len={FOREARM} />}
            <circle className="stick-fist" cx="0" cy={FOREARM + 3} r="10.5" />
          </g>
        </g>
      </g>
    </g>
  )
}

function Leg({ joint, dark, streak }: { joint: Joint; dark?: boolean; streak?: Streak['kind'] }) {
  return (
    <g className={dark ? 'stick-limb stick-limb--back' : 'stick-limb'}>
      <g className="stick-joint" style={rot(joint[0])}>
        <Seg len={THIGH} w0={20} w1={15} />
        <g transform={`translate(0 ${THIGH})`}>
          <g className="stick-joint" style={rot(joint[1])}>
            <Seg len={SHIN} w0={15} w1={12} />
            {streak && <Trail kind={streak} len={SHIN} />}
            <rect className="stick-shoe" x="-5" y={SHIN - 3} width="26" height="12" rx="6" />
          </g>
        </g>
      </g>
    </g>
  )
}

/** Accessoires qui distinguent chaque combattant. Pas de texte : la figure est inversée pour regarder à gauche. */
function Head({ who, pose, look }: { who: Who; pose: PoseName; look: Look }) {
  const dead = pose === 'ko' || pose === 'stunned'
  const hurt = pose === 'hurt'
  return (
    <g className="stick-head" transform={`translate(0 ${-TORSO - HEAD_R + 2})`}>
      <g className="stick-joint" style={rot(POSES[pose].head)}>
        <circle className="stick-skull" r={HEAD_R} />
        {/* œil : rond, croix quand il est touché ou K.O. */}
        {dead || hurt ? (
          <path className="stick-eye-x" d="M5 -8l8 8m0 -8l-8 8" />
        ) : (
          <circle className="stick-eye" cx="9" cy="-3" r="3" />
        )}
        {who === 'player' && <Hat hat={look.hat} />}
        {who === 'space' && <rect className="stick-gear" x="-26" y={-HEAD_R - 6} width="52" height="9" rx="4" />}
        {who === 'caps' && (
          <>
            <path className="stick-band stick-band--red" d={`M-${HEAD_R} -6h${HEAD_R * 2}`} />
            <circle className="stick-led" cx="0" cy="-6" r="4" />
          </>
        )}
        {who === 'esc' && <path className="stick-hood" d={`M-${HEAD_R + 3} 6q0 -${HEAD_R + 14} ${HEAD_R + 3} -${HEAD_R + 14}q${HEAD_R + 3} 0 ${HEAD_R + 3} ${HEAD_R + 14}q-${HEAD_R / 2} -6 -${HEAD_R + 3} -6q-${HEAD_R + 3} 0 -${HEAD_R + 3} 6z`} />}
        {who === 'ctrl' && (
          <>
            <rect className="stick-gear" x="-26" y={-HEAD_R - 14} width="16" height="12" rx="3" />
            <rect className="stick-gear" x="-8" y={-HEAD_R - 18} width="16" height="16" rx="3" />
            <rect className="stick-gear" x="10" y={-HEAD_R - 14} width="16" height="12" rx="3" />
          </>
        )}
      </g>
    </g>
  )
}

function Badge({ who }: { who: Who }) {
  if (who === 'shift') return <path className="stick-gear" transform="translate(-2 -26)" d="M0 -12l12 13h-7v10h-10v-10h-7z" />
  if (who === 'back') {
    return (
      <>
        <path className="stick-badge" transform="translate(-2 -26)" d="M10 0h-22m0 0l8 -8m-8 8l8 8" />
        <rect className="stick-eraser" x="-8" y="-52" width="22" height="10" rx="5" />
      </>
    )
  }
  if (who === 'caps') return <rect className="stick-gear" x="-9" y="-36" width="18" height="18" rx="4" />
  if (who === 'space') return <rect className="stick-gear" x="-14" y="-6" width="28" height="9" rx="4" />
  if (who === 'ctrl') return <rect className="stick-gear" x="-16" y="-8" width="32" height="10" rx="4" />
  return null
}

/** Combattant en stickman : un squelette dont chaque articulation suit la pose. */
export function StickFighter({ who, pose, facing, look = DEFAULT_LOOK, hue: foeHue }: Props) {
  const p = POSES[pose]
  const hue = who === 'player' ? look.hue : (foeHue ?? FOES.find((f) => f.id === who)?.hue ?? 0)
  const style = {
    '--hue': hue,
    '--sat': who === 'player' ? look.sat : 1,
    '--dur': `${POSE_SECONDS[pose]}s`,
  } as React.CSSProperties

  const className = [
    'stick',
    `stick--${who}`,
    `stick--${facing}`,
    `stick--pose-${pose}`,
    who === 'ctrl' && 'stick--boss',
    who === 'player' && look.prism && 'stick--prism',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <svg className={className} style={style} viewBox="0 52 220 224" aria-hidden="true">
      <ellipse className="stick-shadow" cx={HIP.x} cy={GROUND + 2} rx={pose === 'ko' ? 78 : 44} ry="9" />
      {/* Tout le corps pivote autour des pieds pour tomber. */}
      <g transform={`translate(${HIP.x} ${GROUND})`}>
        <g className="stick-joint stick-joint--slow" style={rot(p.lie)}>
          <g transform={`translate(0 ${-(GROUND - HIP.y) + 0})`}>
            <g className="stick-body" style={{ transform: `translate(${p.x}px, ${p.drop}px) rotate(${p.spin}deg)` }}>
              <Leg joint={p.backLeg} dark streak={p.streak?.limb === 'backLeg' ? p.streak.kind : undefined} />
              <Arm joint={p.backArm} dark streak={p.streak?.limb === 'backArm' ? p.streak.kind : undefined} />
              <g className="stick-joint" style={rot(p.torso)}>
                <path className="stick-torso" d="M-10 3L-16 -45Q-16 -61 0 -61Q16 -61 16 -45L10 3Z" />
                <Badge who={who} />
                <Head who={who} pose={pose} look={look} />
                <Arm joint={p.frontArm} streak={p.streak?.limb === 'frontArm' ? p.streak.kind : undefined} />
              </g>
              <Leg joint={p.frontLeg} streak={p.streak?.limb === 'frontLeg' ? p.streak.kind : undefined} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  )
}

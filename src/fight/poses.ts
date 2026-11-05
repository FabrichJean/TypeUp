/**
 * Poses des stickmen : angles des articulations (en degrés).
 *
 * Convention (la figure regarde vers la droite) : un membre à 0° pend vers le bas ;
 * un angle négatif le fait avancer (-90° = horizontal vers l'avant, ±180° = vers le haut) ;
 * un angle positif le fait reculer. Un angle de coude/genou est relatif au segment parent.
 * Un torse positif se penche en avant.
 *
 * Le bassin s'abaisse tout seul pour que le pied le plus bas touche le sol (sauf en l'air : `lift`).
 */
import { foeAt, type FoeId } from './foes'
import type { FightState, MoveKind } from './engine'

export type Joint = readonly [upper: number, lower: number]
export type LimbName = 'backArm' | 'frontArm' | 'backLeg' | 'frontLeg'

/** Traînée de vitesse derrière un membre qui frappe : traits parallèles ou croissant (geste circulaire). */
export interface Streak {
  limb: LimbName
  kind: 'lines' | 'slash'
}

export interface Pose {
  /** Décalage horizontal du corps (px, vers l'avant) : pas, fente, recul. */
  x: number
  /** Abaissement du bassin (px, vers le bas) ; négatif = en l'air. */
  drop: number
  /** Rotation de tout le corps autour des pieds (sert à tomber). */
  lie: number
  /** Rotation de tout le corps autour du bassin (coup sauté, projection en arrière). */
  spin: number
  torso: number
  head: number
  backArm: Joint
  frontArm: Joint
  backLeg: Joint
  frontLeg: Joint
  streak?: Streak
}

export const POSE_NAMES = [
  'idle',
  'idle2',
  'windup',
  'windupKick',
  'jab',
  'cross',
  'hook',
  'uppercut',
  'frontKick',
  'roundKick',
  'flyKick',
  'guard',
  'hurt',
  'gut',
  'knockback',
  'flinch',
  'stunned',
  'ko',
  'victory',
  'victory2',
  'charge',
] as const
export type PoseName = (typeof POSE_NAMES)[number]

// --- Géométrie du squelette (partagée avec le dessin) ---------------------------
export const THIGH = 48
export const SHIN = 48
const LEG_REACH = THIGH + SHIN

const rad = (deg: number): number => (deg * Math.PI) / 180

/** Distance verticale entre le bassin et le pied d'une jambe (px). */
export function footDepth(leg: Joint): number {
  return THIGH * Math.cos(rad(leg[0])) + SHIN * Math.cos(rad(leg[0] + leg[1]))
}

/** Abaissement qui pose le pied le plus bas au sol. */
export function groundDrop(backLeg: Joint, frontLeg: Joint): number {
  return Math.max(0, LEG_REACH - Math.max(footDepth(backLeg), footDepth(frontLeg)))
}

interface Draft {
  x?: number
  /** Hauteur de saut (px) : la figure quitte le sol. */
  lift?: number
  lie?: number
  spin?: number
  torso: number
  head: number
  backArm: Joint
  frontArm: Joint
  backLeg: Joint
  frontLeg: Joint
  streak?: Streak
}

function make(d: Draft): Pose {
  const { lift = 0, x = 0, lie = 0, spin = 0, ...rest } = d
  return { ...rest, x, lie, spin, drop: groundDrop(d.backLeg, d.frontLeg) - lift }
}

export const POSES: Record<PoseName, Pose> = {
  // Garde de combat : jambes écartées et fléchies, poings devant le visage.
  idle: make({
    torso: 10,
    head: 0,
    backArm: [-25, -122],
    frontArm: [-58, -102],
    backLeg: [28, -28],
    frontLeg: [-34, 38],
  }),
  // Appui changé : le poids passe sur l'autre jambe, les poings ballottent (jeu de jambes).
  idle2: make({
    x: 4,
    torso: 14,
    head: 2,
    backArm: [-32, -112],
    frontArm: [-50, -112],
    backLeg: [36, -36],
    frontLeg: [-26, 30],
  }),
  // Prépare un coup de poing : accroupi, poing armé près des côtes.
  windup: make({
    x: -6,
    torso: 24,
    head: 6,
    backArm: [-45, -105],
    frontArm: [58, -135],
    backLeg: [44, -48],
    frontLeg: [-46, 52],
  }),
  // Prépare un coup de pied : genou levé, jambe repliée, bras en balancier.
  windupKick: make({
    x: -4,
    torso: -8,
    head: 2,
    backArm: [-36, -118],
    frontArm: [30, -70],
    backLeg: [6, -4],
    frontLeg: [-98, 106],
  }),
  // Direct du bras avant : fente, épaule engagée.
  jab: make({
    x: 12,
    torso: 18,
    head: -2,
    backArm: [-28, -125],
    frontArm: [-94, -4],
    backLeg: [40, -42],
    frontLeg: [-42, 48],
    streak: { limb: 'frontArm', kind: 'lines' },
  }),
  // Direct du bras arrière : le bassin pivote, le poing part de la hanche.
  cross: make({
    x: 10,
    torso: 28,
    head: -3,
    backArm: [-96, -4],
    frontArm: [-60, -118],
    backLeg: [20, -18],
    frontLeg: [-36, 40],
    streak: { limb: 'backArm', kind: 'lines' },
  }),
  // Crochet : le coude balaie, tout le torse tourne et se penche.
  hook: make({
    x: 12,
    torso: 38,
    head: -6,
    backArm: [-22, -128],
    frontArm: [-112, -34],
    backLeg: [44, -40],
    frontLeg: [-38, 44],
    streak: { limb: 'frontArm', kind: 'slash' },
  }),
  // Uppercut : on se redresse en fauchant le poing vers le haut.
  uppercut: make({
    x: 8,
    torso: 6,
    head: -10,
    backArm: [-22, -128],
    frontArm: [-62, -118],
    backLeg: [34, -34],
    frontLeg: [-30, 36],
    streak: { limb: 'frontArm', kind: 'slash' },
  }),
  // Coup de pied de face (« push kick ») : jambe tendue à l'horizontale, buste en arrière.
  frontKick: make({
    x: 6,
    torso: -16,
    head: -2,
    backArm: [44, -36],
    frontArm: [-70, -105],
    backLeg: [8, -4],
    frontLeg: [-94, -2],
    streak: { limb: 'frontLeg', kind: 'lines' },
  }),
  // Coup de pied circulaire haut : la jambe balaie jusqu'à la tête, buste très penché en arrière.
  roundKick: make({
    x: 8,
    torso: -36,
    head: -8,
    backArm: [66, -24],
    frontArm: [-96, -108],
    backLeg: [4, -6],
    frontLeg: [-134, -12],
    streak: { limb: 'frontLeg', kind: 'slash' },
  }),
  // Coup de pied sauté : tout le corps décolle, jambe tendue, l'autre repliée.
  flyKick: make({
    x: 30,
    lift: 38,
    spin: -14,
    torso: -20,
    head: -6,
    backArm: [74, -30],
    frontArm: [-40, -64],
    backLeg: [-34, 78],
    frontLeg: [-98, -4],
    streak: { limb: 'frontLeg', kind: 'slash' },
  }),
  // Parade : les deux avant-bras dressés devant le visage, buste en retrait, jambes ancrées.
  guard: make({
    x: -8,
    torso: -4,
    head: 6,
    backArm: [-44, -130],
    frontArm: [-62, -122],
    backLeg: [38, -40],
    frontLeg: [-36, 42],
  }),
  // Touché au visage : tête renvoyée en arrière, bras projetés, jambes qui cèdent.
  hurt: make({
    x: -14,
    torso: -28,
    head: -26,
    backArm: [68, 32],
    frontArm: [38, 20],
    backLeg: [30, -8],
    frontLeg: [-10, 16],
  }),
  // Touché au ventre : plié en deux, les bras serrent le ventre.
  gut: make({
    x: -8,
    torso: 46,
    head: 34,
    backArm: [-16, -92],
    frontArm: [-28, -84],
    backLeg: [22, -30],
    frontLeg: [-30, 62],
  }),
  // Projeté en arrière par un gros coup : décolle, membres en croix.
  knockback: make({
    x: -34,
    lift: 14,
    spin: -18,
    torso: -34,
    head: -30,
    backArm: [86, 24],
    frontArm: [64, 10],
    backLeg: [14, 46],
    frontLeg: [-18, 52],
  }),
  // Secousse légère : encaisse une simple lettre sans reculer.
  flinch: make({
    x: -3,
    torso: -6,
    head: -12,
    backArm: [-30, -112],
    frontArm: [-48, -100],
    backLeg: [26, -22],
    frontLeg: [-30, 28],
  }),
  // Étourdi : vacille, avachi, bras ballants.
  stunned: make({
    torso: 20,
    head: 26,
    backArm: [-8, 12],
    frontArm: [8, 10],
    backLeg: [14, -8],
    frontLeg: [-14, 12],
  }),
  // K.O. : tombe à la renverse, membres mous.
  ko: make({
    x: -16,
    lie: -88,
    torso: -4,
    head: 14,
    backArm: [34, 14],
    frontArm: [-24, 24],
    backLeg: [14, 6],
    frontLeg: [-10, 18],
  }),
  // Victoire : les deux bras en V.
  victory: make({
    torso: -4,
    head: -8,
    backArm: [152, -12],
    frontArm: [-152, 12],
    backLeg: [26, -6],
    frontLeg: [-26, 6],
  }),
  // Victoire, deuxième temps : le poing serré en l'air, l'autre sur la hanche.
  victory2: make({
    torso: -8,
    head: -12,
    backArm: [20, -110],
    frontArm: [-160, -24],
    backLeg: [18, -14],
    frontLeg: [-22, 20],
  }),
  // Coup spécial : posture du cavalier, jambes très écartées, les deux mains rassemblent l'énergie.
  charge: make({
    torso: 4,
    head: -2,
    backArm: [-100, -24],
    frontArm: [-92, -38],
    backLeg: [58, -58],
    frontLeg: [-58, 58],
  }),
}

/** Durée de la transition vers chaque pose (s) : les coups partent vite, le repos reprend doucement. */
export const POSE_SECONDS: Record<PoseName, number> = {
  idle: 0.24,
  idle2: 0.24,
  windup: 0.18,
  windupKick: 0.14,
  jab: 0.06,
  cross: 0.06,
  hook: 0.07,
  uppercut: 0.07,
  frontKick: 0.08,
  roundKick: 0.09,
  flyKick: 0.1,
  guard: 0.07,
  hurt: 0.06,
  gut: 0.07,
  knockback: 0.08,
  flinch: 0.05,
  stunned: 0.2,
  ko: 0.55,
  victory: 0.25,
  victory2: 0.25,
  charge: 0.2,
}

// --- Choix de la pose selon l'état du combat ---------------------------------

const within = (now: number, stamp: number | null, ms: number): boolean => stamp !== null && now - stamp < ms

/** Durées pendant lesquelles une action reste affichée (ms). */
export const POSE_MS = { move: 320, tap: 170, hit: 320, parry: 420, foeHurt: 300, foeFlinch: 130, foeStrike: 340 } as const
/** Un coup de pied atteint son extension, puis la jambe revient (genou levé) avant de se reposer. */
export const KICK_PEAK_MS = 170
/** Cadence du jeu de jambes au repos (ms). */
export const STEP_MS = 480

/** Le geste d'un coup final, qui varie avec la série pour ne jamais être monotone. */
export function movePose(kind: MoveKind, chain: number): PoseName {
  if (kind === 'jab') return chain % 2 === 1 ? 'jab' : 'cross'
  if (kind === 'hook') return chain % 2 === 1 ? 'hook' : 'uppercut'
  if (chain >= 6) return 'flyKick'
  return chain % 2 === 1 ? 'roundKick' : 'frontKick'
}

const KICKS: ReadonlySet<PoseName> = new Set<PoseName>(['frontKick', 'roundKick', 'flyKick'])
const restPose = (time: number): PoseName => (Math.floor(time / STEP_MS) % 2 === 0 ? 'idle' : 'idle2')

export function playerPose(s: FightState): PoseName {
  if (s.phase === 'defeat') return 'ko'
  if (s.phase === 'victory') return Math.floor(s.time / 520) % 2 === 0 ? 'victory' : 'victory2'
  if (s.phase === 'super') return 'charge'
  if (within(s.time, s.lastPlayerHitAt, POSE_MS.hit)) return Math.floor((s.lastPlayerHitAt ?? 0) / 100) % 2 === 0 ? 'hurt' : 'gut'
  if (within(s.time, s.lastParryAt, POSE_MS.parry)) return 'guard'
  const finisher = within(s.time, s.lastMoveAt, POSE_MS.move) && s.lastMoveKind !== null
  const tap = within(s.time, s.lastTapAt, POSE_MS.tap)
  // Le coup final prime, sauf si une lettre est tapée après lui (le mot suivant a déjà commencé).
  if (finisher && s.lastMoveKind && (!tap || (s.lastMoveAt ?? 0) >= (s.lastTapAt ?? 0))) {
    const pose = movePose(s.lastMoveKind, s.lastMoveChain)
    // Après le pic d'un coup de pied, la jambe se replie avant de redescendre.
    return KICKS.has(pose) && s.time - (s.lastMoveAt ?? 0) >= KICK_PEAK_MS ? 'windupKick' : pose
  }
  if (tap) return s.tapSide === 0 ? 'jab' : 'cross'
  if (s.stunMs > 0) return 'stunned'
  return restPose(s.time)
}

/** Le coup qu'envoie chaque adversaire (selon son caractère) et s'il arme un coup de pied. */
export const FOE_STRIKE: Record<FoeId, PoseName> = {
  space: 'frontKick',
  shift: 'hook',
  caps: 'cross',
  esc: 'roundKick',
  back: 'uppercut',
  ctrl: 'flyKick',
}
const KICKER: ReadonlySet<FoeId> = new Set<FoeId>(['space', 'esc', 'ctrl'])

/** Réaction d'un adversaire à un gros coup, selon le coup reçu. */
function foeHurtPose(s: FightState): PoseName {
  if (s.lastFoeHitAt !== s.lastMoveAt || s.lastMoveKind === null) return 'hurt'
  if (s.lastMoveKind === 'smash') return 'knockback'
  return s.lastMoveKind === 'hook' ? 'gut' : 'hurt'
}

export function foePose(s: FightState): PoseName {
  if (s.foeHp <= 0) return 'ko'
  if (within(s.time, s.lastFoeHitAt, s.lastFoeHitHeavy ? POSE_MS.foeHurt : POSE_MS.foeFlinch)) {
    return s.lastFoeHitHeavy ? foeHurtPose(s) : 'flinch'
  }
  if (s.foeStunMs > 0 || s.phase === 'super') return 'stunned'
  const foe = foeAt(s.round, s.endless).id
  if (within(s.time, s.lastPlayerHitAt, POSE_MS.foeStrike)) return FOE_STRIKE[foe]
  if (s.attacks.length > 0) return KICKER.has(foe) ? 'windupKick' : 'windup'
  return restPose(s.time)
}

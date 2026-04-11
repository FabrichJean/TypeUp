/**
 * Moteur de frappe : fonctions pures, sans DOM ni horloge.
 * Le temps est toujours passé en paramètre (`now`, en ms).
 */

/** Nombre max de caractères acceptés d'un coup (bloque le copier-coller). */
export const MAX_BURST = 4

export interface TypingState {
  readonly target: string
  readonly typed: string
  /** Si faux, « e » est accepté à la place de « é ». */
  readonly strictAccents: boolean
  readonly startedAt: number | null
  readonly finishedAt: number | null
  readonly totalKeystrokes: number
  readonly correctKeystrokes: number
  readonly combo: number
  readonly maxCombo: number
  readonly lastErrorAt: number | null
  /** Caractère attendu -> nombre de fois où il a été raté. */
  readonly mistakes: Readonly<Record<string, number>>
}

export interface Metrics {
  elapsedMs: number
  /** Mots/minute nets (seulement les caractères justes à l'écran). */
  wpm: number
  /** Mots/minute bruts (tout ce qui a été tapé). */
  rawWpm: number
  /** Part de frappes justes, corrigées ou non (0..1). */
  accuracy: number
  correctChars: number
  /** Avancement dans le texte (0..1). */
  progress: number
}

export function createState(target: string, strictAccents = false): TypingState {
  return {
    target,
    typed: '',
    strictAccents,
    startedAt: null,
    finishedAt: null,
    totalKeystrokes: 0,
    correctKeystrokes: 0,
    combo: 0,
    maxCombo: 0,
    lastErrorAt: null,
    mistakes: {},
  }
}

/** Retire les diacritiques : « é » -> « e ». */
export function fold(ch: string): string {
  return ch.normalize('NFD').replace(/\p{M}/gu, '')
}

export function isMatch(expected: string, typed: string, strictAccents: boolean): boolean {
  if (expected === typed) return true
  return !strictAccents && fold(expected) === fold(typed)
}

function pressChar(state: TypingState, ch: string, index: number, now: number): TypingState {
  const expected = state.target[index]
  const ok = isMatch(expected, ch, state.strictAccents)
  if (ok) {
    const combo = state.combo + 1
    return {
      ...state,
      totalKeystrokes: state.totalKeystrokes + 1,
      correctKeystrokes: state.correctKeystrokes + 1,
      combo,
      maxCombo: Math.max(state.maxCombo, combo),
    }
  }
  const key = expected.toLowerCase()
  return {
    ...state,
    totalKeystrokes: state.totalKeystrokes + 1,
    combo: 0,
    lastErrorAt: now,
    mistakes: { ...state.mistakes, [key]: (state.mistakes[key] ?? 0) + 1 },
  }
}

/**
 * Applique la nouvelle valeur du champ de saisie.
 * - ajout de caractères : chaque caractère est une frappe ;
 * - suppression : simple retour en arrière (gratuit) ;
 * - tout le reste (collage massif, édition au milieu) est ignoré.
 */
export function applyInput(state: TypingState, next: string, now: number): TypingState {
  if (state.finishedAt !== null) return state
  const { typed, target } = state
  if (next === typed) return state

  if (next.length < typed.length) {
    return typed.startsWith(next) ? { ...state, typed: next } : state
  }
  if (!next.startsWith(typed) || next.length - typed.length > MAX_BURST) return state

  const capped = next.slice(0, target.length)
  let s: TypingState = state.startedAt === null ? { ...state, startedAt: now } : state
  for (let i = typed.length; i < capped.length; i++) {
    s = pressChar(s, capped[i], i, now)
  }
  s = { ...s, typed: capped }
  return capped.length === target.length ? { ...s, finishedAt: now } : s
}

/** Termine le test (fin du chrono). Sans effet s'il n'a pas démarré. */
export function finish(state: TypingState, now: number): TypingState {
  if (state.finishedAt !== null || state.startedAt === null) return state
  return { ...state, finishedAt: Math.max(now, state.startedAt) }
}

export function countCorrectChars(state: TypingState): number {
  let n = 0
  for (let i = 0; i < state.typed.length; i++) {
    if (isMatch(state.target[i], state.typed[i], state.strictAccents)) n++
  }
  return n
}

export function getMetrics(state: TypingState, now: number): Metrics {
  const correctChars = countCorrectChars(state)
  const progress = state.target.length === 0 ? 0 : state.typed.length / state.target.length
  const accuracy =
    state.totalKeystrokes === 0 ? 1 : state.correctKeystrokes / state.totalKeystrokes
  if (state.startedAt === null) {
    return { elapsedMs: 0, wpm: 0, rawWpm: 0, accuracy, correctChars, progress }
  }
  const elapsedMs = Math.max(0, (state.finishedAt ?? now) - state.startedAt)
  // Plancher d'une seconde : évite des WPM absurdes juste après la 1re frappe.
  const minutes = Math.max(elapsedMs, 1000) / 60000
  return {
    elapsedMs,
    wpm: correctChars / 5 / minutes,
    rawWpm: state.typed.length / 5 / minutes,
    accuracy,
    correctChars,
    progress,
  }
}

/** x1 au départ, +1 tous les 10 caractères justes d'affilée, plafonné à x8. */
export function comboMultiplier(combo: number): number {
  return Math.min(1 + Math.floor(combo / 10), 8)
}

/** Avancement (0..1) vers le prochain palier de combo. */
export function comboProgress(combo: number): number {
  return comboMultiplier(combo) >= 8 ? 1 : (combo % 10) / 10
}

/** Les `n` caractères les plus ratés, du pire au moins pire. */
export function topMistakes(
  mistakes: Readonly<Record<string, number>>,
  n = 5,
): Array<{ key: string; count: number }> {
  return Object.entries(mistakes)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, n)
}

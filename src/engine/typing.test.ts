import { describe, expect, it } from 'vitest'
import {
  applyInput,
  comboMultiplier,
  comboProgress,
  createState,
  finish,
  getMetrics,
  isMatch,
  topMistakes,
} from './typing'

/** Tape une chaîne caractère par caractère, 100 ms entre chaque frappe. */
function typeAll(target: string, text: string, strict = false, t0 = 1000) {
  let s = createState(target, strict)
  let t = t0
  let typed = ''
  for (const ch of text) {
    typed += ch
    s = applyInput(s, typed, t)
    t += 100
  }
  return { s, t }
}

describe('isMatch', () => {
  it('accepte l\'accent manquant hors mode strict', () => {
    expect(isMatch('é', 'e', false)).toBe(true)
    expect(isMatch('é', 'e', true)).toBe(false)
    expect(isMatch('e', 'é', false)).toBe(true)
  })
  it('respecte la casse', () => {
    expect(isMatch('A', 'a', false)).toBe(false)
  })
})

describe('applyInput', () => {
  it('démarre le chrono à la première frappe', () => {
    const s = applyInput(createState('abc'), 'a', 500)
    expect(s.startedAt).toBe(500)
    expect(s.correctKeystrokes).toBe(1)
  })

  it('compte les erreurs et casse le combo', () => {
    const { s } = typeAll('abcd', 'abx')
    expect(s.totalKeystrokes).toBe(3)
    expect(s.correctKeystrokes).toBe(2)
    expect(s.combo).toBe(0)
    expect(s.maxCombo).toBe(2)
    expect(s.mistakes).toEqual({ c: 1 })
    expect(s.lastErrorAt).not.toBeNull()
  })

  it('le retour arrière est gratuit mais l\'erreur reste comptée', () => {
    let { s } = typeAll('abcd', 'abx')
    s = applyInput(s, 'ab', 2000)
    expect(s.typed).toBe('ab')
    expect(s.totalKeystrokes).toBe(3)
    s = applyInput(s, 'abc', 2100)
    expect(s.correctKeystrokes).toBe(3)
    expect(s.combo).toBe(1)
  })

  it('termine automatiquement quand le texte est complet', () => {
    const { s, t } = typeAll('ab', 'ab')
    expect(s.finishedAt).toBe(t - 100)
    // plus aucune saisie acceptée
    expect(applyInput(s, 'abc', t)).toBe(s)
  })

  it('ignore les collages massifs', () => {
    const s = createState('hello world')
    expect(applyInput(s, 'hello', 100)).toBe(s)
  })

  it('ignore une saisie qui ne prolonge pas le texte tapé', () => {
    const { s } = typeAll('abcd', 'ab')
    expect(applyInput(s, 'xyz', 5000)).toBe(s)
  })

  it('ne dépasse jamais la longueur du texte', () => {
    const s = applyInput(createState('ab'), 'abc', 100)
    expect(s.typed).toBe('ab')
  })
})

describe('getMetrics', () => {
  it('calcule le WPM net : (caractères justes / 5) / minutes', () => {
    // 10 caractères justes en 6 secondes = 2 mots / 0,1 min = 20 WPM
    const target = 'abcdefghij'
    let s = createState(target)
    s = applyInput(s, 'abcd', 0)
    s = applyInput(s, 'abcdefgh', 3000)
    s = applyInput(s, 'abcdefghij', 6000)
    const m = getMetrics(s, 6000)
    expect(m.wpm).toBeCloseTo(20, 5)
    expect(m.rawWpm).toBeCloseTo(20, 5)
    expect(m.accuracy).toBe(1)
    expect(m.progress).toBe(1)
  })

  it('le WPM net ignore les caractères faux, la précision les compte', () => {
    const target = 'abcdefghij'
    let s = createState(target)
    s = applyInput(s, 'abcd', 0)
    s = applyInput(s, 'abcdx', 100)
    s = applyInput(s, 'abcdxf', 200)
    const m = getMetrics(finish(s, 6000), 99999)
    expect(m.correctChars).toBe(5) // a b c d f
    expect(m.accuracy).toBeCloseTo(5 / 6, 5)
    expect(m.rawWpm).toBeGreaterThan(m.wpm)
  })

  it('vaut 0 WPM et 100 % avant la première frappe', () => {
    const m = getMetrics(createState('abc'), 1000)
    expect(m.wpm).toBe(0)
    expect(m.accuracy).toBe(1)
  })

  it('plafonne la durée minimale à 1 s', () => {
    const s = applyInput(createState('abcde fghij'), 'abcd', 0)
    const m = getMetrics(s, 10)
    // 4 caractères / 5 / (1 s = 1/60 min) = 48 WPM
    expect(m.wpm).toBeCloseTo(48, 5)
  })

  it('finish() n\'a pas d\'effet avant le démarrage', () => {
    const s = createState('abc')
    expect(finish(s, 1000)).toBe(s)
  })
})

describe('combo', () => {
  it('monte d\'un palier tous les 10 caractères justes, max x8', () => {
    expect(comboMultiplier(0)).toBe(1)
    expect(comboMultiplier(9)).toBe(1)
    expect(comboMultiplier(10)).toBe(2)
    expect(comboMultiplier(35)).toBe(4)
    expect(comboMultiplier(500)).toBe(8)
  })
  it('donne l\'avancement vers le palier suivant', () => {
    expect(comboProgress(5)).toBeCloseTo(0.5)
    expect(comboProgress(500)).toBe(1)
  })
})

describe('topMistakes', () => {
  it('trie par nombre d\'erreurs décroissant', () => {
    expect(topMistakes({ a: 1, b: 4, c: 2 }, 2)).toEqual([
      { key: 'b', count: 4 },
      { key: 'c', count: 2 },
    ])
  })
})

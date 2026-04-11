import { useCallback, useEffect, useRef, useState } from 'react'
import { applyInput, createState, finish, type TypingState } from '../engine/typing'

interface Options {
  text: string
  /** Durée du test en secondes. */
  duration: number
  strictAccents: boolean
  /** Appelé une seule fois, quand le test se termine (chrono écoulé ou texte complet). */
  onFinish: (final: TypingState) => void
}

export interface TypingTest {
  state: TypingState
  /** Horloge courante (performance.now), rafraîchie toutes les 100 ms pendant le test. */
  now: number
  remainingMs: number
  /** Envoie la valeur du champ de saisie ; renvoie la valeur réellement acceptée. */
  input: (value: string) => string
}

export function useTypingTest({ text, duration, strictAccents, onFinish }: Options): TypingTest {
  const [state, setState] = useState(() => createState(text, strictAccents))
  const [now, setNow] = useState(() => performance.now())
  const stateRef = useRef(state)

  const input = useCallback((value: string) => {
    const t = performance.now()
    const next = applyInput(stateRef.current, value, t)
    stateRef.current = next
    setState(next)
    setNow(t)
    return next.typed
  }, [])

  // Chrono : démarre à la première frappe, s'arrête à la fin.
  const { startedAt, finishedAt } = state
  const running = startedAt !== null && finishedAt === null
  useEffect(() => {
    if (!running || startedAt === null) return
    const id = setInterval(() => {
      const t = performance.now()
      if (t - startedAt >= duration * 1000) {
        const next = finish(stateRef.current, startedAt + duration * 1000)
        stateRef.current = next
        setState(next)
      } else {
        setNow(t)
      }
    }, 100)
    return () => clearInterval(id)
  }, [running, startedAt, duration])

  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])
  const reported = useRef(false)
  useEffect(() => {
    if (state.finishedAt !== null && !reported.current) {
      reported.current = true
      onFinishRef.current(state)
    }
  }, [state])

  const elapsed = startedAt === null ? 0 : Math.max(0, (finishedAt ?? now) - startedAt)
  const remainingMs = Math.max(0, duration * 1000 - elapsed)

  return { state, now, remainingMs, input }
}

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { isMatch } from '../engine/typing'

interface Props {
  target: string
  typed: string
  strictAccents: boolean
  /** Position du fantôme (index dans le texte), ou null. */
  ghostIndex: number | null
  focused: boolean
}

interface Word {
  start: number
  text: string
}

/** Découpe en mots, l'espace final restant attaché au mot. */
function splitWords(target: string): Word[] {
  const words: Word[] = []
  for (const m of target.matchAll(/\S+\s*/g)) words.push({ start: m.index, text: m[0] })
  return words
}

interface WordViewProps {
  text: string
  /** Ce qui a été tapé sur ce mot (stable pour les mots déjà passés : le memo évite leur re-rendu). */
  typedPart: string
  /** Index du curseur dans le mot, ou null s'il est ailleurs. */
  cursorAt: number | null
  ghostAt: number | null
  strictAccents: boolean
  curRef: React.RefObject<HTMLSpanElement | null>
}

const WordView = memo(function WordView({
  text,
  typedPart,
  cursorAt,
  ghostAt,
  strictAccents,
  curRef,
}: WordViewProps) {
  const allOk =
    typedPart.length === text.length &&
    Array.from(text).every((ch, k) => isMatch(ch, typedPart[k], strictAccents))
  const chars = Array.from(text, (ch, k) => {
    let status: 'ok' | 'bad' | 'cur' | 'todo' = 'todo'
    if (k < typedPart.length) {
      status = isMatch(ch, typedPart[k], strictAccents) ? 'ok' : 'bad'
    } else if (k === cursorAt) {
      status = 'cur'
    }
    const cls = `ch ${status}${ch === ' ' ? ' sp' : ''}${k === ghostAt ? ' ghost' : ''}`
    return (
      <span key={k} className={cls} ref={status === 'cur' ? curRef : undefined}>
        {ch}
      </span>
    )
  })
  return <span className={`word${allOk ? ' word--done' : ''}`}>{chars}</span>
})

export function TypingArea({ target, typed, strictAccents, ghostIndex, focused }: Props) {
  const words = useMemo(() => splitWords(target), [target])
  const boxRef = useRef<HTMLDivElement>(null)
  const curRef = useRef<HTMLSpanElement | null>(null)
  const caretRef = useRef<HTMLSpanElement>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  /** Place le curseur sur le caractère courant (coordonnées dans le contenu défilant). */
  const placeCaret = useCallback(() => {
    const caret = caretRef.current
    const cur = curRef.current
    if (!caret) return
    if (!cur) {
      caret.style.opacity = '0' // texte terminé
      return
    }
    caret.style.opacity = ''
    caret.style.height = `${cur.offsetHeight}px`
    caret.style.transform = `translate(${cur.offsetLeft}px, ${cur.offsetTop}px)`
  }, [])

  // À chaque frappe : le curseur glisse, la ligne courante reste en 2e position
  // (le texte défile en douceur), et le clignotement ne reprend qu'après une courte pause.
  useLayoutEffect(() => {
    const box = boxRef.current
    const caret = caretRef.current
    placeCaret()
    if (box && curRef.current) {
      const lineHeight = parseFloat(getComputedStyle(box).lineHeight) || 40
      box.scrollTop = Math.max(0, curRef.current.offsetTop - lineHeight)
    }
    if (!caret) return
    // Pas de glissade depuis le coin au tout premier placement.
    if (!caret.classList.contains('caret--ready')) {
      requestAnimationFrame(() => caret.classList.add('caret--ready'))
    }
    caret.classList.add('caret--typing')
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => caret.classList.remove('caret--typing'), 500)
  }, [typed.length, placeCaret])

  useEffect(() => () => clearTimeout(idleTimer.current), [])

  // Le texte se réorganise quand la fenêtre change de taille : on replace le curseur.
  useEffect(() => {
    const box = boxRef.current
    if (!box || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(placeCaret)
    observer.observe(box)
    return () => observer.disconnect()
  }, [placeCaret])

  return (
    <div ref={boxRef} className={`typing${focused ? '' : ' typing--blur'}`} aria-hidden="true">
      <span ref={caretRef} className="caret" />
      {words.map((w) => {
        const end = w.start + w.text.length
        const inWord = (i: number | null) => (i !== null && i >= w.start && i < end ? i - w.start : null)
        return (
          <WordView
            key={w.start}
            text={w.text}
            typedPart={typed.slice(w.start, end)}
            cursorAt={inWord(typed.length)}
            ghostAt={inWord(ghostIndex)}
            strictAccents={strictAccents}
            curRef={curRef}
          />
        )
      })}
    </div>
  )
}

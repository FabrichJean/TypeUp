/** Applique au DOM les effets de `juiceFor` : secousse, flash, traits de vitesse, arrêt sur image, ralenti. */
import { SLOW_FACTOR, type Flash, type Juice } from '../../fight/juice'

const FLASH_BG: Record<Flash, string> = {
  white: 'rgba(255, 255, 255, 0.85)',
  gold: 'radial-gradient(circle, rgba(255, 233, 140, 0.9), rgba(255, 160, 40, 0.4) 60%, transparent 85%)',
  red: 'radial-gradient(circle, transparent 30%, rgba(255, 50, 70, 0.7))',
}

const SHAKE_PX = [0, 3, 6, 11] as const

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

const running = (el: HTMLElement): Animation[] =>
  typeof el.getAnimations === 'function' ? el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running') : []

export function applyJuice(arena: HTMLElement | null, flash: HTMLElement | null, lines: HTMLElement | null, j: Juice): void {
  if (!arena || prefersReducedMotion() || typeof arena.animate !== 'function') return
  try {
    // Les animations déjà en cours se figent un instant (avant d'ajouter la secousse).
    if (j.freezeMs > 0) {
      const frozen = running(arena)
      for (const a of frozen) a.pause()
      setTimeout(() => {
        for (const a of frozen) if (a.playState === 'paused') a.play()
      }, j.freezeMs)
    }
    if (j.slowMs > 0) {
      setTimeout(() => {
        const slowed = running(arena)
        for (const a of slowed) a.updatePlaybackRate(SLOW_FACTOR)
        setTimeout(() => {
          for (const a of slowed) if (a.playState !== 'idle') a.updatePlaybackRate(1)
        }, j.slowMs)
      }, j.freezeMs)
    }
    if (j.shake > 0) {
      const amp = SHAKE_PX[j.shake]
      const steps = 8
      const frames = Array.from({ length: steps }, (_, i) => {
        const decay = 1 - i / (steps - 1)
        return { transform: `translate(${((Math.random() * 2 - 1) * amp * decay).toFixed(1)}px, ${((Math.random() * 2 - 1) * amp * decay).toFixed(1)}px)` }
      })
      arena.animate(frames, { duration: 140 + j.shake * 80, easing: 'linear' })
    }
    if (j.flash && flash) {
      flash.style.background = FLASH_BG[j.flash]
      flash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: j.flash === 'white' ? 420 : 340, easing: 'ease-out' })
    }
    if (j.lines && lines) {
      lines.animate(
        [
          { opacity: 0.9, transform: 'scale(0.6)' },
          { opacity: 0, transform: 'scale(1.6)' },
        ],
        { duration: 520, easing: 'ease-out' },
      )
    }
  } catch {
    // les effets sont un plus : jamais bloquants
  }
}

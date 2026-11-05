/** Les pièces gagnées à la fin d'une partie, dans chaque mode (fonctions pures). */
import type { FightSummary } from '../storage/fight'
import type { RunSummary } from '../storage/quest'

const whole = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0)

/** Combat : tournoi, duel ou survie. */
export function fightCoins(run: FightSummary): number {
  const score = whole(run.score)
  const rounds = whole(run.roundsWon)
  if (run.endless) return 12 * rounds + 40 * Math.floor(rounds / 6) + Math.floor(score / 400)
  if (run.duelFoe) return (run.cleared ? 20 : 0) + Math.floor(score / 250)
  return 15 * rounds + (run.cleared ? 120 : 0) + Math.floor(score / 300)
}

/** Quête : les étages comptent plus que les kills. */
export function questCoins(run: RunSummary): number {
  return 5 * whole(run.floor) + Math.floor(whole(run.kills) / 4)
}

/** Entraînement : une pièce pour 12 XP. */
export function practiceCoins(xp: number): number {
  return Math.floor(whole(xp) / 12)
}

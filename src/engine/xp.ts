/** XP et niveaux. Le niveau L commence à 50·L·(L−1) XP (niv. 2 = 100, niv. 3 = 300, niv. 4 = 600…). */

export function computeXp(input: {
  correctChars: number
  accuracy: number
  maxCombo: number
}): number {
  const comboBonus = 1 + Math.min(input.maxCombo, 100) / 100
  return Math.round(input.correctChars * input.accuracy * input.accuracy * comboBonus)
}

export function xpForLevel(level: number): number {
  return 50 * level * (level - 1)
}

export interface LevelInfo {
  level: number
  /** XP accumulée dans le niveau courant. */
  into: number
  /** XP nécessaire pour passer au niveau suivant. */
  needed: number
  /** 0..1 */
  progress: number
}

export function levelInfo(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(xp))
  let level = 1
  while (xpForLevel(level + 1) <= total) level++
  const start = xpForLevel(level)
  const needed = xpForLevel(level + 1) - start
  const into = total - start
  return { level, into, needed, progress: into / needed }
}

/** Améliorations (« reliques ») que l'on choisit entre deux étages. Elles se cumulent. */
export const RELIC_IDS = [
  'shield',
  'heart',
  'armor',
  'hourglass',
  'magnet',
  'gold',
  'nova',
  'vampire',
  'frost',
] as const

export type RelicId = (typeof RELIC_IDS)[number]

export function isRelicId(value: unknown): value is RelicId {
  return RELIC_IDS.some((r) => r === value)
}

/** Réglages chiffrés, partagés entre le moteur et les textes d'aide. */
export const RELIC_TUNING = {
  /** Erreurs absorbées par relique « bouclier ». */
  shieldCharges: 3,
  heartHeal: 2,
  /** Chaque sablier multiplie la vitesse des ennemis par ce facteur. */
  hourglassSlow: 0.88,
  /** Part de mots dorés ajoutée par relique. */
  goldChance: 0.12,
  /** Combo nécessaire pour déclencher la nova (baisse avec les exemplaires, plancher 10). */
  novaEvery: 25,
  novaStep: 5,
  novaMin: 10,
  /** Mots abattus entre deux soins du vampire (baisse avec les exemplaires, plancher 3). */
  vampireEvery: 9,
  vampireStep: 2,
  vampireMin: 3,
  /** Secondes de gel au début de chaque étage, par exemplaire. */
  frostSeconds: 3,
} as const

/** Le catalogue de la boutique : des tenues pour le stickman et des décors pour le ring. */

export const SLOTS = ['hat', 'color', 'ring'] as const
export type Slot = (typeof SLOTS)[number]

export const HAT_IDS = ['band', 'none', 'ninja', 'cap', 'cat', 'horns', 'tophat', 'halo', 'crown'] as const
export type HatId = (typeof HAT_IDS)[number]

export const COLOR_IDS = ['amber', 'sky', 'mint', 'rose', 'violet', 'crimson', 'ghost', 'gold', 'prism'] as const
export type ColorId = (typeof COLOR_IDS)[number]

export const RING_IDS = ['classic', 'neon', 'sunset', 'dojo', 'space', 'volcano'] as const
export type RingId = (typeof RING_IDS)[number]

export type ItemId = HatId | ColorId | RingId

export interface Item {
  id: ItemId
  slot: Slot
  /** Prix en pièces ; 0 = offert dès le départ. */
  price: number
}

export const ITEMS: readonly Item[] = [
  { id: 'band', slot: 'hat', price: 0 },
  { id: 'none', slot: 'hat', price: 0 },
  { id: 'ninja', slot: 'hat', price: 90 },
  { id: 'cap', slot: 'hat', price: 120 },
  { id: 'cat', slot: 'hat', price: 170 },
  { id: 'horns', slot: 'hat', price: 240 },
  { id: 'tophat', slot: 'hat', price: 320 },
  { id: 'halo', slot: 'hat', price: 420 },
  { id: 'crown', slot: 'hat', price: 650 },

  { id: 'amber', slot: 'color', price: 0 },
  { id: 'sky', slot: 'color', price: 60 },
  { id: 'mint', slot: 'color', price: 60 },
  { id: 'rose', slot: 'color', price: 80 },
  { id: 'violet', slot: 'color', price: 120 },
  { id: 'crimson', slot: 'color', price: 150 },
  { id: 'ghost', slot: 'color', price: 260 },
  { id: 'gold', slot: 'color', price: 480 },
  { id: 'prism', slot: 'color', price: 900 },

  { id: 'classic', slot: 'ring', price: 0 },
  { id: 'neon', slot: 'ring', price: 160 },
  { id: 'sunset', slot: 'ring', price: 240 },
  { id: 'dojo', slot: 'ring', price: 340 },
  { id: 'space', slot: 'ring', price: 480 },
  { id: 'volcano', slot: 'ring', price: 700 },
]

/** Ce que le joueur porte au départ, par emplacement. */
export const DEFAULTS: Record<Slot, ItemId> = { hat: 'band', color: 'amber', ring: 'classic' }

const BY_ID = new Map<string, Item>(ITEMS.map((i) => [i.id, i]))

export function itemOf(id: unknown): Item | null {
  return typeof id === 'string' ? (BY_ID.get(id) ?? null) : null
}

export const itemsOf = (slot: Slot): readonly Item[] => ITEMS.filter((i) => i.slot === slot)

/** Teinte (degrés) et saturation relative de chaque couleur de stickman. */
export const COLOR_LOOK: Record<ColorId, { hue: number; sat: number }> = {
  amber: { hue: 32, sat: 1 },
  sky: { hue: 200, sat: 1 },
  mint: { hue: 150, sat: 0.95 },
  rose: { hue: 330, sat: 1 },
  violet: { hue: 270, sat: 1 },
  crimson: { hue: 355, sat: 1.1 },
  ghost: { hue: 210, sat: 0.1 },
  gold: { hue: 46, sat: 1.25 },
  prism: { hue: 32, sat: 1 },
}

/** Apparence du joueur, telle que le dessin la lit. */
export interface Look {
  hat: HatId
  hue: number
  sat: number
  /** Couleur arc-en-ciel animée. */
  prism: boolean
}

export function lookOf(equipped: Record<Slot, string>): Look {
  const color = equipped.color as ColorId
  const { hue, sat } = COLOR_LOOK[color] ?? COLOR_LOOK.amber
  return { hat: equipped.hat as HatId, hue, sat, prism: color === 'prism' }
}

export const DEFAULT_LOOK: Look = lookOf(DEFAULTS)

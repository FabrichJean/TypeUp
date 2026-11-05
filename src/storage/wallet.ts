import { DEFAULTS, ITEMS, SLOTS, itemOf, type Item, type Slot } from '../shop/catalog'
import { browserStorage, type KeyValueStorage } from './history'

export const WALLET_KEY = 'typeup.wallet'

export interface Wallet {
  version: 1
  /** Pièces disponibles. */
  coins: number
  /** Total gagné depuis le début (ne baisse jamais). */
  earned: number
  /** Objets achetés (les objets offerts sont toujours possédés, sans figurer ici). */
  owned: string[]
  equipped: Record<Slot, string>
}

export function emptyWallet(): Wallet {
  return { version: 1, coins: 0, earned: 0, owned: [], equipped: { ...DEFAULTS } }
}

export function isOwned(w: Wallet, id: string): boolean {
  const item = itemOf(id)
  return item !== null && (item.price === 0 || w.owned.includes(id))
}

/** Ajoute des pièces (entier ≥ 0). */
export function earn(w: Wallet, amount: number): Wallet {
  const n = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0
  return n === 0 ? w : { ...w, coins: w.coins + n, earned: w.earned + n }
}

export const canBuy = (w: Wallet, item: Item): boolean => !isOwned(w, item.id) && w.coins >= item.price

/** Achète l'objet et l'équipe tout de suite. Sans effet s'il est déjà possédé ou trop cher. */
export function buy(w: Wallet, id: string): Wallet {
  const item = itemOf(id)
  if (!item || !canBuy(w, item)) return w
  return {
    ...w,
    coins: w.coins - item.price,
    owned: [...w.owned, item.id],
    equipped: { ...w.equipped, [item.slot]: item.id },
  }
}

/** Équipe un objet possédé. */
export function equip(w: Wallet, id: string): Wallet {
  const item = itemOf(id)
  if (!item || !isOwned(w, id) || w.equipped[item.slot] === id) return w
  return { ...w, equipped: { ...w.equipped, [item.slot]: id } }
}

const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0)

/** Charge le portefeuille ; toute donnée absente ou abîmée donne un portefeuille neuf, les restes valides sont gardés. */
export function loadWallet(storage: KeyValueStorage | null = browserStorage()): Wallet {
  if (!storage) return emptyWallet()
  try {
    const raw = storage.getItem(WALLET_KEY)
    if (!raw) return emptyWallet()
    const d = JSON.parse(raw) as Record<string, unknown> | null
    if (typeof d !== 'object' || d === null || Array.isArray(d) || d.version !== 1) return emptyWallet()
    const owned = Array.isArray(d.owned)
      ? [...new Set(d.owned.filter((id): id is string => typeof id === 'string' && (itemOf(id)?.price ?? 0) > 0))]
      : []
    const w: Wallet = { version: 1, coins: count(d.coins), earned: count(d.earned), owned, equipped: { ...DEFAULTS } }
    const eq = typeof d.equipped === 'object' && d.equipped !== null ? (d.equipped as Record<string, unknown>) : {}
    for (const slot of SLOTS) {
      const id = eq[slot]
      if (typeof id === 'string' && itemOf(id)?.slot === slot && isOwned(w, id)) w.equipped[slot] = id
    }
    return w
  } catch {
    return emptyWallet()
  }
}

/** Renvoie `false` si l'écriture a échoué. */
export function saveWallet(w: Wallet, storage: KeyValueStorage | null = browserStorage()): boolean {
  if (!storage) return false
  try {
    storage.setItem(WALLET_KEY, JSON.stringify(w))
    return true
  } catch {
    return false
  }
}

/** Nombre d'objets possédés (offerts compris) et total du catalogue. */
export function collection(w: Wallet): { owned: number; total: number } {
  return { owned: ITEMS.filter((i) => isOwned(w, i.id)).length, total: ITEMS.length }
}

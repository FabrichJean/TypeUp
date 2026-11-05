import { describe, expect, it } from 'vitest'
import type { KeyValueStorage } from '../storage/history'
import {
  WALLET_KEY,
  buy,
  collection,
  earn,
  emptyWallet,
  equip,
  isOwned,
  loadWallet,
  saveWallet,
} from '../storage/wallet'
import { COLOR_IDS, DEFAULTS, HAT_IDS, ITEMS, RING_IDS, SLOTS, itemOf, itemsOf, lookOf } from './catalog'
import { fightCoins, practiceCoins, questCoins } from './coins'

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const data = { ...initial }
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) }
}

describe('catalogue', () => {
  it('chaque emplacement a un objet offert par défaut', () => {
    for (const slot of SLOTS) {
      const def = itemOf(DEFAULTS[slot])
      expect(def?.slot).toBe(slot)
      expect(def?.price).toBe(0)
    }
  })

  it('identifiants uniques et listes complètes', () => {
    const ids = ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(itemsOf('hat').map((i) => i.id).sort()).toEqual([...HAT_IDS].sort())
    expect(itemsOf('color').map((i) => i.id).sort()).toEqual([...COLOR_IDS].sort())
    expect(itemsOf('ring').map((i) => i.id).sort()).toEqual([...RING_IDS].sort())
  })

  it('les prix sont entiers et les objets rares coûtent plus cher', () => {
    for (const i of ITEMS) expect(Number.isInteger(i.price) && i.price >= 0).toBe(true)
    expect(itemOf('crown')!.price).toBeGreaterThan(itemOf('cap')!.price)
    expect(itemOf('prism')!.price).toBeGreaterThan(itemOf('sky')!.price)
  })

  it('itemOf refuse l\'inconnu', () => {
    expect(itemOf('nope')).toBeNull()
    expect(itemOf(42)).toBeNull()
  })

  it('lookOf traduit l\'équipement en apparence', () => {
    expect(lookOf({ hat: 'crown', color: 'sky', ring: 'classic' })).toEqual({ hat: 'crown', hue: 200, sat: 1, prism: false })
    expect(lookOf({ hat: 'band', color: 'prism', ring: 'classic' }).prism).toBe(true)
    expect(lookOf({ hat: 'band', color: 'inconnue', ring: 'classic' }).hue).toBe(32)
  })
})

describe('portefeuille', () => {
  it('démarre vide, avec les objets offerts équipés et possédés', () => {
    const w = emptyWallet()
    expect(w.coins).toBe(0)
    expect(w.equipped).toEqual(DEFAULTS)
    expect(isOwned(w, 'band')).toBe(true)
    expect(isOwned(w, 'crown')).toBe(false)
    expect(collection(w).owned).toBe(3 + 1)
  })

  it('gagne des pièces entières et positives', () => {
    expect(earn(emptyWallet(), 10).coins).toBe(10)
    expect(earn(emptyWallet(), 4.9).coins).toBe(4)
    const w = emptyWallet()
    for (const bad of [0, -5, NaN, Infinity]) expect(earn(w, bad)).toBe(w)
  })

  it('achète, débite et équipe d\'un coup', () => {
    const w = buy(earn(emptyWallet(), 200), 'cap')
    expect(w.coins).toBe(80)
    expect(w.earned).toBe(200)
    expect(w.owned).toEqual(['cap'])
    expect(w.equipped.hat).toBe('cap')
  })

  it('refuse un achat trop cher, déjà fait ou inconnu', () => {
    const poor = earn(emptyWallet(), 50)
    expect(buy(poor, 'cap')).toBe(poor)
    const rich = buy(earn(emptyWallet(), 500), 'cap')
    expect(buy(rich, 'cap')).toBe(rich)
    expect(buy(rich, 'inexistant')).toBe(rich)
    expect(buy(rich, 'band')).toBe(rich)
  })

  it('on change d\'objet sans repayer, mais pas avec un objet non possédé', () => {
    let w = buy(earn(emptyWallet(), 500), 'cap')
    w = equip(w, 'none')
    expect(w.equipped.hat).toBe('none')
    w = equip(w, 'cap')
    expect(w.equipped.hat).toBe('cap')
    expect(w.coins).toBe(380)
    expect(equip(w, 'crown')).toBe(w)
    expect(equip(w, 'cap')).toBe(w)
  })

  it('un emplacement ne reçoit que ses objets', () => {
    const w = buy(earn(emptyWallet(), 500), 'neon')
    expect(w.equipped.ring).toBe('neon')
    expect(w.equipped.hat).toBe('band')
  })

  it('relit ce qui a été sauvegardé', () => {
    const storage = memoryStorage()
    const w = buy(buy(earn(emptyWallet(), 900), 'sky'), 'crown')
    expect(saveWallet(w, storage)).toBe(true)
    expect(loadWallet(storage)).toEqual(w)
  })

  it('ignore une donnée corrompue, et nettoie ce qui est invalide', () => {
    for (const raw of ['{', 'null', '[]', JSON.stringify({ version: 2 })]) {
      expect(loadWallet(memoryStorage({ [WALLET_KEY]: raw }))).toEqual(emptyWallet())
    }
    const messy = JSON.stringify({
      version: 1,
      coins: -3,
      earned: 'x',
      owned: ['cap', 'cap', 'zzz', 42, 'band'],
      equipped: { hat: 'crown', color: 'ring', ring: 'neon' },
    })
    const w = loadWallet(memoryStorage({ [WALLET_KEY]: messy }))
    expect(w.coins).toBe(0)
    expect(w.earned).toBe(0)
    expect(w.owned).toEqual(['cap'])
    // crown non possédé, « ring » n'est pas une couleur, neon non possédé : retour aux défauts
    expect(w.equipped).toEqual(DEFAULTS)
  })

  it('signale un échec d\'écriture', () => {
    const broken: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(saveWallet(emptyWallet(), broken)).toBe(false)
    expect(saveWallet(emptyWallet(), null)).toBe(false)
    expect(loadWallet(null)).toEqual(emptyWallet())
  })
})

describe('pièces gagnées', () => {
  const base = { score: 0, roundsWon: 0, cleared: false, parries: 0 }

  it('tournoi : par adversaire battu, prime de champion', () => {
    expect(fightCoins({ ...base, roundsWon: 2, score: 600 })).toBe(30 + 2)
    expect(fightCoins({ ...base, roundsWon: 6, cleared: true, score: 9000 })).toBe(90 + 120 + 30)
  })

  it('duel : surtout si on gagne', () => {
    expect(fightCoins({ ...base, duelFoe: 'caps', cleared: true, score: 1000 })).toBe(20 + 4)
    expect(fightCoins({ ...base, duelFoe: 'caps', score: 1000 })).toBe(4)
  })

  it('survie : par adversaire, prime à chaque tour complet', () => {
    expect(fightCoins({ ...base, endless: true, roundsWon: 5, score: 800 })).toBe(60 + 2)
    expect(fightCoins({ ...base, endless: true, roundsWon: 13, score: 0 })).toBe(156 + 80)
  })

  it('jamais négatif ni fractionnaire', () => {
    expect(fightCoins({ ...base, score: -50, roundsWon: -2 })).toBe(0)
    expect(fightCoins({ ...base, score: NaN, roundsWon: NaN })).toBe(0)
    expect(questCoins({ score: 0, floor: 0, kills: 0 })).toBe(0)
    expect(practiceCoins(-4)).toBe(0)
  })

  it('quête et entraînement', () => {
    expect(questCoins({ score: 1, floor: 4, kills: 17 })).toBe(20 + 4)
    expect(practiceCoins(140)).toBe(11)
    expect(practiceCoins(11)).toBe(0)
  })
})

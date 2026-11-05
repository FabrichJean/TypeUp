import type { Lang } from '../content/packs'
import type { ItemId, Slot } from './catalog'

export interface ShopStrings {
  tab: string
  title: string
  tagline: string
  coins: string
  coinsEarned: (n: number) => string
  collection: (owned: number, total: number) => string
  slots: Record<Slot, string>
  items: Record<ItemId, string>
  buy: (price: number) => string
  equip: string
  equipped: string
  free: string
  missing: (n: number) => string
  pickHint: string
  poses: { idle: string; strike: string; win: string }
  earnTitle: string
  earn: readonly string[]
  gain: (n: number) => string
}

export const SHOP_STRINGS: Record<Lang, ShopStrings> = {
  fr: {
    tab: 'Boutique',
    title: 'Boutique',
    tagline: 'Dépense tes pièces pour customiser ton stickman et le ring.',
    coins: 'pièces',
    coinsEarned: (n) => `${n.toLocaleString('fr')} pièces gagnées au total`,
    collection: (owned, total) => `${owned}/${total} objets`,
    slots: { hat: 'Couvre-chef', color: 'Couleur', ring: 'Décor du ring' },
    items: {
      band: 'Bandeau',
      none: 'Tête nue',
      ninja: 'Cagoule ninja',
      cap: 'Casquette',
      cat: 'Oreilles de chat',
      horns: 'Cornes',
      tophat: 'Haut-de-forme',
      halo: 'Auréole',
      crown: 'Couronne',
      amber: 'Ambre',
      sky: 'Ciel',
      mint: 'Menthe',
      rose: 'Rose',
      violet: 'Violet',
      crimson: 'Carmin',
      ghost: 'Fantôme',
      gold: 'Or',
      prism: 'Prisme',
      classic: 'Classique',
      neon: 'Néon',
      sunset: 'Coucher de soleil',
      dojo: 'Dojo',
      space: 'Espace',
      volcano: 'Volcan',
    },
    buy: (price) => `Acheter · ${price}`,
    equip: 'Équiper',
    equipped: 'Équipé',
    free: 'Offert',
    missing: (n) => `Il te manque ${n} pièce${n > 1 ? 's' : ''}`,
    pickHint: 'Touche un objet pour l\'essayer.',
    poses: { idle: 'Garde', strike: 'Coup', win: 'Victoire' },
    earnTitle: 'Comment gagner des pièces',
    earn: [
      'Combat : chaque adversaire battu rapporte des pièces, avec une grosse prime pour un tournoi gagné ou chaque tour de Survie.',
      'Quête : les étages franchis rapportent des pièces.',
      'Entraînement : une pièce pour 12 XP gagnés.',
    ],
    gain: (n) => `+${n}`,
  },
  en: {
    tab: 'Shop',
    title: 'Shop',
    tagline: 'Spend your coins to customize your stickman and the ring.',
    coins: 'coins',
    coinsEarned: (n) => `${n.toLocaleString('en')} coins earned in total`,
    collection: (owned, total) => `${owned}/${total} items`,
    slots: { hat: 'Headwear', color: 'Color', ring: 'Ring backdrop' },
    items: {
      band: 'Headband',
      none: 'Bare head',
      ninja: 'Ninja hood',
      cap: 'Cap',
      cat: 'Cat ears',
      horns: 'Horns',
      tophat: 'Top hat',
      halo: 'Halo',
      crown: 'Crown',
      amber: 'Amber',
      sky: 'Sky',
      mint: 'Mint',
      rose: 'Rose',
      violet: 'Violet',
      crimson: 'Crimson',
      ghost: 'Ghost',
      gold: 'Gold',
      prism: 'Prism',
      classic: 'Classic',
      neon: 'Neon',
      sunset: 'Sunset',
      dojo: 'Dojo',
      space: 'Space',
      volcano: 'Volcano',
    },
    buy: (price) => `Buy · ${price}`,
    equip: 'Equip',
    equipped: 'Equipped',
    free: 'Free',
    missing: (n) => `You need ${n} more coin${n > 1 ? 's' : ''}`,
    pickHint: 'Tap an item to try it on.',
    poses: { idle: 'Guard', strike: 'Strike', win: 'Victory' },
    earnTitle: 'How to earn coins',
    earn: [
      'Fight: every opponent beaten pays coins, with a big bonus for a won tournament or each Survival lap.',
      'Quest: every floor you clear pays coins.',
      'Practice: one coin for every 12 XP earned.',
    ],
    gain: (n) => `+${n}`,
  },
}

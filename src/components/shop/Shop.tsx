import { Check, Coins, Lock } from 'lucide-react'
import { useState } from 'react'
import type { Lang } from '../../content/packs'
import {
  COLOR_LOOK,
  SLOTS,
  itemOf,
  itemsOf,
  lookOf,
  type ColorId,
  type HatId,
  type Item,
  type ItemId,
  type Slot,
} from '../../shop/catalog'
import { SHOP_STRINGS } from '../../shop/strings'
import { canBuy, collection, isOwned, type Wallet } from '../../storage/wallet'
import { Hat } from '../fight/Hats'
import { StickFighter } from '../fight/StickFighter'
import type { PoseName } from '../../fight/poses'

interface Props {
  lang: Lang
  wallet: Wallet
  onBuy: (id: ItemId) => void
  onEquip: (id: ItemId) => void
}

const SHOW_POSES: readonly { id: 'idle' | 'strike' | 'win'; pose: PoseName }[] = [
  { id: 'idle', pose: 'idle' },
  { id: 'strike', pose: 'roundKick' },
  { id: 'win', pose: 'victory' },
]

/** Pastille de l'objet : tête coiffée, pastille de couleur ou décor miniature. */
function Swatch({ item }: { item: Item }) {
  if (item.slot === 'hat') {
    return (
      <svg className="stick shop-swatch shop-swatch--hat" style={{ '--hue': 32 } as React.CSSProperties} viewBox="-40 -52 80 78" aria-hidden="true">
        <circle className="stick-skull" r="18" />
        <circle className="stick-eye" cx="9" cy="-3" r="3" />
        <Hat hat={item.id as HatId} />
      </svg>
    )
  }
  if (item.slot === 'color') {
    const { hue, sat } = COLOR_LOOK[item.id as ColorId]
    const style =
      item.id === 'prism'
        ? { background: 'conic-gradient(#ff5e5e, #ffd54a, #7ee787, #4aa8ff, #c77dff, #ff5e5e)' }
        : { background: `hsl(${hue} ${Math.min(100, 75 * sat)}% 62%)` }
    return <span className="shop-swatch shop-swatch--color" style={style} aria-hidden="true" />
  }
  return <span className={`shop-swatch shop-swatch--ring ${item.id === 'classic' ? '' : `f-arena--ring-${item.id}`}`} aria-hidden="true" />
}

/** Boutique : on essaie un objet sur le stickman, puis on l'achète ou on l'équipe. */
export function Shop({ lang, wallet, onBuy, onEquip }: Props) {
  const t = SHOP_STRINGS[lang]
  const [selected, setSelected] = useState<ItemId | null>(null)
  const [pose, setPose] = useState<PoseName>('idle')

  const picked = itemOf(selected)
  // L'aperçu montre l'objet touché à la place de celui qui est équipé.
  const shown: Record<Slot, string> = picked ? { ...wallet.equipped, [picked.slot]: picked.id } : wallet.equipped
  const look = lookOf(shown)
  const { owned, total } = collection(wallet)

  return (
    <section className="shop">
      <header className="shop-head">
        <div>
          <h2>{t.title}</h2>
          <p className="quest-tagline">{t.tagline}</p>
        </div>
        <div className="shop-purse">
          <span className="shop-coins">
            <Coins className="icon" aria-hidden="true" />
            <strong>{wallet.coins.toLocaleString(lang)}</strong> {t.coins}
          </span>
          <small>
            {t.collection(owned, total)} · {t.coinsEarned(wallet.earned)}
          </small>
        </div>
      </header>

      <div className="shop-layout">
        <div className="shop-preview">
          <div className={`f-arena f-arena--stick f-arena--ring-${shown.ring} shop-stage`} style={{ '--hue': 210 } as React.CSSProperties}>
            <div className="f-bg" aria-hidden="true" />
            <div className="stick-floor" aria-hidden="true" />
            <div className="f-player shop-fighter" aria-hidden="true">
              <StickFighter who="player" pose={pose} facing="right" look={look} />
            </div>
          </div>
          <div className="segmented shop-poses" role="group">
            {SHOW_POSES.map((p) => (
              <button key={p.id} type="button" className={pose === p.pose ? 'on' : ''} aria-pressed={pose === p.pose} onClick={() => setPose(p.pose)}>
                {t.poses[p.id]}
              </button>
            ))}
          </div>

          <div className="shop-buy" aria-live="polite">
            {picked ? (
              <>
                <strong>{t.items[picked.id]}</strong>
                {isOwned(wallet, picked.id) ? (
                  wallet.equipped[picked.slot] === picked.id ? (
                    <span className="badge badge--record">
                      <Check className="icon" aria-hidden="true" />
                      {t.equipped}
                    </span>
                  ) : (
                    <button type="button" className="btn btn--primary" onClick={() => onEquip(picked.id)}>
                      {t.equip}
                    </button>
                  )
                ) : canBuy(wallet, picked) ? (
                  <button type="button" className="btn btn--primary" onClick={() => onBuy(picked.id)}>
                    <Coins className="icon" aria-hidden="true" />
                    {t.buy(picked.price)}
                  </button>
                ) : (
                  <span className="shop-missing">
                    <Lock className="icon" aria-hidden="true" />
                    {t.missing(picked.price - wallet.coins)}
                  </span>
                )}
              </>
            ) : (
              <span className="shop-hint">{t.pickHint}</span>
            )}
          </div>
        </div>

        <div className="shop-shelves">
          {SLOTS.map((slot) => (
            <div key={slot} className="shop-shelf">
              <h3>{t.slots[slot]}</h3>
              <ul>
                {itemsOf(slot).map((item) => {
                  const own = isOwned(wallet, item.id)
                  const on = wallet.equipped[slot] === item.id
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={['shop-item', selected === item.id && 'shop-item--sel', on && 'shop-item--on', !own && 'shop-item--locked'].filter(Boolean).join(' ')}
                        aria-pressed={selected === item.id}
                        onClick={() => setSelected(item.id)}
                      >
                        <Swatch item={item} />
                        <span className="shop-item-name">{t.items[item.id]}</span>
                        <span className="shop-item-price">
                          {on ? (
                            <Check className="icon" aria-label={t.equipped} />
                          ) : own ? (
                            item.price === 0 ? t.free : <Check className="icon" aria-hidden="true" />
                          ) : (
                            <>
                              <Coins className="icon" aria-hidden="true" />
                              {item.price}
                            </>
                          )}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="quest-how">
        <h3>{t.earnTitle}</h3>
        <ul>
          {t.earn.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

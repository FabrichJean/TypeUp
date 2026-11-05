import { Coins } from 'lucide-react'
import { useState } from 'react'

interface Props {
  coins: number
  label: string
  onClick: () => void
}

/** Pièces dans la barre du haut : un « +N » flotte quand on en gagne. */
export function Purse({ coins, label, onClick }: Props) {
  // Le gain se déduit en comparant au solde précédent, mémorisé pendant le rendu.
  const [seen, setSeen] = useState({ coins, gain: 0, n: 0 })
  let current = seen
  if (coins !== seen.coins) {
    current = { coins, gain: coins > seen.coins ? coins - seen.coins : 0, n: seen.n + 1 }
    setSeen(current)
  }
  return (
    <button type="button" className={current.gain > 0 ? 'purse purse--pop' : 'purse'} key={current.gain > 0 ? current.n : 'idle'} onClick={onClick} title={label} aria-label={`${coins} ${label}`}>
      <Coins className="icon" aria-hidden="true" />
      {coins.toLocaleString()}
      {current.gain > 0 && <span className="purse-gain">+{current.gain}</span>}
    </button>
  )
}

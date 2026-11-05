import type { HatId } from '../../shop/catalog'

const HEAD_R = 18

/** Couvre-chef du joueur, dessiné dans le repère de la tête (centre en 0,0, vers la droite = devant). */
export function Hat({ hat }: { hat: HatId }) {
  switch (hat) {
    case 'none':
      return null
    case 'band':
      return (
        <>
          <path className="stick-band" d={`M-${HEAD_R} -5h${HEAD_R * 2}`} />
          <path className="stick-band" d={`M-${HEAD_R} -5l-16 8m16 -8l-14 -6`} />
        </>
      )
    case 'ninja':
      return (
        <>
          <path className="stick-hat-dark" d="M-18 -3a18 18 0 0 1 36 0z" />
          <path className="stick-band stick-band--red" d="M-18 -5h36" />
          <path className="stick-band stick-band--red" d="M-18 -5l-20 6m20 -6l-18 -8" />
        </>
      )
    case 'cap':
      return (
        <>
          <path className="stick-hat-main" d="M-17 -4a17 16 0 0 1 34 0z" />
          <path className="stick-hat-main stick-hat-brim" d="M8 -6h20a3 3 0 0 1 0 6h-20z" />
          <circle className="stick-hat-dot" cx="0" cy="-19" r="2.5" />
        </>
      )
    case 'cat':
      return (
        <>
          <path className="stick-hat-ear" d="M-17 -7l2 -22l13 14z" />
          <path className="stick-hat-ear" d="M17 -7l-2 -22l-13 14z" />
          <path className="stick-hat-inner" d="M-14 -13l1 -11l7 8z" />
          <path className="stick-hat-inner" d="M14 -13l-1 -11l-7 8z" />
        </>
      )
    case 'horns':
      return (
        <>
          <path className="stick-hat-horn" d="M-12 -13c-12 -4 -14 -18 -9 -27c2 10 8 14 13 17z" />
          <path className="stick-hat-horn" d="M12 -13c12 -4 14 -18 9 -27c-2 10 -8 14 -13 17z" />
        </>
      )
    case 'tophat':
      return (
        <>
          <rect className="stick-hat-dark" x="-12" y="-44" width="24" height="30" rx="2" />
          <rect className="stick-hat-ribbon" x="-12" y="-26" width="24" height="6" />
          <ellipse className="stick-hat-dark" cx="0" cy="-14" rx="22" ry="4.5" />
        </>
      )
    case 'halo':
      return <ellipse className="stick-hat-halo" cx="0" cy="-32" rx="15" ry="4.5" />
    case 'crown':
      return (
        <>
          <path className="stick-hat-crown" d="M-14 -14l-3 -19l9 8l8 -12l8 12l9 -8l-3 19z" />
          <circle className="stick-hat-gem" cx="0" cy="-19" r="2.6" />
          <circle className="stick-hat-gem stick-hat-gem--blue" cx="-8" cy="-18" r="1.8" />
          <circle className="stick-hat-gem stick-hat-gem--blue" cx="8" cy="-18" r="1.8" />
        </>
      )
  }
}

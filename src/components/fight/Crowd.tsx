const MEMBERS = 22

/** La foule derrière les cordes : elle s'agite d'autant plus que la série est haute. */
export function Crowd({ energy }: { energy: 0 | 1 | 2 | 3 }) {
  return (
    <div className={`f-crowd f-crowd--e${energy}`} aria-hidden="true">
      {Array.from({ length: MEMBERS }, (_, i) => (
        <i key={i} style={{ '--i': i } as React.CSSProperties} />
      ))}
    </div>
  )
}

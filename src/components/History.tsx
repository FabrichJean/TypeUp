import { getPack, type Lang } from '../content/packs'
import type { Strings } from '../i18n'
import { aggregateMistakes, summarize, type HistoryStore, type SessionRecord } from '../storage/history'

interface Props {
  store: HistoryStore
  lang: Lang
  t: Strings
}

const W = 600
const H = 200
const PAD = { l: 38, r: 12, t: 14, b: 22 }

function Chart({ sessions, label }: { sessions: SessionRecord[]; label: string }) {
  const pts = sessions.slice(-30)
  const max = Math.max(10, Math.ceil(Math.max(...pts.map((s) => s.wpm)) / 10) * 10)
  const x = (i: number) =>
    pts.length === 1 ? W / 2 : PAD.l + (i * (W - PAD.l - PAD.r)) / (pts.length - 1)
  const y = (v: number) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b)
  const line = pts.map((s, i) => `${x(i).toFixed(1)},${y(s.wpm).toFixed(1)}`).join(' ')
  const area = `${x(0).toFixed(1)},${y(0)} ${line} ${x(pts.length - 1).toFixed(1)},${y(0)}`
  const ticks = [0, max / 2, max]
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {ticks.map((v) => (
        <g key={v}>
          <line className="chart-grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
          <text className="chart-axis" x={PAD.l - 6} y={y(v) + 4} textAnchor="end">
            {Math.round(v)}
          </text>
        </g>
      ))}
      {pts.length > 1 && <polygon className="chart-area" points={area} />}
      {pts.length > 1 && <polyline className="chart-line" points={line} />}
      {pts.map((s, i) => (
        <circle key={s.id} className="chart-dot" cx={x(i)} cy={y(s.wpm)} r="4">
          <title>
            {Math.round(s.wpm)} WPM · {Math.round(s.accuracy * 100)}%
          </title>
        </circle>
      ))}
    </svg>
  )
}

export function History({ store, lang, t }: Props) {
  if (store.sessions.length === 0) {
    return (
      <section className="history">
        <h2>{t.historyTitle}</h2>
        <p className="empty">{t.emptyHistory}</p>
      </section>
    )
  }

  const sum = summarize(store)
  const missed = aggregateMistakes(store, 8)
  const topCount = missed[0]?.count ?? 1
  const recent = store.sessions.slice(-10).reverse()

  return (
    <section className="history">
      <h2>{t.historyTitle}</h2>

      <dl className="result-grid">
        <div>
          <dt>{t.sessions}</dt>
          <dd>{sum.sessions}</dd>
        </div>
        <div>
          <dt>{t.best}</dt>
          <dd>{Math.round(sum.bestWpm)}</dd>
        </div>
        <div>
          <dt>{t.average}</dt>
          <dd>{Math.round(sum.avgWpm)}</dd>
        </div>
        <div>
          <dt>{t.avgAccuracy}</dt>
          <dd>{Math.round(sum.avgAccuracy * 100)}%</dd>
        </div>
      </dl>

      <h3>{t.progression}</h3>
      <Chart sessions={store.sessions} label={t.chartLabel} />

      {missed.length > 0 && (
        <>
          <h3>{t.topMissed}</h3>
          <ul className="bars">
            {missed.map(({ key, count }) => (
              <li key={key}>
                <kbd>{key === ' ' ? t.space : key}</kbd>
                <span className="bar">
                  <span className="bar-fill" style={{ width: `${(count / topCount) * 100}%` }} />
                </span>
                <span className="bar-n">{count}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>{t.recent}</h3>
      <div className="table-wrap">
        <table>
          <tbody>
            {recent.map((s) => {
              const pack = getPack(s.packId)
              return (
                <tr key={s.id}>
                  <td>{new Date(s.at).toLocaleDateString(lang)}</td>
                  <td>
                    {pack?.emoji} {pack?.label[lang] ?? s.packId}
                    {s.level && ` · ${t[s.level]}`}
                  </td>
                  <td>{s.duration}s</td>
                  <td>
                    <strong>{Math.round(s.wpm)}</strong> WPM
                  </td>
                  <td>{Math.round(s.accuracy * 100)}%</td>
                  <td>+{s.xp} XP</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

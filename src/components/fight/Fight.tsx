import { Swords, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Lang } from '../../content/packs'
import { loadWordList } from '../../content/words'
import { fallbackWords } from '../../quest/content'
import { FOES } from '../../fight/foes'
import { FIGHT_STRINGS } from '../../fight/strings'
import type { FightStats, FightSummary } from '../../storage/fight'
import { FoeArt } from './FoeArt'
import { FightRun } from './FightRun'

interface Props {
  lang: Lang
  sound: boolean
  stats: FightStats
  onRunEnd: (run: FightSummary) => void
}

interface Run {
  id: number
  /** Meilleur score au lancement du tournoi. */
  prevBest: number
  /** Adversaire d'un duel, ou absent pour le tournoi complet. */
  foe?: number
  /** Présenter l'adversaire avant le combat (pas pour une revanche). */
  briefing: boolean
}

/** Mode Combat : menu avec la galerie des adversaires, puis tournois enchaînés. */
export function Fight({ lang, sound, stats, onRunEnd }: Props) {
  const t = FIGHT_STRINGS[lang]
  const [words, setWords] = useState<readonly string[] | null>(null)
  const [run, setRun] = useState<Run | null>(null)

  useEffect(() => {
    const abort = new AbortController()
    void loadWordList(lang).then((list) => {
      if (!abort.signal.aborted) setWords(list ?? fallbackWords(lang))
    })
    return () => abort.abort()
  }, [lang])

  const start = (foe?: number, briefing = true) =>
    setRun((r) => ({ id: (r?.id ?? 0) + 1, prevBest: stats.bestScore, foe, briefing }))

  if (run && words) {
    return (
      <FightRun
        key={run.id}
        lang={lang}
        words={words}
        sound={sound}
        t={t}
        prevBest={run.prevBest}
        duelFoe={run.foe}
        briefing={run.briefing}
        onEnd={onRunEnd}
        onAgain={() => start(run.foe, false)}
        onMenu={() => setRun(null)}
      />
    )
  }

  return (
    <section className="fight-menu">
      <Swords className="icon icon--xl" aria-hidden="true" />
      <h2>{t.title}</h2>
      <p className="quest-tagline">{t.tagline}</p>

      <button type="button" className="btn btn--primary btn--lg" onClick={() => start()} disabled={!words} autoFocus>
        {words ? t.startTournament : t.loading}
      </button>

      {stats.runs > 0 && (
        <dl className="result-grid">
          <div>
            <dt>{t.bestScore}</dt>
            <dd>{stats.bestScore.toLocaleString(lang)}</dd>
          </div>
          <div>
            <dt>{t.bestRounds}</dt>
            <dd>
              {stats.bestRounds}/{FOES.length}
            </dd>
          </div>
          <div>
            <dt>{t.tournaments}</dt>
            <dd>{stats.runs}</dd>
          </div>
          <div>
            <dt>{t.clears}</dt>
            <dd>{stats.clears}</dd>
          </div>
          <div>
            <dt>{t.parries}</dt>
            <dd>{stats.totalParries.toLocaleString(lang)}</dd>
          </div>
        </dl>
      )}

      <div className="fight-roster">
        <h3>{t.opponentsTitle}</h3>
        <p className="fight-roster-hint">{t.orPick}</p>
        <ol>
          {FOES.map((foe, i) => {
            const wins = stats.duelWins[foe.id] ?? 0
            return (
              <li key={foe.id} style={{ '--hue': foe.hue } as React.CSSProperties}>
                <button type="button" className="fight-roster-btn" disabled={!words} onClick={() => start(i)}>
                  <div className="fight-roster-art">
                    <FoeArt id={foe.id} mood="idle" />
                  </div>
                  <div>
                    <strong>
                      {i + 1}. {t.foes[foe.id].name}
                    </strong>
                    <em>« {t.foes[foe.id].taunt} »</em>
                    <span>{t.foes[foe.id].tip}</span>
                    {wins > 0 && (
                      <small className="fight-roster-wins">
                        <Trophy className="icon" aria-hidden="true" />
                        {t.duelWinsLabel(wins)}
                      </small>
                    )}
                  </div>
                  <span className="fight-roster-go">
                    <Swords className="icon" aria-hidden="true" />
                    {t.challenge}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="quest-how">
        <h3>{t.howTitle}</h3>
        <ol>
          {t.how.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}

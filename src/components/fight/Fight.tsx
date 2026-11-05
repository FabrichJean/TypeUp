import { Infinity as InfinityIcon, Swords, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Lang } from '../../content/packs'
import { loadWordList } from '../../content/words'
import { fallbackWords } from '../../quest/content'
import { FOES } from '../../fight/foes'
import { FIGHT_STRINGS } from '../../fight/strings'
import type { Look } from '../../shop/catalog'
import type { FightStats, FightSummary } from '../../storage/fight'
import type { FightStyle } from '../../storage/prefs'
import { FoeArt } from './FoeArt'
import { StickFighter } from './StickFighter'
import { FightRun } from './FightRun'

interface Props {
  lang: Lang
  sound: boolean
  stats: FightStats
  fightStyle: FightStyle
  onStyle: (style: FightStyle) => void
  onRunEnd: (run: FightSummary) => void
  look: Look
  ring: string
}

interface Run {
  id: number
  /** Meilleur score au lancement du tournoi. */
  prevBest: number
  /** Adversaire d'un duel, ou absent pour le tournoi complet. */
  foe?: number
  /** Présenter l'adversaire avant le combat (pas pour une revanche). */
  briefing: boolean
  /** Partie de survie (sans fin). */
  endless?: boolean
}

/** Mode Combat : menu avec la galerie des adversaires, puis tournois enchaînés. */
export function Fight({ lang, sound, stats, fightStyle, onStyle, onRunEnd, look, ring }: Props) {
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

  const start = (foe?: number, briefing = true, endless = false) =>
    setRun((r) => ({ id: (r?.id ?? 0) + 1, prevBest: stats.bestScore, foe, briefing, endless }))

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
        fightStyle={fightStyle}
        endless={run.endless}
        bestSurvival={stats.bestSurvival}
        look={look}
        ring={ring}
        onEnd={onRunEnd}
        onAgain={() => start(run.foe, false, run.endless)}
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
      <button type="button" className="btn btn--lg fight-survival-btn" onClick={() => start(undefined, true, true)} disabled={!words}>
        <InfinityIcon className="icon" aria-hidden="true" />
        {t.startSurvival}
      </button>
      <p className="fight-survival-hint">{t.survivalTagline}</p>

      <div className="fight-style" role="group" aria-label={t.styleLabel}>
        <span>{t.styleLabel}</span>
        <div className="segmented">
          {(
            [
              ['stick', t.styleStick],
              ['keys', t.styleKeys],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={fightStyle === id ? 'on' : ''} aria-pressed={fightStyle === id} onClick={() => onStyle(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {(stats.runs > 0 || stats.survivalRuns > 0) && (
        <dl className="result-grid">
          {stats.runs > 0 && (
            <>
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
            </>
          )}
          {stats.survivalRuns > 0 && (
            <div>
              <dt>{t.bestSurvival}</dt>
              <dd>{stats.bestSurvival}</dd>
            </div>
          )}
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
                    {fightStyle === 'stick' ? <StickFighter who={foe.id} pose="idle" facing="left" /> : <FoeArt id={foe.id} mood="idle" />}
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

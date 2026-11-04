import { Swords } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Lang } from '../../content/packs'
import { loadWordList } from '../../content/words'
import { fallbackWords } from '../../quest/content'
import { QUEST_STRINGS } from '../../quest/strings'
import type { QuestStats, RunSummary } from '../../storage/quest'
import { QuestRun } from './QuestRun'

interface Props {
  lang: Lang
  sound: boolean
  stats: QuestStats
  onRunEnd: (run: RunSummary) => void
}

interface Run {
  id: number
  /** Meilleur score au lancement de la partie. */
  prevBest: number
}

/** Mode Quête : menu, puis parties enchaînées. */
export function Quest({ lang, sound, stats, onRunEnd }: Props) {
  const t = QUEST_STRINGS[lang]
  const [words, setWords] = useState<readonly string[] | null>(null)
  const [run, setRun] = useState<Run | null>(null)

  useEffect(() => {
    const abort = new AbortController()
    void loadWordList(lang).then((list) => {
      if (!abort.signal.aborted) setWords(list ?? fallbackWords(lang))
    })
    return () => abort.abort()
  }, [lang])

  const start = () => setRun((r) => ({ id: (r?.id ?? 0) + 1, prevBest: stats.bestScore }))

  if (run && words) {
    return (
      <QuestRun
        key={run.id}
        lang={lang}
        words={words}
        sound={sound}
        t={t}
        prevBest={run.prevBest}
        onEnd={onRunEnd}
        onAgain={start}
        onMenu={() => setRun(null)}
      />
    )
  }

  return (
    <section className="quest-menu">
      <Swords className="icon icon--xl" aria-hidden="true" />
      <h2>{t.title}</h2>
      <p className="quest-tagline">{t.tagline}</p>

      <button type="button" className="btn btn--primary btn--lg" onClick={start} disabled={!words} autoFocus>
        {words ? t.start : t.loading}
      </button>

      {stats.runs > 0 && (
        <dl className="result-grid">
          <div>
            <dt>{t.bestScore}</dt>
            <dd>{stats.bestScore.toLocaleString(lang)}</dd>
          </div>
          <div>
            <dt>{t.bestFloor}</dt>
            <dd>{stats.bestFloor}</dd>
          </div>
          <div>
            <dt>{t.runs}</dt>
            <dd>{stats.runs}</dd>
          </div>
          <div>
            <dt>{t.kills}</dt>
            <dd>{stats.totalKills.toLocaleString(lang)}</dd>
          </div>
        </dl>
      )}

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

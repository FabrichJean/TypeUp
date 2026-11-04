import { useCallback, useEffect, useRef, useState } from 'react'
import { Controls } from './components/Controls'
import { Game } from './components/Game'
import { History } from './components/History'
import { Results, type RoundResult } from './components/Results'
import { loadRoundText, type RoundText } from './content/session-text'
import { getMetrics, type TypingState } from './engine/typing'
import { computeXp, levelInfo } from './engine/xp'
import { STRINGS } from './i18n'
import { playDone } from './sound'
import {
  addSession,
  bestWpm,
  loadStore,
  saveStore,
  type HistoryStore,
  type SessionRecord,
} from './storage/history'
import { loadPrefs, savePrefs, type Prefs, type Theme } from './storage/prefs'
import { ThemeToggle } from './components/ThemeToggle'

type View = 'play' | 'history'
/** `key` identifie la demande (réglages + nonce) qui a produit ce texte. */
type Round = RoundText & { id: number; key: string }

export default function App() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [store, setStore] = useState<HistoryStore>(loadStore)
  const [view, setView] = useState<View>('play')
  const [loaded, setLoaded] = useState<Round | null>(null)
  const [finished, setFinished] = useState<{ roundId: number; data: RoundResult } | null>(null)
  /** Incrémenté pour demander un nouveau texte avec les mêmes réglages. */
  const [nonce, setNonce] = useState(0)

  const t = STRINGS[prefs.lang]
  const storeRef = useRef(store)
  const roundId = useRef(0)

  useEffect(() => {
    savePrefs(prefs)
    const root = document.documentElement
    root.lang = prefs.lang
    // « Auto » : pas d'attribut, la feuille de style suit le réglage du système.
    if (prefs.theme === 'system') delete root.dataset.theme
    else root.dataset.theme = prefs.theme
  }, [prefs])

  const setTheme = useCallback((theme: Theme) => setPrefs((p) => ({ ...p, theme })), [])

  // Nouveau texte à chaque changement de pack / langue / durée / accents, ou sur demande.
  const { packId, lang, duration, strictAccents, level: difficulty } = prefs
  /** La difficulté n'existe que pour le pack « Mots » (elle distingue aussi les records). */
  const levelKey = packId === 'words' ? difficulty : undefined
  const requestKey = `${packId}|${lang}|${duration}|${strictAccents}|${levelKey}|${nonce}`
  useEffect(() => {
    const abort = new AbortController()
    void loadRoundText(packId, lang, duration, { level: difficulty }).then((r) => {
      if (!abort.signal.aborted) setLoaded({ ...r, id: ++roundId.current, key: requestKey })
    })
    return () => abort.abort()
  }, [packId, lang, duration, difficulty, requestKey])

  // Un texte n'est utilisable que s'il correspond aux réglages actuels ; sinon on charge.
  const round = loaded?.key === requestKey ? loaded : null
  const result = finished && round && finished.roundId === round.id ? finished.data : null

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => ({ ...p, ...patch }))
    setView('play')
  }, [])

  const restart = useCallback(() => setNonce((n) => n + 1), [])

  const onFinish = useCallback(
    (final: TypingState, roundIdOfGame: number) => {
      const m = getMetrics(final, final.finishedAt ?? performance.now())
      const prev = storeRef.current
      const xp = computeXp({
        correctChars: m.correctChars,
        accuracy: m.accuracy,
        maxCombo: final.maxCombo,
      })
      const record: SessionRecord = {
        id: crypto.randomUUID(),
        at: Date.now(),
        packId,
        lang,
        level: levelKey,
        duration,
        wpm: m.wpm,
        rawWpm: m.rawWpm,
        accuracy: m.accuracy,
        maxCombo: final.maxCombo,
        xp,
        mistakes: { ...final.mistakes },
      }
      const previousBest = bestWpm(prev, packId, lang, levelKey)
      // Une manche sans aucun caractère juste n'est pas enregistrée.
      const next = m.correctChars > 0 ? addSession(prev, record) : prev
      storeRef.current = next
      setStore(next)
      if (next !== prev) saveStore(next)
      if (prefs.sound) playDone()
      setFinished({
        roundId: roundIdOfGame,
        data: {
          record,
          levelBefore: levelInfo(prev.xp).level,
          levelAfter: levelInfo(next.xp).level,
          isRecord: previousBest > 0 && m.wpm > previousBest,
          totalXp: next.xp,
        },
      })
    },
    [packId, lang, levelKey, duration, prefs.sound],
  )

  const level = levelInfo(store.xp)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            T
          </span>
          <div>
            <h1>TypeUp</h1>
            <p>{t.tagline}</p>
          </div>
        </div>

        <nav className="tabs" aria-label="Navigation">
          <button
            type="button"
            className={view === 'play' ? 'on' : ''}
            aria-current={view === 'play' ? 'page' : undefined}
            onClick={() => setView('play')}
          >
            {t.play}
          </button>
          <button
            type="button"
            className={view === 'history' ? 'on' : ''}
            aria-current={view === 'history' ? 'page' : undefined}
            onClick={() => setView('history')}
          >
            {t.history}
          </button>
        </nav>

        <div className="status">
          <div className="level" title={`${level.into}/${level.needed} XP`}>
            <span className="level-badge">
              {t.level} {level.level}
            </span>
            <span className="xp-bar" aria-hidden="true">
              <span className="xp-fill" style={{ width: `${Math.round(level.progress * 100)}%` }} />
            </span>
          </div>
          <ThemeToggle theme={prefs.theme} t={t} onChange={setTheme} />
          <div className="segmented" role="group" aria-label="Language">
            {(['fr', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                className={prefs.lang === l ? 'on' : ''}
                aria-pressed={prefs.lang === l}
                onClick={() => updatePrefs({ lang: l })}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main>
        {view === 'history' ? (
          <History store={store} lang={prefs.lang} t={t} />
        ) : (
          <>
            <Controls prefs={prefs} t={t} onChange={updatePrefs} />
            {result ? (
              <Results
                result={result}
                t={t}
                onRetry={restart}
                onHistory={() => setView('history')}
              />
            ) : round ? (
              <Game
                key={round.id}
                round={round}
                duration={prefs.duration}
                strictAccents={prefs.strictAccents}
                sound={prefs.sound}
                ghostWpm={bestWpm(store, prefs.packId, prefs.lang, levelKey)}
                t={t}
                onFinish={(final) => onFinish(final, round.id)}
                onRestart={restart}
              />
            ) : (
              <p className="loading" role="status">
                {t.loading}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  )
}

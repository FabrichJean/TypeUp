import { ChartColumn, Castle, Keyboard, ShoppingBag, Swords } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controls } from './components/Controls'
import { Game } from './components/Game'
import { Fight } from './components/fight/Fight'
import { Quest } from './components/quest/Quest'
import { Purse } from './components/shop/Purse'
import { Shop } from './components/shop/Shop'
import { History } from './components/History'
import { Results, type RoundResult } from './components/Results'
import { loadRoundText, type RoundText } from './content/session-text'
import { getMetrics, type TypingState } from './engine/typing'
import { computeXp, levelInfo } from './engine/xp'
import { STRINGS } from './i18n'
import { fightCoins, practiceCoins, questCoins } from './shop/coins'
import { lookOf, type ItemId } from './shop/catalog'
import { SHOP_STRINGS } from './shop/strings'
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
import {
  loadFightStats,
  recordDuel,
  recordSurvival,
  recordTournament,
  saveFightStats,
  type FightStats,
  type FightSummary,
} from './storage/fight'
import { buy, earn, equip, loadWallet, saveWallet, type Wallet } from './storage/wallet'
import { loadQuestStats, recordRun, saveQuestStats, type QuestStats, type RunSummary } from './storage/quest'
import { ThemeToggle } from './components/ThemeToggle'

type View = 'play' | 'quest' | 'fight' | 'shop' | 'history'
/** `key` identifie la demande (réglages + nonce) qui a produit ce texte. */
type Round = RoundText & { id: number; key: string }

export default function App() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [store, setStore] = useState<HistoryStore>(loadStore)
  const [questStats, setQuestStats] = useState<QuestStats>(loadQuestStats)
  const [fightStats, setFightStats] = useState<FightStats>(loadFightStats)
  const [wallet, setWallet] = useState<Wallet>(loadWallet)
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
    // Depuis l'historique, un changement de réglage ramène à l'entraînement ; la Quête reste affichée.
    setView((v) => (v === 'history' ? 'play' : v))
  }, [])

  const restart = useCallback(() => setNonce((n) => n + 1), [])

  /** Crédite des pièces et sauvegarde le portefeuille. */
  const pay = useCallback((amount: number) => {
    if (amount <= 0) return
    setWallet((w) => {
      const next = earn(w, amount)
      saveWallet(next)
      return next
    })
  }, [])

  const onBuy = useCallback((id: ItemId) => {
    setWallet((w) => {
      const next = buy(w, id)
      if (next !== w) saveWallet(next)
      return next
    })
  }, [])

  const onEquip = useCallback((id: ItemId) => {
    setWallet((w) => {
      const next = equip(w, id)
      if (next !== w) saveWallet(next)
      return next
    })
  }, [])

  const onFightEnd = useCallback(
    (run: FightSummary) => {
      setFightStats((prev) => {
        const next = run.endless
          ? recordSurvival(prev, run)
          : run.duelFoe
            ? recordDuel(prev, run.duelFoe, run)
            : recordTournament(prev, run)
        saveFightStats(next)
        return next
      })
      pay(fightCoins(run))
    },
    [pay],
  )

  const onQuestEnd = useCallback(
    (run: RunSummary) => {
      setQuestStats((prev) => {
        const next = recordRun(prev, run)
        saveQuestStats(next)
        return next
      })
      pay(questCoins(run))
    },
    [pay],
  )

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
      if (m.correctChars > 0) pay(practiceCoins(xp))
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
    [packId, lang, levelKey, duration, prefs.sound, pay],
  )

  const level = levelInfo(store.xp)
  const shopText = SHOP_STRINGS[prefs.lang]
  const look = lookOf(wallet.equipped)

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
          {(
            [
              ['play', t.practice, Keyboard],
              ['quest', t.quest, Castle],
              ['fight', t.fight, Swords],
              ['shop', shopText.tab, ShoppingBag],
              ['history', t.history, ChartColumn],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              className={view === id ? 'on tab-with-icon' : 'tab-with-icon'}
              aria-current={view === id ? 'page' : undefined}
              aria-label={label}
              onClick={() => setView(id)}
            >
              <Icon className="icon" aria-hidden="true" />
              <span className="tab-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="status">
          <Purse coins={wallet.coins} label={shopText.coins} onClick={() => setView('shop')} />
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
        {view === 'fight' ? (
          <Fight
            key={prefs.lang}
            lang={prefs.lang}
            sound={prefs.sound}
            stats={fightStats}
            fightStyle={prefs.fightStyle}
            onStyle={(fightStyle) => updatePrefs({ fightStyle })}
            onRunEnd={onFightEnd}
            look={look}
            ring={wallet.equipped.ring}
          />
        ) : view === 'shop' ? (
          <Shop key={prefs.lang} lang={prefs.lang} wallet={wallet} onBuy={onBuy} onEquip={onEquip} />
        ) : view === 'quest' ? (
          <Quest
            key={prefs.lang}
            lang={prefs.lang}
            sound={prefs.sound}
            stats={questStats}
            onRunEnd={onQuestEnd}
          />
        ) : view === 'history' ? (
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

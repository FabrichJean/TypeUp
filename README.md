# TypeUp

Entraînement à la frappe sur de **vrais textes**, en français et en anglais, avec combo, XP, niveaux, mascotte et « fantôme » à la vitesse de ton record.

## Contenu : quasi illimité, pas en dur

| Pack | D'où vient le texte |
|---|---|
| **Mots** | 20 000 mots par langue, classés par fréquence (`public/words/`), tirés au hasard selon la difficulté : Facile (500 mots les plus courants), Moyen (3 000), Difficile (rangs 3 000 à 20 000). Marche hors-ligne. |
| **Wikipédia** | Articles au hasard (API REST Wikipédia). |
| **Ce jour-là** | Événements historiques du jour (API « on this day » de Wikipédia). |
| **Blagues** | JokeAPI, mode sans contenu sensible, FR et EN. |
| **Poèmes** | PoetryDB en anglais (domaine public). En français : quelques poèmes écrits à la main. |
| Virelangues, Faits insolites, Proverbes, Code | Petits packs écrits à la main (`src/content/packs.ts`). |

Quand une source en ligne est injoignable, le pack retombe sur ses passages locaux et l'indique à l'écran. Une source qui renvoie trop peu de texte est ré-interrogée (3 appels au plus, sans doublons).

Les listes de mots viennent de [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (Hermit Dave, issues d'OpenSubtitles), sous licence **CC BY-SA 4.0** : voir `public/words/ATTRIBUTION.md`. Elles sont filtrées au mieux contre les mots vulgaires, mais une liste issue de sous-titres peut encore contenir des noms propres ou des mots crus. Pour les régénérer : `node scripts/build-words.mjs <fr|en> <fichier_source.txt>`.

## Mode Quête (roguelike de frappe)

Deuxième mode, à côté de l'entraînement (onglet **Quête**). Le but : survivre le plus d'étages possible.

- Des mots (tirés de la liste de fréquence) avancent vers la mascotte. La 1re lettre verrouille un mot, on le finit pour l'abattre ; Retour arrière change de cible. Un mot qui touche la mascotte coûte une vie.
- Une erreur casse le combo (x2… x8, comme l'entraînement) et fait avancer tous les ennemis.
- Tous les 3 étages, un **boss** : un vrai texte (Wikipédia, anecdotes, poèmes…) à taper en entier. Sa jauge de colère monte avec le temps et baisse à chaque caractère juste ; pleine, il frappe.
- Après chaque étage, on choisit 1 relique parmi 3 (bouclier, cœur, armure, sablier, aimant à combo, mots dorés, nova, vampire, givre). Elles se cumulent.
- Pause avec Échap (ou en quittant l'onglet). Score, étage max et nombre de parties sont gardés dans `typeup.quest`, séparément de l'historique d'entraînement : la Quête ne touche ni à l'XP ni aux records de l'entraînement.
- Moteur pur et testé (`src/quest/engine.ts`, temps et hasard injectés). Réglages d'équilibrage : `src/quest/engine.ts` (vitesse, vagues, boss) et `src/quest/relics.ts` (reliques).

## Mode Combat : Key Fighter (le tournoi des touches)

Troisième mode (onglet **Combat**) : un jeu de combat où l'on se bat en tapant. Les adversaires sont des touches du clavier, et le sol de l'arène est un clavier géant dont les touches s'allument quand on tape.

- **Attaquer** : tu as 3 coups en main (Pointe, Crochet, Capitale). Taper un mot le lance ; plus il est long, plus il frappe fort. Enchaîner sans faute gonfle les dégâts (série).
- **Parer** : chaque attaque ennemie est annoncée par un mot rouge avec un compte à rebours. Le taper à temps pare : l'ennemi est étourdi (+50 % de dégâts) et reçoit une contre-attaque. Un coup encaissé, ou une erreur, te fige un instant. Il n'y a qu'une seule saisie : il faut choisir entre attaquer et parer.
- **Feintes** : une attaque à bord pointillé est une fausse attaque. La parer est une erreur ; la laisser passer ouvre la garde adverse.
- **Coup spécial** : la jauge pleine, Entrée fige l'ennemi et lance une vraie phrase (proverbe, anecdote…) à taper ; chaque bon caractère frappe, un sans-faute fait un gros bonus.
- **Six adversaires**, chacun avec sa ruse : Espace (échauffement), Maj (mots à l'envers), Verr. Maj (feintes), Échap (mots qui s'effacent), Retour arrière (anagrammes, ses coups vident la jauge) et Ctrl+Alt+Suppr (tout à la fois, deux attaques simultanées).
- **Choisir son adversaire** : dans le menu, un clic sur un adversaire lance un **duel** contre lui seul (victoire au premier K.O.). Le gros bouton lance le tournoi complet. Les victoires en duel sont comptées à part (`duelWins`) et ne touchent pas aux records du tournoi.
- **Briefing animé** avant chaque duel, au début du tournoi et avant chaque nouvel adversaire : une mini-scène en boucle montre comment parer sa ruse (mot à l'envers, anagramme, lettres qui s'effacent, feinte), comment frapper ensuite et ce qui arrive si on est trop lent. Entrée lance le combat. Les scènes sont définies dans `src/fight/demo.ts` (chronologie pure et testée). Une revanche saute le briefing.
- Entre deux combats : un peu de vie récupérée et 1 technique parmi 3 (réflexes, poings d'acier, concentration, contre-attaque, vitalité, peau dure, infirmerie).
- Score, meilleurs résultats et parades sont gardés dans `typeup.fight`, séparément des autres modes.
- Moteur pur et testé, y compris des tournois simulés (`src/fight/engine.ts`). Les adversaires et techniques se règlent dans `src/fight/foes.ts` (vie, cadence, durée des préparations, ruses).

## Lancer

```bash
npm install --include=dev   # --include=dev utile si NODE_ENV=production est défini dans ton shell
npm run dev                 # http://localhost:5173
npm test                    # tests unitaires (Vitest)
npm run build               # typecheck + build de production
```

## Fonctionnement

- Le chrono (15 / 30 / 60 s) démarre à la première frappe. Tab ou Échap : nouveau texte.
- WPM net = (caractères justes / 5) / minutes. Précision = frappes justes / frappes totales (une faute corrigée compte quand même).
- Combo : +1 palier (x2, x3… jusqu'à x8) tous les 10 caractères justes d'affilée ; une erreur le casse.
- XP = caractères justes × précision² × (1 + combo max / 100). Le niveau L commence à 50·L·(L−1) XP.
- « Accents stricts » : désactivé, « e » est accepté à la place de « é ». Les ligatures (œ, æ) sont toujours écrites « oe », « ae ».
- Historique, XP et préférences sont stockés dans le `localStorage` du navigateur (rien n'est envoyé à un serveur).

## Structure

```
src/engine/    moteur de frappe pur (typing.ts) et XP (xp.ts)
src/content/   packs, listes de mots (words.ts), sources en ligne (sources.ts), normalisation, assemblage d'une manche
scripts/       build-words.mjs : prépare les listes de mots
public/words/  fr.json, en.json (générés) et leur attribution
src/storage/   historique/XP et préférences (localStorage, versionné)
src/hooks/     useTypingTest : chrono + saisie
src/quest/     mode Quête : moteur (engine.ts), reliques, contenu (mots, boss), textes
src/fight/     mode Combat : moteur (engine.ts), adversaires et techniques (foes.ts), contenu, textes
src/components/ Game, TypingArea, Results, History, Controls, Mascot, ComboMeter, quest/ (Quest, QuestRun), fight/ (Fight, FightRun, FoeArt, KeyboardFloor)
```

Les tests sont à côté du code (`*.test.ts`).

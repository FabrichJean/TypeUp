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
src/components/ Game, TypingArea, Results, History, Controls, Mascot, ComboMeter, quest/ (Quest, QuestRun)
```

Les tests sont à côté du code (`*.test.ts`).

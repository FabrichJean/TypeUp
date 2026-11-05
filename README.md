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

- **Attaquer** : tu as 3 coups en main (Pointe, Crochet, Capitale). **Chaque lettre juste est déjà un petit coup** (40 % des dégâts du mot, versés lettre par lettre : poing qui part, adversaire qui tressaille, « -1 » et petit son) ; le mot entier porte le coup final avec le reste. Le total d'un mot ne change pas, et annuler un mot garde les dégâts déjà portés sans jamais les compter deux fois. Plus le mot est long, plus il frappe fort. Enchaîner sans faute gonfle les dégâts (série).
- **Parer** : chaque attaque ennemie est annoncée par un mot rouge avec un compte à rebours. Le taper à temps pare : l'ennemi est étourdi (+50 % de dégâts) et reçoit une contre-attaque. Un coup encaissé, ou une erreur, te fige un instant. Il n'y a qu'une seule saisie : il faut choisir entre attaquer et parer.
- **Feintes** : une attaque à bord pointillé est une fausse attaque. La parer est une erreur ; la laisser passer ouvre la garde adverse.
- **Coup spécial** : la jauge pleine, Entrée fige l'ennemi et lance une vraie phrase (proverbe, anecdote…) à taper ; chaque bon caractère frappe, un sans-faute fait un gros bonus.
- **Six adversaires**, chacun avec sa ruse : Espace (échauffement), Maj (mots à l'envers), Verr. Maj (feintes), Échap (mots qui s'effacent), Retour arrière (anagrammes, ses coups vident la jauge) et Ctrl+Alt+Suppr (tout à la fois, deux attaques simultanées).
- **Deux styles** (choix dans le menu, mémorisé) : **Stickmen** (par défaut) ou **Touches**. Les stickmen sont des squelettes articulés en SVG (bassin, torse effilé, tête, bras et jambes à deux segments, gants, chaussures) animés par 21 poses (`src/fight/poses.ts`) : deux appuis de garde qui alternent (jeu de jambes), direct, croisé, crochet, uppercut, coup de pied de face, coup de pied circulaire haut, coup sauté, parade, touché au visage, plié par un coup au ventre, projeté en arrière, étourdi, K.O. à la renverse, deux gestes de victoire, posture du cavalier pour le coup spécial. Chaque pose règle aussi le décalage du corps (pas, fente, recul) et sa rotation (saut) ; le bassin s'abaisse tout seul pour que le pied le plus bas touche le sol (`groundDrop`). Les gestes varient avec la série (direct / croisé, crochet / uppercut, coup de pied de face / circulaire, et un coup sauté à partir de 6 d'affilée), un coup de pied se replie après son extension, et les coups laissent des traînées de vitesse. Chaque adversaire a sa propre attaque (Espace : coup de pied de face, Maj : crochet, Verr. Maj : croisé, Échap : coup de pied circulaire, Retour arrière : uppercut, Ctrl+Alt+Suppr : coup sauté) et réagit selon le coup reçu. Les élans sont proportionnels à la taille des stickmen : le poing ou le pied arrive toujours sur le corps adverse, sur mobile aussi. Le dessin est dans `src/components/fight/StickFighter.tsx`, les chapeaux dans `Hats.tsx`, le ring dans `styles.css`. Le moteur de jeu est identique dans les deux styles.
- **Choisir son adversaire** : dans le menu, un clic sur un adversaire lance un **duel** contre lui seul (victoire au premier K.O.). Le gros bouton lance le tournoi complet. Les victoires en duel sont comptées à part (`duelWins`) et ne touchent pas aux records du tournoi.
- **Briefing animé** avant chaque duel, au début du tournoi et avant chaque nouvel adversaire : une mini-scène en boucle montre comment parer sa ruse (mot à l'envers, anagramme, lettres qui s'effacent, feinte), comment frapper ensuite et ce qui arrive si on est trop lent. Entrée lance le combat. Les scènes sont définies dans `src/fight/demo.ts` (chronologie pure et testée). Une revanche saute le briefing.
- Entre deux combats : un peu de vie récupérée et 1 technique parmi 3 (réflexes, poings d'acier, concentration, contre-attaque, vitalité, peau dure, infirmerie).
- **Mode Survie** (bouton sous le tournoi) : les six adversaires reviennent en boucle, sans fin. Le premier tour est celui du tournoi ; chaque tour suivant gonfle leur vie et leurs dégâts, accélère leurs attaques, ajoute feintes et coups lourds, et à partir du tour 3 une attaque simultanée de plus (avec des plafonds : la difficulté reste jouable). Venir à bout du dernier adversaire d'un tour soigne 60 % (au lieu de 25 %), et la présentation n'est montrée qu'au premier tour. Le record (adversaires battus d'affilée) est gardé à part de ceux du tournoi ; dépasser son record déclenche l'annonce « NOUVEAU RECORD ! ». La montée en difficulté est dans `foeAt` (`src/fight/foes.ts`).
- **Sensations de frappe** (`src/fight/juice.ts`, fonction pure testée, appliquée par `src/components/fight/juiceFx.ts`) : arrêt sur image sur les gros coups, les parades et les coups reçus, secousse d'écran graduée, flash (blanc, or, rouge), traits de vitesse, gros « boum » sonore, ralenti au K.O., annonceur aux paliers de série (4, 8, 12, 16…) et foule qui s'agite avec la série et applaudit. Rien de tout cela ne touche au moteur de jeu ; tout est coupé avec `prefers-reduced-motion`.
- Score, meilleurs résultats et parades sont gardés dans `typeup.fight`, séparément des autres modes.
- Moteur pur et testé, y compris des tournois simulés (`src/fight/engine.ts`). Les adversaires et techniques se règlent dans `src/fight/foes.ts` (vie, cadence, durée des préparations, ruses).

## Boutique et pièces

Onglet **Boutique** : les pièces gagnées dans tous les modes servent à habiller le stickman du Combat. Les gains (`src/shop/coins.ts`, fonctions pures) : tournoi 15 par adversaire battu + 120 de prime de champion, duel 20 si gagné, survie 12 par adversaire + 40 par tour complet, quête 5 par étage, entraînement 1 pièce pour 12 XP. Le catalogue (`src/shop/catalog.ts`) compte 24 objets : 9 couvre-chefs (bandeau offert, ninja, casquette, oreilles de chat, cornes, haut-de-forme, auréole, couronne), 9 couleurs (dont Or et un Prisme arc-en-ciel animé) et 6 décors de ring (Néon, Coucher de soleil, Dojo, Espace, Volcan). On essaie un objet sur le stickman avant de l'acheter. Le portefeuille est dans `typeup.wallet` (versionné ; une donnée abîmée est nettoyée plutôt que perdue).

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
src/fight/     mode Combat : moteur (engine.ts), adversaires et techniques (foes.ts), sensations (juice.ts), contenu, textes
src/shop/      boutique : catalogue, gains de pièces, textes (portefeuille dans src/storage/wallet.ts)
src/components/ Game, TypingArea, Results, History, Controls, Mascot, ComboMeter, quest/ (Quest, QuestRun), fight/ (Fight, FightRun, FoeArt, KeyboardFloor)
```

Les tests sont à côté du code (`*.test.ts`).

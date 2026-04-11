# Listes de mots (fr.json, en.json)

Dérivées de **FrequencyWords** par Hermit Dave
(https://github.com/hermitdave/FrequencyWords, fichiers `content/2018/{fr,en}/*_50k.txt`),
elles-mêmes construites à partir du corpus de sous-titres **OpenSubtitles**.

Licence du contenu : **CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/).
Ces fichiers JSON sont une adaptation (filtrage, normalisation, 20 000 mots les plus fréquents,
mots vulgaires écartés au mieux) : ils sont donc redistribués sous la même licence, CC BY-SA 4.0.

Régénération : `node scripts/build-words.mjs <fr|en> <fichier_source.txt>`.

#!/usr/bin/env node
/**
 * Nettoie une liste de fréquence « mot nombre » (FrequencyWords, hermitdave) et écrit
 * public/words/<lang>.json : un tableau de mots tapables, du plus fréquent au plus rare.
 *
 *   node scripts/build-words.mjs <fr|en> <fichier_source.txt> [nombre_max]
 *
 * Source des données : https://github.com/hermitdave/FrequencyWords (CC-BY-SA-4.0),
 * dérivée de OpenSubtitles. Voir public/words/ATTRIBUTION.md.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [lang, input, maxArg] = process.argv.slice(2)
if (!['fr', 'en'].includes(lang) || !input) {
  console.error('Usage: node scripts/build-words.mjs <fr|en> <fichier_source.txt> [nombre_max]')
  process.exit(1)
}
const MAX = Number(maxArg ?? 20000)
const MIN_LEN = 2
const MAX_LEN = 14

/**
 * Mots vulgaires ou injurieux écartés (au mieux : une liste de fréquence issue de sous-titres
 * en contient beaucoup). Comparaison exacte, plus préfixes ci-dessous.
 */
const BLOCK = {
  fr: ['putain', 'merde', 'salope', 'connard', 'connasse', 'con', 'cons', 'conne', 'bite', 'couilles',
    'cul', 'chier', 'chiant', 'foutre', 'nique', 'niquer', 'pute', 'bordel', 'salaud', 'pd', 'pédé',
    'nègre', 'négro', 'bougnoule', 'enculé', 'enculer', 'branler', 'branleur', 'baiser', 'baise',
    'bâtard', 'batard', 'garce', 'crétin', 'enfoiré'],
  en: ['fuck', 'fucking', 'fucked', 'fucker', 'shit', 'shitty', 'bitch', 'bastard', 'asshole', 'ass',
    'dick', 'cock', 'pussy', 'cunt', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'fag', 'retard',
    'bullshit', 'motherfucker', 'dumbass', 'jackass', 'prick', 'tits', 'boobs', 'horny', 'sex'],
}
const BLOCK_PREFIX = { fr: ['encul', 'foutr', 'pétasse'], en: ['fuck', 'nigg', 'bitch', 'shit'] }
const blocked = new Set(BLOCK[lang])

// Lettres latines (accents inclus), avec au plus une apostrophe interne (« c'est », « don't »).
const WORD = /^\p{Script=Latin}+(?:'\p{Script=Latin}+)?$/u

const seen = new Set()
const words = []
for (const line of readFileSync(resolve(input), 'utf8').split('\n')) {
  const token = line.trim().split(/\s+/)[0]?.toLowerCase().replace(/’/g, "'")
  if (!token || token.length < MIN_LEN || token.length > MAX_LEN) continue
  if (!WORD.test(token) || /(.)\1\1/u.test(token)) continue
  if (blocked.has(token) || BLOCK_PREFIX[lang].some((p) => token.startsWith(p))) continue
  if (seen.has(token)) continue
  seen.add(token)
  words.push(token)
  if (words.length >= MAX) break
}

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'words')
mkdirSync(outDir, { recursive: true })
const outFile = resolve(outDir, `${lang}.json`)
writeFileSync(outFile, JSON.stringify(words))
console.log(`${lang}: ${words.length} mots -> ${outFile}`)
console.log('  début :', words.slice(0, 12).join(' '))
console.log('  ~3000 :', words.slice(3000, 3012).join(' '))
console.log('  fin   :', words.slice(-12).join(' '))

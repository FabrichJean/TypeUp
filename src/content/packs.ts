import { normalizeText } from './normalize'

export type Lang = 'fr' | 'en'

export type PackId =
  | 'words'
  | 'wiki'
  | 'onthisday'
  | 'jokes'
  | 'poems'
  | 'twisters'
  | 'facts'
  | 'proverbs'
  | 'code'

/** Sources en ligne (voir sources.ts). */
export type SourceId = 'wikipedia' | 'onthisday' | 'jokes' | 'poetry'

export interface Pack {
  id: PackId
  emoji: string
  label: Record<Lang, string>
  blurb: Record<Lang, string>
  /**
   * Passages écrits à la main. Pack classique : c'est son contenu.
   * Pack en ligne : repli hors-ligne (ou contenu tout court dans une langue sans source).
   */
  texts: Record<Lang, readonly string[]>
  /** Pack de mots tirés d'une grande liste de fréquence (voir words.ts) : illimité. */
  words?: boolean
  /** Source en ligne par langue (une langue absente utilise `texts`). */
  sources?: Partial<Record<Lang, SourceId>>
}

const CODE: readonly string[] = [
  'const doubled = [1, 2, 3].map((n) => n * 2);',
  'for (let i = 0; i < 10; i++) { console.log(i); }',
  'git commit -m "fix: typo" && git push origin main',
  'def fib(n): return n if n < 2 else fib(n - 1) + fib(n - 2)',
  'SELECT name, COUNT(*) FROM users GROUP BY name ORDER BY 2 DESC;',
  'docker run -it --rm -p 3000:3000 node:20 bash',
  'const res = await fetch("/api/items"); const data = await res.json();',
  'if (!user) { throw new Error("User not found"); }',
  'ls -la | grep ".ts" | wc -l',
  'npm install --save-dev vitest && npm test',
]

const FACTS_FR: readonly string[] = [
  'Le miel ne se périme pas : on a retrouvé dans des tombes égyptiennes des pots vieux de plusieurs milliers d\'années, encore comestibles.',
  'Les pieuvres ont trois cœurs et leur sang est bleu.',
  'Sur Vénus, un jour dure plus longtemps qu\'une année : la planète tourne sur elle-même plus lentement qu\'elle ne fait le tour du Soleil.',
  'Botaniquement, la banane est une baie, alors que la fraise n\'en est pas une.',
  'Les wombats produisent des crottes en forme de cubes, ce qui les empêche de rouler.',
  'Il y a bien plus d\'arbres sur Terre que d\'étoiles dans la Voie lactée.',
  'Les loutres de mer se tiennent parfois la patte pendant leur sommeil pour ne pas s\'éloigner les unes des autres.',
  'La tour Eiffel grandit de quelques centimètres en été, car le métal se dilate avec la chaleur.',
]

const FACTS_EN: readonly string[] = [
  'Honey never spoils: jars found in ancient Egyptian tombs were still edible after thousands of years.',
  'An octopus has three hearts and blue blood.',
  'A day on Venus is longer than its year, because the planet spins more slowly than it orbits the Sun.',
  'Botanically, a banana is a berry, while a strawberry is not.',
  'Wombats produce cube-shaped droppings, which keeps them from rolling away.',
  'There are more trees on Earth than stars in the Milky Way.',
  'Sea otters sometimes hold hands while they sleep so they do not drift apart.',
  'The Eiffel Tower grows a few centimeters taller in summer because the iron expands in the heat.',
]

/** Ordre d'affichage : d'abord les packs illimités / en ligne, puis les packs classiques. */
export const PACKS: readonly Pack[] = [
  {
    id: 'words',
    emoji: '⌨️',
    label: { fr: 'Mots', en: 'Words' },
    blurb: { fr: '20 000 mots, du courant au rare', en: '20,000 words, common to rare' },
    texts: { fr: [], en: [] },
    words: true,
  },
  {
    id: 'wiki',
    emoji: '🌍',
    label: { fr: 'Wikipédia', en: 'Wikipedia' },
    blurb: { fr: 'Un article au hasard, en direct', en: 'A random article, live' },
    texts: { fr: FACTS_FR, en: FACTS_EN },
    sources: { fr: 'wikipedia', en: 'wikipedia' },
  },
  {
    id: 'onthisday',
    emoji: '📅',
    label: { fr: 'Ce jour-là', en: 'On this day' },
    blurb: { fr: 'L\'histoire du jour, en direct', en: 'Today in history, live' },
    texts: { fr: FACTS_FR, en: FACTS_EN },
    sources: { fr: 'onthisday', en: 'onthisday' },
  },
  {
    id: 'jokes',
    emoji: '😂',
    label: { fr: 'Blagues', en: 'Jokes' },
    blurb: { fr: 'Ne ris pas, tape', en: 'Don\'t laugh, type' },
    sources: { fr: 'jokes', en: 'jokes' },
    texts: {
      fr: [
        'Pourquoi les plongeurs plongent-ils toujours en arrière et jamais en avant ? Parce que sinon ils tomberaient dans le bateau.',
        'Que fait une fraise sur un cheval ? Tagada, tagada, tagada !',
        'Quel est le comble pour un électricien ? De ne pas être au courant.',
        'Pourquoi les développeurs confondent-ils Halloween et Noël ? Parce que 31 octobre égale 25 décembre.',
        'Un homme entre dans une bibliothèque et demande un steak frites. Le bibliothécaire répond : ici, c\'est une bibliothèque ! Alors l\'homme chuchote : un steak frites, s\'il vous plaît.',
        'Quelle est la différence entre un pigeon ? Aucune, les deux pattes sont pareilles, surtout la gauche.',
      ],
      en: [
        'Why do programmers prefer dark mode? Because light attracts bugs.',
        'Why don\'t scientists trust atoms? Because they make up everything.',
        'What do you call a fake noodle? An impasta.',
        'I would tell you a UDP joke, but you might not get it.',
        'Why was the math book sad? It had too many problems.',
        'There are only 10 kinds of people in the world: those who understand binary and those who don\'t.',
      ],
    },
  },
  {
    id: 'poems',
    emoji: '🪶',
    label: { fr: 'Poèmes', en: 'Poems' },
    blurb: {
      fr: 'Domaine public (en ligne en anglais)',
      en: 'Public domain (live in English)',
    },
    sources: { en: 'poetry' },
    texts: {
      fr: [
        'Les sanglots longs des violons de l\'automne blessent mon cœur d\'une langueur monotone.',
        'Demain, dès l\'aube, à l\'heure où blanchit la campagne, je partirai. Vois-tu, je sais que tu m\'attends.',
        'Là, tout n\'est qu\'ordre et beauté, luxe, calme et volupté.',
        'Je m\'en allais, les poings dans mes poches crevées ; mon paletot aussi devenait idéal.',
        'Sous le pont Mirabeau coule la Seine, et nos amours, faut-il qu\'il m\'en souvienne ?',
      ],
      en: [
        'Hope is the thing with feathers that perches in the soul, and sings the tune without the words, and never stops at all.',
        'Once upon a midnight dreary, while I pondered, weak and weary, over many a quaint and curious volume of forgotten lore.',
        'All the world\'s a stage, and all the men and women merely players; they have their exits and their entrances.',
        'Whose woods these are I think I know. His house is in the village though.',
        'I celebrate myself, and sing myself, and what I assume you shall assume.',
        'I wandered lonely as a cloud that floats on high o\'er vales and hills.',
      ],
    },
  },
  {
    id: 'twisters',
    emoji: '🌀',
    label: { fr: 'Virelangues', en: 'Tongue twisters' },
    blurb: { fr: 'Ça fait trébucher les doigts', en: 'Trips up your fingers' },
    texts: {
      fr: [
        'Les chaussettes de l\'archiduchesse sont-elles sèches, archi-sèches ?',
        'Un chasseur sachant chasser doit savoir chasser sans son chien.',
        'Si six scies scient six cyprès, six cent six scies scient six cent six cyprès.',
        'Gros gras grain d\'orge, quand te dégrogragraindorgeriseras-tu ? Je me dégrogragraindorgeriserai quand tous les gros gras grains d\'orge se seront dégrogragraindorgerisés.',
        'Tonton, ton thé t\'a-t-il ôté ta toux ?',
        'Trois tortues trottaient sur un trottoir très étroit.',
        'Les poules du couvent couvent.',
        'Didon dîna, dit-on, du dos d\'un dodu dindon.',
        'Cinq chiens chassent six chats.',
        'Ces six saucissons-ci sont si secs qu\'on ne sait si c\'en sont.',
      ],
      en: [
        'She sells seashells by the seashore, and the shells she sells are surely seashells.',
        'Peter Piper picked a peck of pickled peppers. How many pickled peppers did Peter Piper pick?',
        'How much wood would a woodchuck chuck if a woodchuck could chuck wood?',
        'Fuzzy Wuzzy was a bear. Fuzzy Wuzzy had no hair. Fuzzy Wuzzy was not very fuzzy, was he?',
        'Betty Botter bought some butter, but she said the butter is bitter.',
        'I scream, you scream, we all scream for ice cream.',
        'Red lorry, yellow lorry, red lorry, yellow lorry.',
        'Unique New York, you know you need unique New York.',
        'Six slippery snails slid slowly seaward.',
        'A proper copper coffee pot.',
      ],
    },
  },
  {
    id: 'facts',
    emoji: '🧠',
    label: { fr: 'Faits insolites', en: 'Weird facts' },
    blurb: { fr: 'Apprends en tapant', en: 'Learn while you type' },
    texts: { fr: FACTS_FR, en: FACTS_EN },
  },
  {
    id: 'proverbs',
    emoji: '📜',
    label: { fr: 'Proverbes', en: 'Proverbs' },
    blurb: { fr: 'La sagesse des anciens', en: 'Old wisdom' },
    texts: {
      fr: [
        'Petit à petit, l\'oiseau fait son nid.',
        'Rien ne sert de courir ; il faut partir à point.',
        'Pierre qui roule n\'amasse pas mousse.',
        'C\'est en forgeant qu\'on devient forgeron.',
        'Tout vient à point à qui sait attendre.',
        'La raison du plus fort est toujours la meilleure.',
      ],
      en: [
        'A journey of a thousand miles begins with a single step.',
        'The early bird catches the worm.',
        'Practice makes perfect.',
        'Rome was not built in a day.',
        'Actions speak louder than words.',
        'Fortune favors the bold.',
      ],
    },
  },
  {
    id: 'code',
    emoji: '💻',
    label: { fr: 'Code', en: 'Code' },
    blurb: { fr: 'Accolades, guillemets et tirets', en: 'Braces, quotes and dashes' },
    texts: { fr: CODE, en: CODE },
  },
]

export function getPack(id: string): Pack | undefined {
  return PACKS.find((p) => p.id === id)
}

export function isPackId(id: unknown): id is PackId {
  return typeof id === 'string' && PACKS.some((p) => p.id === id)
}

export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Assemble des passages (dans un ordre aléatoire, normalisés) jusqu'à atteindre
 * `minChars` caractères. Les passages sont rejoués si la réserve est épuisée.
 */
export function buildText(
  texts: readonly string[],
  minChars: number,
  rng: () => number = Math.random,
): string {
  const passages = texts.map(normalizeText).filter((t) => t.length > 0)
  if (passages.length === 0) throw new Error('buildText: aucun passage disponible')
  let pool = shuffle(passages, rng)
  let i = 0
  let out = ''
  while (out.length < minChars) {
    if (i >= pool.length) {
      pool = shuffle(passages, rng)
      i = 0
    }
    out += (out ? ' ' : '') + pool[i++]
  }
  return out
}

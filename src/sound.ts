/** Petits bips WebAudio, sans fichier audio. Silencieux si l'API est indisponible. */

let ctx: AudioContext | null = null

function tone(freq: number, ms: number, type: OscillatorType, volume: number): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const end = ctx.currentTime + ms / 1000
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(end)
  } catch {
    // pas d'audio : tant pis
  }
}

export function playError(): void {
  tone(150, 160, 'sawtooth', 0.12)
}

export function playCombo(multiplier: number): void {
  tone(420 + multiplier * 70, 180, 'triangle', 0.18)
}

export function playDone(): void {
  tone(660, 140, 'triangle', 0.18)
  setTimeout(() => tone(880, 240, 'triangle', 0.18), 120)
}

/** Petit « clic » à chaque caractère juste. */
export function playKey(): void {
  tone(1100, 35, 'square', 0.04)
}

/** Aperçu quand on active l'option (et déverrouille l'audio du navigateur). */
export function playPreview(): void {
  playDone()
}

/** Un mot abattu : plus le combo est haut, plus la note monte (gamme pentatonique). */
const SCALE = [0, 2, 4, 7, 9]
export function playKill(multiplier: number): void {
  const step = Math.min(multiplier - 1, 9)
  const semis = SCALE[step % SCALE.length] + 12 * Math.floor(step / SCALE.length)
  tone(523 * 2 ** (semis / 12), 150, 'triangle', 0.16)
}

/** Un ennemi te touche. */
export function playHurt(): void {
  tone(110, 280, 'sawtooth', 0.2)
  setTimeout(() => tone(82, 260, 'square', 0.1), 60)
}

/** Fin de partie. */
export function playOver(): void {
  tone(330, 220, 'triangle', 0.18)
  setTimeout(() => tone(247, 260, 'triangle', 0.18), 220)
  setTimeout(() => tone(165, 480, 'triangle', 0.18), 480)
}

/** Parade : deux notes métalliques. */
export function playParry(): void {
  tone(1320, 90, 'square', 0.09)
  setTimeout(() => tone(1760, 160, 'triangle', 0.14), 60)
}

/** Coup spécial : un balayage montant. */
export function playSuper(): void {
  for (let i = 0; i < 6; i++) setTimeout(() => tone(330 * 2 ** (i / 4), 120, 'sawtooth', 0.08), i * 70)
}

/** K.O. : un grave qui s'effondre. */
export function playKO(): void {
  tone(220, 300, 'sawtooth', 0.18)
  setTimeout(() => tone(110, 600, 'square', 0.12), 200)
}

/** Une lettre qui porte : petit coup sec, un peu plus aigu quand la série monte. */
export function playTap(chain: number): void {
  tone(200 + Math.min(chain, 12) * 18, 50, 'square', 0.1)
}

/** Gros impact : un grave qui chute, avec un claquement. */
export function playThump(): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.22)
    gain.gain.setValueAtTime(0.32, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.27)
  } catch {
    // pas d'audio : tant pis
  }
}

/** Foule : un souffle de bruit filtré qui monte puis retombe (1 = applaudissements, 2 = ovation). */
export function playCheer(level: 1 | 2): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const seconds = level === 2 ? 1.1 : 0.55
    const length = Math.floor(ctx.sampleRate * seconds)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = level === 2 ? 1500 : 1900
    filter.Q.value = 0.7
    const gain = ctx.createGain()
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(level === 2 ? 0.16 : 0.09, now + seconds * 0.25)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds)
    src.connect(filter).connect(gain).connect(ctx.destination)
    src.start(now)
  } catch {
    // pas d'audio : tant pis
  }
}

/** Annonceur : une petite fanfare qui monte avec le palier. */
export function playAnnounce(tier: number): void {
  const base = 392 * 2 ** (Math.min(tier, 4) / 12)
  tone(base, 110, 'square', 0.07)
  setTimeout(() => tone(base * 1.25, 110, 'square', 0.07), 90)
  setTimeout(() => tone(base * 1.5, 220, 'square', 0.08), 180)
}

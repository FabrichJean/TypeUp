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
  tone(140, 110, 'sawtooth', 0.05)
}

export function playCombo(multiplier: number): void {
  tone(420 + multiplier * 70, 140, 'triangle', 0.06)
}

export function playDone(): void {
  tone(660, 120, 'triangle', 0.06)
  setTimeout(() => tone(880, 200, 'triangle', 0.06), 120)
}

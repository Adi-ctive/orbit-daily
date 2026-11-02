// Procedural sound effects: parameters in code, rendered to buffers on first use.
// No sample files, so they are royalty-free by construction.
import type { SfxName } from '../games/types'
import { RNG } from '../lib/rng'

type Wave = 'sine' | 'square' | 'saw' | 'tri' | 'noise'

interface Note {
  wave: Wave
  freq: number
  /** Frequency multiplier reached by the end. */
  slide?: number
  attack: number
  decay: number
  volume: number
  /** Start offset in seconds. */
  at?: number
  vibrato?: number
  /** Simple low-pass amount 0..1 (1 = none). */
  tone?: number
}

export const SFX: Record<SfxName, Note[]> = {
  tap: [{ wave: 'square', freq: 880, slide: 0.8, attack: 0.002, decay: 0.04, volume: 0.25, tone: 0.5 }],
  hover: [{ wave: 'tri', freq: 1320, attack: 0.002, decay: 0.03, volume: 0.12 }],
  correct: [
    { wave: 'square', freq: 660, attack: 0.004, decay: 0.08, volume: 0.25, tone: 0.6 },
    { wave: 'square', freq: 990, attack: 0.004, decay: 0.14, volume: 0.25, at: 0.07, tone: 0.6 },
  ],
  wrong: [
    { wave: 'saw', freq: 220, slide: 0.6, attack: 0.004, decay: 0.22, volume: 0.22, tone: 0.35 },
    { wave: 'noise', freq: 0, attack: 0.002, decay: 0.08, volume: 0.08, tone: 0.3 },
  ],
  combo: [
    { wave: 'square', freq: 784, attack: 0.003, decay: 0.06, volume: 0.2, tone: 0.6 },
    { wave: 'square', freq: 988, attack: 0.003, decay: 0.06, volume: 0.2, at: 0.05, tone: 0.6 },
    { wave: 'square', freq: 1175, attack: 0.003, decay: 0.12, volume: 0.2, at: 0.1, tone: 0.6 },
  ],
  warning: [
    { wave: 'tri', freq: 1046, attack: 0.002, decay: 0.07, volume: 0.25 },
    { wave: 'tri', freq: 1046, attack: 0.002, decay: 0.07, volume: 0.25, at: 0.12 },
  ],
  start: [
    { wave: 'tri', freq: 392, slide: 2, attack: 0.01, decay: 0.3, volume: 0.25, vibrato: 6 },
    { wave: 'square', freq: 784, attack: 0.004, decay: 0.12, volume: 0.12, at: 0.22, tone: 0.5 },
  ],
  warp: [
    { wave: 'noise', freq: 0, attack: 0.2, decay: 0.6, volume: 0.18, tone: 0.15 },
    { wave: 'saw', freq: 110, slide: 6, attack: 0.15, decay: 0.55, volume: 0.12, tone: 0.3 },
  ],
  levelup: [523, 659, 784, 1046].map((f, i) => ({ wave: 'square' as Wave, freq: f, attack: 0.004, decay: 0.12, volume: 0.18, at: i * 0.08, tone: 0.6 })),
  unlock: [
    { wave: 'tri', freq: 523, attack: 0.01, decay: 0.2, volume: 0.25 },
    { wave: 'tri', freq: 784, attack: 0.01, decay: 0.3, volume: 0.25, at: 0.1 },
    { wave: 'sine', freq: 1568, attack: 0.01, decay: 0.5, volume: 0.15, at: 0.2, vibrato: 5 },
  ],
  flip: [{ wave: 'noise', freq: 0, attack: 0.005, decay: 0.07, volume: 0.15, tone: 0.6 }, { wave: 'tri', freq: 600, slide: 1.6, attack: 0.003, decay: 0.06, volume: 0.1 }],
  lock: [
    { wave: 'sine', freq: 392, slide: 0.5, attack: 0.02, decay: 0.9, volume: 0.25 },
    { wave: 'tri', freq: 196, attack: 0.05, decay: 1.2, volume: 0.15, at: 0.1 },
  ],
}

const SR = 22050
const PITCH_VARIANTS = [0.96, 1, 1.04]

export function renderNotes(ctx: BaseAudioContext, notes: Note[], pitch: number): AudioBuffer {
  const rng = new RNG('sfx-noise')
  const len = Math.ceil(Math.max(...notes.map((n) => (n.at ?? 0) + n.attack + n.decay)) * SR) + 32
  const buf = ctx.createBuffer(1, len, SR)
  const out = buf.getChannelData(0)
  for (const n of notes) {
    const start = Math.floor((n.at ?? 0) * SR)
    const total = Math.floor((n.attack + n.decay) * SR)
    let phase = 0
    let lp = 0
    const tone = n.tone ?? 1
    for (let i = 0; i < total && start + i < len; i++) {
      const t = i / SR
      const p = i / total
      const env = t < n.attack ? t / n.attack : Math.pow(1 - (t - n.attack) / n.decay, 2)
      const f = n.freq * pitch * (n.slide ? Math.pow(n.slide, p) : 1) * (n.vibrato ? 1 + 0.01 * Math.sin(t * n.vibrato * 6.283) : 1)
      phase += f / SR
      const ph = phase % 1
      let v: number
      switch (n.wave) {
        case 'sine':
          v = Math.sin(ph * 6.283)
          break
        case 'square':
          v = ph < 0.5 ? 1 : -1
          break
        case 'saw':
          v = ph * 2 - 1
          break
        case 'tri':
          v = 1 - 4 * Math.abs(ph - 0.5)
          break
        default:
          v = rng.float() * 2 - 1
      }
      lp += (v - lp) * tone
      out[start + i] += lp * env * n.volume
    }
  }
  return buf
}

export class SfxBank {
  private cache = new Map<string, AudioBuffer>()
  private counter = 0

  constructor(private ctx: BaseAudioContext) {}

  get(name: SfxName, combo = 0): AudioBuffer {
    // Rotate through slight pitch variations so repeats do not grate.
    const v = PITCH_VARIANTS[this.counter++ % PITCH_VARIANTS.length] * (1 + Math.min(combo, 8) * 0.05)
    const key = name + ':' + v.toFixed(3)
    let b = this.cache.get(key)
    if (!b) {
      b = renderNotes(this.ctx, SFX[name], v)
      this.cache.set(key, b)
    }
    return b
  }
}

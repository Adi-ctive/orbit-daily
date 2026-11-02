// Procedural ambient music: a small look-ahead sequencer with pads, arpeggio and bass.
// Patterns loop on bar boundaries, so loops are seamless.

export type Scene = 'menu' | 'focus' | 'results' | 'lock'

interface SceneDef {
  bpm: number
  /** Chords as MIDI note lists, one per bar. */
  chords: number[][]
  /** Arpeggio steps per bar (16ths), indices into the chord, -1 = rest. */
  arp: number[]
  arpOctave: number
  bass: boolean
  padCutoff: number
  arpVolume: number
}

const SCENES: Record<Scene, SceneDef> = {
  menu: {
    bpm: 84,
    chords: [
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [55, 59, 62, 66],
      [52, 55, 59, 62],
    ],
    arp: [0, -1, 2, -1, 3, -1, 1, -1, 0, -1, 2, -1, 3, 2, 1, -1],
    arpOctave: 12,
    bass: true,
    padCutoff: 1400,
    arpVolume: 0.05,
  },
  focus: {
    bpm: 70,
    chords: [
      [50, 57, 60, 64],
      [48, 55, 59, 62],
    ],
    arp: [0, -1, -1, -1, 2, -1, -1, -1, 1, -1, -1, -1, 3, -1, -1, -1],
    arpOctave: 12,
    bass: false,
    padCutoff: 800,
    arpVolume: 0.03,
  },
  results: {
    bpm: 96,
    chords: [
      [60, 64, 67, 71],
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [55, 59, 62, 67],
    ],
    arp: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, -1, 3, -1],
    arpOctave: 12,
    bass: true,
    padCutoff: 2000,
    arpVolume: 0.05,
  },
  lock: {
    bpm: 56,
    chords: [
      [45, 52, 57, 60],
      [41, 48, 53, 57],
    ],
    arp: [0, -1, -1, -1, -1, -1, -1, -1, 3, -1, -1, -1, -1, -1, -1, -1],
    arpOctave: 24,
    bass: false,
    padCutoff: 600,
    arpVolume: 0.025,
  },
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

export class MusicPlayer {
  private scene: Scene | null = null
  private sceneGain: GainNode | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private nextTime = 0
  private step = 0

  constructor(
    private ctx: AudioContext,
    private out: AudioNode,
  ) {}

  play(scene: Scene): void {
    if (scene === this.scene) return
    const now = this.ctx.currentTime
    // Crossfade: fade the old scene out, start the new one fading in.
    if (this.sceneGain) {
      const g = this.sceneGain
      g.gain.cancelScheduledValues(now)
      g.gain.setValueAtTime(g.gain.value, now)
      g.gain.linearRampToValueAtTime(0, now + 1.5)
      setTimeout(() => g.disconnect(), 1800)
    }
    this.scene = scene
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(1, now + 1.5)
    g.connect(this.out)
    this.sceneGain = g
    this.step = 0
    this.nextTime = now + 0.05
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 100)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.sceneGain?.disconnect()
    this.sceneGain = null
    this.scene = null
  }

  private schedule(): void {
    if (!this.scene || !this.sceneGain || this.ctx.state !== 'running') return
    const def = SCENES[this.scene]
    const sixteenth = 60 / def.bpm / 4
    while (this.nextTime < this.ctx.currentTime + 0.3) {
      const bar = Math.floor(this.step / 16) % def.chords.length
      const s = this.step % 16
      const chord = def.chords[bar]
      if (s === 0) {
        for (const n of chord) this.pad(midi(n), this.nextTime, sixteenth * 16, def.padCutoff)
        if (def.bass) this.pluck(midi(chord[0] - 12), this.nextTime, sixteenth * 6, 0.08, 'triangle')
      }
      if (def.bass && s === 8) this.pluck(midi(chord[0] - 12), this.nextTime, sixteenth * 4, 0.06, 'triangle')
      const a = def.arp[s]
      if (a >= 0) this.pluck(midi(chord[a % chord.length] + def.arpOctave), this.nextTime, sixteenth * 1.8, def.arpVolume, 'square')
      this.nextTime += sixteenth
      this.step++
    }
  }

  private pad(freq: number, t: number, dur: number, cutoff: number): void {
    const f = this.ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = cutoff
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.035, t + dur * 0.3)
    g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.05)
    f.connect(g)
    g.connect(this.sceneGain!)
    for (const det of [-7, 7]) {
      const o = this.ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = freq
      o.detune.value = det
      o.connect(f)
      o.start(t)
      o.stop(t + dur * 1.1)
    }
  }

  private pluck(freq: number, t: number, dur: number, vol: number, type: OscillatorType): void {
    const o = this.ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    const f = this.ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(2400, t)
    f.frequency.exponentialRampToValueAtTime(500, t + dur)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(f)
    f.connect(g)
    g.connect(this.sceneGain!)
    o.start(t)
    o.stop(t + dur + 0.02)
  }
}

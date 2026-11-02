// AudioBus: one context, separate music / SFX / UI channels. Starts only after
// the first user gesture and pauses whenever the tab is hidden.
import type { SfxName } from '../games/types'
import { MusicPlayer, type Scene } from './music'
import { SfxBank } from './sfx'

const UI_SOUNDS = new Set<SfxName>(['tap', 'hover', 'flip'])

class AudioBus {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private music: GainNode | null = null
  private sfxGain: GainNode | null = null
  private ui: GainNode | null = null
  private bank: SfxBank | null = null
  private player: MusicPlayer | null = null
  private wantScene: Scene | null = null
  private musicOn = true
  private sfxOn = true
  private musicVol = 0.5
  private sfxVol = 0.7
  private ducked = false

  /** Call from a user gesture. Safe to call repeatedly. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AC) return
        this.ctx = new AC()
        this.master = this.ctx.createGain()
        this.master.connect(this.ctx.destination)
        this.music = this.ctx.createGain()
        this.sfxGain = this.ctx.createGain()
        this.ui = this.ctx.createGain()
        this.music.connect(this.master)
        this.sfxGain.connect(this.master)
        this.ui.connect(this.master)
        this.bank = new SfxBank(this.ctx)
        this.player = new MusicPlayer(this.ctx, this.music)
        this.applyVolumes()
        document.addEventListener('visibilitychange', () => this.onVisibility())
      }
      if (this.ctx.state === 'suspended' && document.visibilityState === 'visible') void this.ctx.resume()
      if (this.wantScene) this.scene(this.wantScene)
    } catch {
      /* audio unavailable */
    }
  }

  private onVisibility(): void {
    try {
      if (!this.ctx) return
      if (document.visibilityState === 'hidden') void this.ctx.suspend()
      else void this.ctx.resume()
    } catch {
      /* ignore */
    }
  }

  configure(o: { music: boolean; sfx: boolean; musicVolume: number; sfxVolume: number }): void {
    this.musicOn = o.music
    this.sfxOn = o.sfx
    this.musicVol = o.musicVolume
    this.sfxVol = o.sfxVolume
    this.applyVolumes()
    if (!this.musicOn) this.player?.stop()
    else if (this.wantScene) this.scene(this.wantScene)
  }

  private applyVolumes(): void {
    try {
      if (!this.ctx) return
      const t = this.ctx.currentTime
      this.music!.gain.setTargetAtTime(this.musicOn ? this.musicVol * (this.ducked ? 0.6 : 1) : 0, t, 0.08)
      this.sfxGain!.gain.setTargetAtTime(this.sfxOn ? this.sfxVol : 0, t, 0.02)
      this.ui!.gain.setTargetAtTime(this.sfxOn ? this.sfxVol * 0.7 : 0, t, 0.02)
    } catch {
      /* ignore */
    }
  }

  scene(s: Scene): void {
    this.wantScene = s
    try {
      if (this.ctx && this.musicOn) this.player?.play(s)
    } catch {
      /* ignore */
    }
  }

  /** Lower music by 40% while a reaction game runs. */
  duck(on: boolean): void {
    this.ducked = on
    this.applyVolumes()
  }

  sfx(name: SfxName, combo = 0): void {
    try {
      if (!this.ctx || !this.bank || !this.sfxOn || this.ctx.state !== 'running') return
      const src = this.ctx.createBufferSource()
      src.buffer = this.bank.get(name, combo)
      src.connect(UI_SOUNDS.has(name) ? this.ui! : this.sfxGain!)
      src.start()
    } catch {
      /* ignore */
    }
  }
}

export const audio = new AudioBus()

// App controller. Owns the profile and today's session record, and persists
// every change before the UI shows it.
import { ACTIVE_TIME_FLUSH_MS } from '../config'
import { audio } from '../audio/bus'
import { bonusRound, compose, coreIdsOf, daySeed, weakestRound } from '../engine/composer'
import {
  addActive,
  applyFreezes,
  bumpHighWater,
  effectiveNow,
  finishRound,
  isLocked,
  markCompleted,
  endMission,
  timeLeftMs,
  startRound,
} from '../engine/lock'
import { migrateDay } from '../engine/migrate'
import { defaultRatings, updateRating } from '../engine/ratings'
import { RNG } from '../lib/rng'
import { defaultSettings, type DayRecord, type Profile, type RoundRecord, type RoundSpec } from '../engine/types'
import { CATALOG, type Category } from '../games/catalog'
import { addDays, appClock } from '../lib/clock'
import { dev } from '../lib/dev'
import { setHapticsEnabled } from '../lib/haptics'
import { load, save, remove, wipeAll } from '../lib/storage'

export type Screen = 'boot' | 'home' | 'session' | 'debrief' | 'lock' | 'stats' | 'settings' | 'credits'

export function freshProfile(): Profile {
  return {
    version: 1,
    highWater: 0,
    ratings: defaultRatings(),
    roundsPlayed: {},
    ratingHistory: [],
    srs: {},
    seenCards: [],
    logbook: [],
    completedDates: [],
    freezes: 0,
    frozenDates: [],
    coreHistory: {},
    settings: defaultSettings(),
    installHintSeen: false,
  }
}

const PROFILE_KEY = 'profile'
const dayKey = (d: string) => 'day:' + d

class App {
  screen = $state<Screen>('boot')
  /** Screen to return to from stats/settings. */
  back = $state<Screen>('home')
  profile = $state<Profile>(freshProfile())
  day = $state<DayRecord | null>(null)
  today = $state('')
  nowMs = $state(0)
  rewound = $state(false)
  toast = $state<string | null>(null)
  crashed = $state<string | null>(null)
  reducedMotion = $state(false)
  warpPulse = $state(0)
  inRound = $state(false)
  launching = $state(false)

  private lastTick = 0
  private lastFlush = 0
  private systemReduced = false

  get locked(): boolean {
    return isLocked(this.day, this.today)
  }

  get currentRound(): RoundSpec | null {
    const d = this.day
    if (!d || d.completed) return null
    return d.plan[d.index] ?? null
  }

  async boot(): Promise<void> {
    const stored = await load<Profile | null>(PROFILE_KEY, null)
    const p = stored ? { ...freshProfile(), ...stored, settings: { ...defaultSettings(), ...stored.settings } } : freshProfile()
    // One random salt per player, so each player gets their own mix of games.
    if (!p.salt) p.salt = randomId()
    this.profile = p
    try {
      const mq = matchMedia('(prefers-reduced-motion: reduce)')
      this.systemReduced = mq.matches
      mq.addEventListener('change', (e) => {
        this.systemReduced = e.matches
        this.applySettings()
      })
    } catch {
      /* ignore */
    }
    this.applySettings()
    await this.refreshDay()
    this.lastTick = performance.now()
    setInterval(() => this.tick(), 250)
    addEventListener('pagehide', () => void this.flush())
    document.addEventListener('visibilitychange', () => {
      this.lastTick = performance.now()
      if (document.visibilityState === 'hidden') void this.flush()
      else void this.checkDay()
    })
  }

  /** Load today's record and route to the right screen. */
  private async refreshDay(): Promise<void> {
    const n = effectiveNow(appClock, this.profile)
    this.rewound = n.rewound
    this.today = n.date
    this.nowMs = n.ms
    bumpHighWater(this.profile, n.ms)
    applyFreezes(this.profile, n.date)
    await this.saveProfile()
    this.day = await load<DayRecord | null>(dayKey(n.date), null)
    if (this.day) {
      // A mission saved by an older version may name rounds that no longer exist.
      const { GAME_IDS } = await import('../games/registry')
      const { pickExplainer } = await import('../content/explainers')
      const [y, m, dd] = n.date.split('-').map(Number)
      const ex = pickExplainer(Math.round(Date.UTC(y, m - 1, dd) / 86_400_000), new Set(this.profile.seenCards))
      const mig = migrateDay(this.day, new Set(GAME_IDS), ex?.id ?? null)
      if (mig.changed) {
        this.day = mig.day
        await this.saveDay()
      }
    }
    if (this.day?.inRound) {
      // Reloaded mid-round: that round restarts with the same level.
      this.day.inRound = false
      await this.saveDay()
    }
    this.screen = this.locked ? (this.day?.debriefed ? 'lock' : 'debrief') : 'home'
  }

  private async checkDay(): Promise<void> {
    const n = effectiveNow(appClock, this.profile)
    this.nowMs = n.ms
    this.rewound = n.rewound
    if (n.date === this.today) return
    // Never yank the player out of a running round; finishRound handles the date change.
    if (this.inRound || this.screen === 'session' || this.screen === 'debrief') return
    await this.refreshDay()
  }

  private tick(): void {
    const t = performance.now()
    const dt = t - this.lastTick
    this.lastTick = t
    this.nowMs = effectiveNow(appClock, this.profile).ms
    if (this.inRound && this.day && document.visibilityState === 'visible' && document.hasFocus()) {
      addActive(this.day, dt)
      if (t - this.lastFlush > ACTIVE_TIME_FLUSH_MS) {
        this.lastFlush = t
        void this.saveDay()
      }
    }
    if (Math.floor(t / 1000) !== Math.floor((t - dt) / 1000)) void this.checkDay()
  }

  async flush(): Promise<void> {
    bumpHighWater(this.profile, this.nowMs)
    await Promise.all([this.saveDay(), this.saveProfile()])
  }

  async saveProfile(): Promise<void> {
    await save(PROFILE_KEY, $state.snapshot(this.profile))
  }

  async saveDay(): Promise<void> {
    if (this.day) await save(dayKey(this.day.date), $state.snapshot(this.day))
  }

  /** "Launch today's mission": compose (first time) or resume. */
  async launch(): Promise<void> {
    if (this.locked || this.launching) return
    audio.unlock()
    this.launching = true
    try {
      if (!this.day || this.day.date !== this.today) {
        const seed = daySeed(this.today, dev.seedOverride)
        const { pickExplainer } = await import('../content/explainers')
        const [y, m, dd] = this.today.split('-').map(Number)
        const dayNumber = Math.round(Date.UTC(y, m - 1, dd) / 86_400_000)
        const explainer = pickExplainer(dayNumber, new Set(this.profile.seenCards))
        // Bring back yesterday's weakest game for another go.
        const yesterday = await load<DayRecord | null>(dayKey(addDays(this.today, -1)), null)
        const rematch = yesterday ? weakestRound(yesterday.results) : null
        const plan = compose({
          date: this.today,
          ratings: this.profile.ratings,
          coreHistory: this.profile.coreHistory,
          explainerId: explainer?.id ?? null,
          salt: dev.seedOverride ? undefined : this.profile.salt,
          rematch,
          seedOverride: dev.seedOverride,
        })
        this.day = {
          date: this.today,
          seed,
          plan,
          index: 0,
          results: [],
          activeMs: 0,
          completed: false,
          capped: false,
          startedAt: this.nowMs,
          inRound: false,
        }
        this.profile.coreHistory[this.today] = coreIdsOf(plan)
        // Keep only recent history.
        for (const k of Object.keys(this.profile.coreHistory)) if (k < addDays(this.today, -7)) delete this.profile.coreHistory[k]
        await Promise.all([this.saveDay(), this.saveProfile()])
      }
      this.screen = 'session'
      audio.sfx('start')
    } finally {
      this.launching = false
    }
  }

  async beginRound(): Promise<void> {
    if (!this.day) return
    startRound(this.day)
    this.inRound = true
    this.lastTick = performance.now()
    await this.saveDay()
  }

  /** Record a finished round. Persists before advancing the UI. */
  async completeRound(rec: RoundRecord, learnedCard?: { id: string; title: string; category: string }, seenIds: string[] = []): Promise<void> {
    const d = this.day
    if (!d) return
    this.inRound = false
    const p = this.profile
    // Every scored round (including Aptitude, which counts as math) moves its skill rating.
    if (rec.category !== 'explainer') {
      const cat: Category = rec.category
      const played = p.roundsPlayed[cat] ?? 0
      p.ratings[cat] = updateRating(p.ratings[cat], d.plan[d.index]?.difficulty ?? 0.5, rec.score, played)
      p.roundsPlayed[cat] = played + 1
    }
    if (seenIds.length) {
      const cur = p.seenItems ?? []
      p.seenItems = [...cur, ...seenIds.filter((id) => !cur.includes(id))]
    }
    if (learnedCard && !p.seenCards.includes(learnedCard.id)) {
      p.seenCards.push(learnedCard.id)
      p.logbook.push({ ...learnedCard, date: d.date })
    }
    const today = effectiveNow(appClock, p).date
    const wasDone = !!d.planDone
    finishRound(d, rec, today)
    // The streak counts once the planned rounds are done, even if extra rounds follow.
    if ((d.planDone || d.completed) && !wasDone) {
      markCompleted(p, d.date)
      p.ratingHistory.push({ date: d.date, ratings: { ...$state.snapshot(p.ratings) } })
      if (p.ratingHistory.length > 400) p.ratingHistory.shift()
    }
    await Promise.all([this.saveDay(), this.saveProfile()])
  }

  /** Add an extra round after the planned set, while time is left. */
  async moreRound(): Promise<void> {
    const d = this.day
    if (!d || d.completed || !d.planDone || timeLeftMs(d) <= 0) return
    const r = bonusRound(this.profile.ratings, new Set(d.plan.map((x) => x.gameId)), new RNG(randomId()))
    if (!r) return
    d.plan.push(r)
    await this.saveDay()
  }

  /** True while some game has not been played yet today. */
  get canMore(): boolean {
    const d = this.day
    if (!d) return false
    const played = new Set(d.plan.map((x) => x.gameId))
    return CATALOG.some((g) => !played.has(g.id))
  }

  /** The player ends the mission (planned set done). */
  async endMission(): Promise<void> {
    const d = this.day
    if (!d) return
    if (!this.profile.completedDates.includes(d.date)) markCompleted(this.profile, d.date)
    endMission(d)
    await Promise.all([this.saveDay(), this.saveProfile()])
    this.screen = 'debrief'
    audio.scene('results')
  }

  /** After the feedback panel: warp to the next round, or open the debrief. */
  advance(): void {
    if (this.day?.completed) {
      this.screen = 'debrief'
      audio.scene('results')
      return
    }
    this.warpPulse++
    audio.sfx('warp')
  }

  /** Debrief → lock. */
  async finishDebrief(): Promise<void> {
    if (this.day) this.day.debriefed = true
    await this.flush()
    if (this.day && this.day.date !== this.today) {
      await this.refreshDay()
      return
    }
    this.screen = 'lock'
    audio.scene('lock')
  }

  open(s: 'stats' | 'settings' | 'credits'): void {
    if (this.screen !== 'stats' && this.screen !== 'settings' && this.screen !== 'credits') this.back = this.screen
    this.screen = s
  }

  close(): void {
    this.screen = this.locked ? 'lock' : this.back === 'session' ? 'session' : 'home'
  }

  applySettings(): void {
    const s = this.profile.settings
    audio.configure(s)
    setHapticsEnabled(s.haptics && !(this.reducedMotion && !s.haptics))
    this.reducedMotion = s.reducedMotion === 'on' || (s.reducedMotion === 'system' && this.systemReduced)
    const root = document.documentElement
    root.classList.toggle('reduced-motion', this.reducedMotion)
    root.classList.toggle('high-contrast', s.highContrast)
    root.style.setProperty('--text-scale', String(s.textScale))
  }

  async updateSettings(patch: Partial<Profile['settings']>): Promise<void> {
    this.profile.settings = { ...this.profile.settings, ...patch }
    this.applySettings()
    await this.saveProfile()
  }

  async resetAll(): Promise<void> {
    await wipeAll()
    location.reload()
  }

  // Dev helper.
  async devUnlock(): Promise<void> {
    await remove(dayKey(this.today))
    this.day = null
    this.screen = 'home'
  }

  showToast(msg: string): void {
    this.toast = msg
    setTimeout(() => {
      if (this.toast === msg) this.toast = null
    }, 4000)
  }
}

export const app = new App()

/** A random id from the browser's crypto source (not Math.random, which is banned for game logic). */
function randomId(): string {
  const a = new Uint32Array(2)
  crypto.getRandomValues(a)
  return a[0].toString(36) + a[1].toString(36)
}

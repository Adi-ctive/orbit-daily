// Daily lock and active-time accounting. Pure functions over DayRecord/Profile.
import { SESSION_HARD_CAP_MS } from '../config'
import { addDays, guardedNow, localDateISO, type Clock } from '../lib/clock'
import type { DayRecord, Profile, RoundRecord } from './types'

export interface Now {
  ms: number
  date: string
  rewound: boolean
}

/** Effective time. Never earlier than the high-water mark, so a rewound clock keeps the lock. */
export function effectiveNow(clock: Clock, profile: Pick<Profile, 'highWater'>): Now {
  const g = guardedNow(clock, profile.highWater)
  return { ms: g.now, date: localDateISO(g.now), rewound: g.rewound }
}

export function bumpHighWater(profile: Profile, ms: number): void {
  if (ms > profile.highWater) profile.highWater = ms
}

export function isLocked(day: DayRecord | null, today: string): boolean {
  return !!day && day.date === today && day.completed
}

export function capReached(day: DayRecord): boolean {
  return day.activeMs >= SESSION_HARD_CAP_MS
}

/** Add active time. Only call while visible and inside a round. */
export function addActive(day: DayRecord, ms: number): void {
  if (ms <= 0 || !Number.isFinite(ms)) return
  // A single tick over 5 s means the tab was suspended; ignore the gap.
  day.activeMs += Math.min(ms, 5000)
}

/**
 * Record a finished round and advance. Ends the session when the plan is done,
 * when the cap was hit during the round, or when the day changed under a stale tab.
 */
export function finishRound(day: DayRecord, rec: RoundRecord, today: string): void {
  day.results.push(rec)
  day.index += 1
  day.inRound = false
  const done = day.index >= day.plan.length
  if (done) day.completed = true
  else if (capReached(day)) {
    day.completed = true
    day.capped = true
  } else if (today !== day.date) {
    day.completed = true
  }
}

export function startRound(day: DayRecord): void {
  day.inRound = true
}

/** Streak: consecutive completed (or frozen) days ending today or yesterday. */
export function streakLength(profile: Pick<Profile, 'completedDates' | 'frozenDates'>, today: string): number {
  const ok = new Set([...profile.completedDates, ...profile.frozenDates])
  let d = ok.has(today) ? today : addDays(today, -1)
  let n = 0
  while (ok.has(d)) {
    if (profile.completedDates.includes(d)) n++
    d = addDays(d, -1)
  }
  return n
}

/**
 * Streak freezes: one is earned every 7 completed days (max 2). When the player
 * returns after missing exactly one day, a freeze covers it automatically.
 */
export function applyFreezes(profile: Profile, today: string): void {
  const y = addDays(today, -1)
  const yy = addDays(today, -2)
  const has = (d: string) => profile.completedDates.includes(d) || profile.frozenDates.includes(d)
  if (!has(y) && has(yy) && profile.freezes > 0) {
    profile.freezes -= 1
    profile.frozenDates.push(y)
  }
}

export function markCompleted(profile: Profile, date: string): void {
  if (profile.completedDates.includes(date)) return
  profile.completedDates.push(date)
  if (profile.completedDates.length % 7 === 0) profile.freezes = Math.min(2, profile.freezes + 1)
}

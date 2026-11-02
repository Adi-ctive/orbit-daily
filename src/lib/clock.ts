// Time source behind an interface, so a server time check can be added later.

export interface Clock {
  /** Epoch ms. */
  now(): number
}

export const systemClock: Clock = { now: () => Date.now() }

/** Dev panel can pin the date. Offset is applied on top of the system clock. */
export class OffsetClock implements Clock {
  offsetMs = 0
  constructor(private base: Clock = systemClock) {}
  now(): number {
    return this.base.now() + this.offsetMs
  }
}

export const appClock = new OffsetClock()

/** Local calendar date as YYYY-MM-DD in the device time zone. */
export function localDateISO(ms: number): string {
  const d = new Date(ms)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function nextLocalMidnight(ms: number): number {
  const d = new Date(ms)
  d.setHours(24, 0, 0, 0)
  return d.getTime()
}

export function msUntilMidnight(ms: number): number {
  return nextLocalMidnight(ms) - ms
}

/** Shift a YYYY-MM-DD date by whole days, staying on calendar dates. */
export function addDays(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days, 12)
  return localDateISO(dt.getTime())
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const hh = String(Math.floor(s / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/**
 * Tamper guard. Keeps the highest time ever seen. If the device clock goes
 * backwards, the effective time stays at the high-water mark, so the lock holds.
 */
export function guardedNow(clock: Clock, highWater: number): { now: number; rewound: boolean } {
  const raw = clock.now()
  if (raw < highWater) return { now: highWater, rewound: true }
  return { now: raw, rewound: false }
}

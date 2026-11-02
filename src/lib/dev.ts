// Dev-mode overrides. Only active when the build includes the dev panel and ?dev=1 is set.
import { appClock } from './clock'

export interface DevState {
  enabled: boolean
  seedOverride: string | null
}

export const dev: DevState = { enabled: false, seedOverride: null }

export function initDev(search: string): void {
  if (!__DEV_PANEL__) return
  const p = new URLSearchParams(search)
  if (p.get('dev') !== '1') return
  dev.enabled = true
  const date = p.get('date')
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) setDevDate(date)
  const seed = p.get('seed')
  if (seed) dev.seedOverride = seed
}

/** Move the app clock so the local date reads `dateISO`, keeping the time of day. */
export function setDevDate(dateISO: string): void {
  const [y, m, d] = dateISO.split('-').map(Number)
  const real = new Date()
  const target = new Date(y, m - 1, d, real.getHours(), real.getMinutes(), real.getSeconds())
  appClock.offsetMs = target.getTime() - real.getTime()
}

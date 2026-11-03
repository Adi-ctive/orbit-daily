// Vibration API wrapper. Fails silently where unsupported (iOS Safari).
import type { HapticName } from '../games/types'

const PATTERNS: Record<HapticName, number | number[]> = {
  tap: 8,
  correct: [12, 40, 12],
  wrong: [40, 30, 40],
  combo: [8, 30, 12, 30, 18, 30, 26],
  timerWarning: [20, 80, 20],
  unlock: [10, 50, 10, 50, 30],
  lock: [60, 120, 90],
}

let enabled = true

export function setHapticsEnabled(on: boolean): void {
  enabled = on
}

export function haptic(name: HapticName): void {
  if (!enabled) return
  // Chrome refuses (and logs an error) before the first real tap on the page.
  if (typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.hasBeenActive) return
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(PATTERNS[name])
  } catch {
    /* unsupported */
  }
}

export const HAPTIC_PATTERNS = PATTERNS

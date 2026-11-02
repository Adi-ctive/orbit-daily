// SM-2 spaced repetition, scheduled in whole local days.
import { addDays } from '../lib/clock'

export interface SrsState {
  ef: number
  interval: number
  reps: number
  due: string
}

export function newSrs(learnedOn: string): SrsState {
  // First review is tomorrow, never the same day.
  return { ef: 2.5, interval: 0, reps: 0, due: addDays(learnedOn, 1) }
}

/** grade: 0..5 (SM-2). 3+ counts as a pass. */
export function review(s: SrsState, grade: number, today: string): SrsState {
  const q = Math.max(0, Math.min(5, Math.round(grade)))
  let { ef, interval, reps } = s
  if (q < 3) {
    reps = 0
    interval = 1
  } else {
    reps += 1
    if (reps === 1) interval = 1
    else if (reps === 2) interval = 6
    else interval = Math.round(interval * ef)
  }
  ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  if (ef < 1.3) ef = 1.3
  return { ef: Math.round(ef * 1000) / 1000, interval, reps, due: addDays(today, interval) }
}

export function dueItems(all: Record<string, SrsState>, today: string, max: number): string[] {
  return Object.entries(all)
    .filter(([, s]) => s.due <= today)
    .sort((a, b) => (a[1].due === b[1].due ? (a[0] < b[0] ? -1 : 1) : a[1].due < b[1].due ? -1 : 1))
    .slice(0, max)
    .map(([id]) => id)
}

export function gradeFor(correct: boolean, ms: number): number {
  if (!correct) return 2
  return ms < 6000 ? 5 : 4
}

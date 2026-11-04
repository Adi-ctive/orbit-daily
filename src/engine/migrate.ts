// Upgrades a saved day from an older version so a mission started before an
// update can still be finished. v1 had 'review' and 'star-chart' rounds.
import { levelSeed } from './composer'
import type { DayRecord, RoundSpec } from './types'

export function migrateDay(day: DayRecord, known: ReadonlySet<string>, explainerId: string | null): { day: DayRecord; changed: boolean } {
  let changed = false
  const plan: RoundSpec[] = []
  let index = 0
  day.plan.forEach((r, i) => {
    let next: RoundSpec | null = r
    const legacy = r as { gameId: string; phase: string }
    if (legacy.gameId === 'star-chart') {
      next = explainerId
        ? { phase: 'explainer', gameId: 'explainer', category: 'explainer', difficulty: 0.5, seed: levelSeed(day.seed, 'explainer', 'explainer'), items: [explainerId] }
        : null
    } else if (!known.has(r.gameId)) next = null
    if (next !== r) changed = true
    if (next) {
      if (i < day.index) index++
      plan.push(next)
    }
  })
  if (!changed) return { day, changed }
  const out = { ...day, plan, index }
  if (!out.completed && out.index >= out.plan.length) out.completed = true
  return { day: out, changed }
}

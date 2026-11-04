// Wordle-style, spoiler-free share text.
import { SITE_URL } from '../config'
import type { DayRecord } from '../engine/types'

export function tile(score: number): string {
  if (score >= 0.9) return '🟩'
  if (score >= 0.6) return '🟨'
  if (score >= 0.3) return '🟧'
  return '⬛'
}

const PHASE_ICON: Record<string, string> = { warmup: '⚡', core: '🧩', aptitude: '📊', explainer: '📘', boss: '👾', bonus: '➕' }

export function shareText(day: DayRecord, streak: number): string {
  const row = day.results.map((r) => tile(r.score)).join('')
  const icons = day.results.map((r) => PHASE_ICON[r.phase] ?? '·').join('')
  const total = day.results.reduce((s, r) => s + r.score, 0)
  const pct = day.results.length ? Math.round((total / day.results.length) * 100) : 0
  return `ORBIT ${day.date} · ${pct}%\n${icons}\n${row}\n🔥 ${streak} day streak\n${SITE_URL}`
}

export async function copyShare(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ text })
      return 'shared'
    }
  } catch {
    /* fall through to clipboard */
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

// Builds the day's mission. Pure: the same input gives the same plan. Each player
// has their own salt, so players get different mixes, and every attempt at a round
// gets a fresh random level when it starts (see Session).
import { CORE_ROUNDS, NO_REPEAT_DAYS, SEED_PREFIX } from '../config'
import { CATALOG, type CatalogEntry, type Category } from '../games/catalog'
import { addDays } from '../lib/clock'
import { RNG } from '../lib/rng'
import { clamp01, targetDifficulty, weaknessWeights, type Ratings } from './ratings'
import type { RoundSpec } from './types'

export interface ComposeInput {
  date: string
  ratings: Ratings
  /** Core game ids for previous dates. */
  coreHistory: Record<string, string[]>
  /** Today's explainer id, or null if none is left. */
  explainerId: string | null
  /** Per-player random salt. */
  salt?: string
  /** Yesterday's weakest game and its score, brought back as a rematch. */
  rematch?: { gameId: string; score: number } | null
  seedOverride?: string | null
}

/** Shared seed for the day's look (planet, stars). */
export function daySeed(date: string, override?: string | null): string {
  return override ? SEED_PREFIX + override : SEED_PREFIX + date
}

export function levelSeed(seed: string, gameId: string, phase: string): string {
  return `${seed}|${gameId}|${phase}`
}

export function recentCore(date: string, history: Record<string, string[]>): Set<string> {
  const out = new Set<string>()
  for (let i = 1; i <= NO_REPEAT_DAYS; i++) for (const id of history[addDays(date, -i)] ?? []) out.add(id)
  return out
}

export function compose(input: ComposeInput): RoundSpec[] {
  const seed = daySeed(input.date, input.seedOverride) + (input.salt ? '|' + input.salt : '')
  const rng = new RNG(seed + '/compose')
  const excluded = recentCore(input.date, input.coreHistory)
  const weak = weaknessWeights(input.ratings)
  const diff = (c: Category) => targetDifficulty(input.ratings[c])

  // A rematch of yesterday's weakest game takes the first core slot, so the
  // player gets a fresh go at what cost them points.
  const re = input.rematch ? CATALOG.find((g) => g.id === input.rematch!.gameId) : undefined
  const core: CatalogEntry[] = re ? [re] : []

  // Core: distinct categories, weighted toward weak skills, no game from the last 2 days.
  const pool = CATALOG.filter((g) => !excluded.has(g.id) && g.id !== re?.id)
  const byCat = new Map<Category, CatalogEntry[]>()
  for (const g of pool) if (g.category !== re?.category) byCat.set(g.category, [...(byCat.get(g.category) ?? []), g])
  const cats = [...byCat.keys()]
  while (core.length < CORE_ROUNDS && cats.length) {
    const i = rng.weighted(cats.map((c) => 1 + weak[c]))
    const cat = cats.splice(i, 1)[0]
    core.push(rng.pick(byCat.get(cat)!))
  }
  const coreIds = new Set(core.map((g) => g.id))

  // Warm-up: an easy reflex game that is not in the core block.
  const warm = rng.pick(CATALOG.filter((g) => g.category === 'reflex' && !coreIds.has(g.id)))
  // Boss: a logic or maze game not in the core block.
  const boss = rng.pick(CATALOG.filter((g) => g.boss && !coreIds.has(g.id)))

  const plan: RoundSpec[] = []
  plan.push({ phase: 'warmup', gameId: warm.id, category: warm.category, difficulty: clamp01(diff('reflex') - 0.2), seed: levelSeed(seed, warm.id, 'warmup') })

  for (const g of core) {
    const spec: RoundSpec = { phase: 'core', gameId: g.id, category: g.category, difficulty: diff(g.category), seed: levelSeed(seed, g.id, 'core') }
    if (g === re) spec.note = `Rematch: you scored ${Math.round(input.rematch!.score * 100)}% on this yesterday`
    plan.push(spec)
  }

  // Aptitude every day: six timed quantitative questions, scored as math.
  plan.push({ phase: 'aptitude', gameId: 'aptitude', category: 'math', difficulty: diff('math'), seed: levelSeed(seed, 'aptitude', 'aptitude') })

  if (input.explainerId) {
    plan.push({ phase: 'explainer', gameId: 'explainer', category: 'explainer', difficulty: 0.5, seed: levelSeed(seed, 'explainer', 'explainer'), items: [input.explainerId] })
  }

  plan.push({ phase: 'boss', gameId: boss.id, category: boss.category, difficulty: clamp01(diff(boss.category) + 0.25), seed: levelSeed(seed, boss.id, 'boss') })
  return plan
}

/** An extra round after the planned set: a game not played yet today, weighted toward weak skills. Null once every game has been played. */
export function bonusRound(ratings: Ratings, played: ReadonlySet<string>, rng: RNG): RoundSpec | null {
  const weak = weaknessWeights(ratings)
  const games = CATALOG.filter((g) => !played.has(g.id))
  if (!games.length) return null
  const g = games[rng.weighted(games.map((x) => 1 + weak[x.category] * 1.5))]
  return { phase: 'bonus', gameId: g.id, category: g.category, difficulty: targetDifficulty(ratings[g.category]), seed: `bonus|${g.id}|${rng.int(0, 1e9)}` }
}

export function coreIdsOf(plan: RoundSpec[]): string[] {
  return plan.filter((r) => r.phase === 'core').map((r) => r.gameId)
}

/** Yesterday's lowest scored game round under 70%, if any. */
export function weakestRound(results: { gameId: string; phase: string; score: number }[]): { gameId: string; score: number } | null {
  const games = results.filter((r) => CATALOG.some((g) => g.id === r.gameId) && r.score < 0.7)
  if (!games.length) return null
  const w = games.reduce((a, b) => (b.score < a.score ? b : a))
  return { gameId: w.gameId, score: w.score }
}

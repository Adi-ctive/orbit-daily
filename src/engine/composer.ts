// Builds the day's session from the date seed. Pure and deterministic.
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
  seedOverride?: string | null
}

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
  const seed = daySeed(input.date, input.seedOverride)
  const rng = new RNG(seed + '/compose')
  const excluded = recentCore(input.date, input.coreHistory)
  const weak = weaknessWeights(input.ratings)
  const diff = (c: Category) => targetDifficulty(input.ratings[c])

  // Core: 4 distinct categories, weighted toward weak skills, no game from the last 2 days.
  const pool = CATALOG.filter((g) => !excluded.has(g.id))
  const byCat = new Map<Category, CatalogEntry[]>()
  for (const g of pool) byCat.set(g.category, [...(byCat.get(g.category) ?? []), g])
  const cats = [...byCat.keys()]
  const core: CatalogEntry[] = []
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
  plan.push({
    phase: 'warmup',
    gameId: warm.id,
    category: warm.category,
    difficulty: clamp01(diff('reflex') - 0.2),
    seed: levelSeed(seed, warm.id, 'warmup'),
  })

  for (const g of core) {
    plan.push({ phase: 'core', gameId: g.id, category: g.category, difficulty: diff(g.category), seed: levelSeed(seed, g.id, 'core') })
  }

  // Aptitude every day: six timed quantitative questions, scored as math.
  plan.push({ phase: 'aptitude', gameId: 'aptitude', category: 'math', difficulty: diff('math'), seed: levelSeed(seed, 'aptitude', 'aptitude') })

  if (input.explainerId) {
    plan.push({ phase: 'explainer', gameId: 'explainer', category: 'explainer', difficulty: 0.5, seed: levelSeed(seed, 'explainer', 'explainer'), items: [input.explainerId] })
  }

  plan.push({
    phase: 'boss',
    gameId: boss.id,
    category: boss.category,
    difficulty: clamp01(diff(boss.category) + 0.25),
    seed: levelSeed(seed, boss.id, 'boss'),
  })
  return plan
}

export function coreIdsOf(plan: RoundSpec[]): string[] {
  return plan.filter((r) => r.phase === 'core').map((r) => r.gameId)
}

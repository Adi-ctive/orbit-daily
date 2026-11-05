// Builds the day's mission. Pure: the same input gives the same plan. Each player
// has their own salt, so players get different mixes, and every attempt at a round
// gets a fresh random level when it starts (see Session).
import { CORE_ROUNDS, NO_REPEAT_DAYS, SEED_PREFIX } from '../config'
import { CATALOG, CATEGORY_LABEL, type CatalogEntry, type Category } from '../games/catalog'
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
  /** Yesterday's weakest game and its score: today leads with that skill, using a different game. */
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

/** Every game played in the last `days` missions. */
export function recentCore(date: string, history: Record<string, string[]>, days = NO_REPEAT_DAYS): Set<string> {
  const out = new Set<string>()
  for (let i = 1; i <= days; i++) for (const id of history[addDays(date, -i)] ?? []) out.add(id)
  return out
}

export function compose(input: ComposeInput): RoundSpec[] {
  const seed = daySeed(input.date, input.seedOverride) + (input.salt ? '|' + input.salt : '')
  const rng = new RNG(seed + '/compose')
  const weak = weaknessWeights(input.ratings)
  const diff = (c: Category) => targetDifficulty(input.ratings[c])
  // Yesterday's weakest skill leads today, with a different game from that skill.
  const focus = input.rematch ? CATALOG.find((g) => g.id === input.rematch!.gameId) : undefined

  // No game from the last two missions (bonus rounds included). If too few games
  // are left to fill the day, relax to yesterday only, then to no limit.
  let core: CatalogEntry[] = []
  let warm: CatalogEntry | undefined
  let boss: CatalogEntry | undefined
  for (const days of [NO_REPEAT_DAYS, 1, 0]) {
    const excluded = recentCore(input.date, input.coreHistory, days)
    if (focus) excluded.add(focus.id)
    const r = rng.fork('window' + days)
    const fresh = CATALOG.filter((g) => !excluded.has(g.id))
    // Warm-up and boss first, so the core block cannot use up the last fresh one.
    const warms = fresh.filter((g) => g.category === 'reflex')
    const bosses = fresh.filter((g) => g.boss)
    if (!warms.length || !bosses.length) continue
    warm = r.pick(warms)
    boss = r.pick(bosses)
    const pool = fresh.filter((g) => g !== warm && g !== boss)
    const byCat = new Map<Category, CatalogEntry[]>()
    for (const g of pool) byCat.set(g.category, [...(byCat.get(g.category) ?? []), g])
    const cats = [...byCat.keys()]
    core = []
    if (focus && byCat.has(focus.category)) {
      core.push(r.pick(byCat.get(focus.category)!))
      cats.splice(cats.indexOf(focus.category), 1)
    }
    while (core.length < CORE_ROUNDS && cats.length) {
      const i = r.weighted(cats.map((c) => 1 + weak[c]))
      const cat = cats.splice(i, 1)[0]
      core.push(r.pick(byCat.get(cat)!))
    }
    if (core.length < CORE_ROUNDS) {
      warm = boss = undefined
      continue
    }
    break
  }
  if (!warm || !boss) throw new Error('compose: catalogue too small')

  const plan: RoundSpec[] = []
  plan.push({ phase: 'warmup', gameId: warm.id, category: warm.category, difficulty: clamp01(diff('reflex') - 0.2), seed: levelSeed(seed, warm.id, 'warmup') })

  for (const g of core) {
    const spec: RoundSpec = { phase: 'core', gameId: g.id, category: g.category, difficulty: diff(g.category), seed: levelSeed(seed, g.id, 'core') }
    if (focus && g === core[0] && g.category === focus.category) spec.note = `Focus: ${CATEGORY_LABEL[g.category]} cost you the most points yesterday (${focus.title}, ${Math.round(input.rematch!.score * 100)}%)`
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

/** Every catalogue game in a plan (warm-up, core, boss and bonus rounds). */
export function coreIdsOf(plan: RoundSpec[]): string[] {
  return plan.filter((r) => CATALOG.some((g) => g.id === r.gameId)).map((r) => r.gameId)
}

/** Yesterday's lowest scored game round under 70%, if any. */
export function weakestRound(results: { gameId: string; phase: string; score: number }[]): { gameId: string; score: number } | null {
  const games = results.filter((r) => CATALOG.some((g) => g.id === r.gameId) && r.score < 0.7)
  if (!games.length) return null
  const w = games.reduce((a, b) => (b.score < a.score ? b : a))
  return { gameId: w.gameId, score: w.score }
}

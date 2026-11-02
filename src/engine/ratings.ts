// Elo-style skill ratings and in-round staircases.
import { DEFAULT_RATING, ELO_K, TARGET_SUCCESS } from '../config'
import { CATEGORIES, type Category } from '../games/catalog'

export type Ratings = Record<Category, number>

export function defaultRatings(): Ratings {
  return Object.fromEntries(CATEGORIES.map((c) => [c, DEFAULT_RATING])) as Ratings
}

/** Difficulty 0..1 maps onto an Elo item rating from 700 to 1700. */
export const difficultyToElo = (d: number): number => 700 + d * 1000
export const eloToDifficulty = (e: number): number => clamp01((e - 700) / 1000)

export function expected(rating: number, itemElo: number): number {
  return 1 / (1 + Math.pow(10, (itemElo - rating) / 400))
}

/** The difficulty at which the player is predicted to succeed TARGET_SUCCESS of the time. */
export function targetDifficulty(rating: number): number {
  const offset = 400 * Math.log10(1 / TARGET_SUCCESS - 1)
  return eloToDifficulty(rating + offset)
}

/**
 * Update a rating after a round. `outcome` is 0..1 (round accuracy).
 * K shrinks over the first rounds of a skill so the first week adapts gently.
 */
export function updateRating(rating: number, difficulty: number, outcome: number, roundsPlayed: number): number {
  const k = roundsPlayed < 5 ? ELO_K * 0.6 : ELO_K
  const e = expected(rating, difficultyToElo(difficulty))
  const next = rating + k * (clamp01(outcome) - e) * 2
  return Math.round(Math.max(400, Math.min(2400, next)))
}

/** Mean rating; skills below it get more weight in selection. */
export function weaknessWeights(r: Ratings): Record<Category, number> {
  const mean = CATEGORIES.reduce((s, c) => s + r[c], 0) / CATEGORIES.length
  return Object.fromEntries(CATEGORIES.map((c) => [c, Math.max(0, Math.min(2, (mean - r[c]) / 150))])) as Record<
    Category,
    number
  >
}

/**
 * Transformed up/down staircase. With down=3, it converges near 79.4% correct.
 * `level` moves within [min, max] in `step` units; higher level = harder.
 */
export class Staircase {
  private streak = 0
  reversals = 0
  private lastDir = 0

  constructor(
    public level: number,
    private step: number,
    private min: number,
    private max: number,
    private down = 3,
  ) {}

  record(correct: boolean): number {
    if (correct) {
      this.streak++
      if (this.streak >= this.down) {
        this.streak = 0
        this.move(1)
      }
    } else {
      this.streak = 0
      this.move(-1)
    }
    return this.level
  }

  private move(dir: number): void {
    if (this.lastDir && dir !== this.lastDir) this.reversals++
    this.lastDir = dir
    this.level = Math.max(this.min, Math.min(this.max, this.level + dir * this.step))
  }
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

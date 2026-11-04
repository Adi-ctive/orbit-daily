import type { RNG } from '../lib/rng'
import type { Category } from './catalog'

export type Level = object

export interface RoundResult {
  /** 0..1 accuracy for the round. Feeds the skill rating. */
  score: number
  correct: number
  total: number
  /** The correct answer and a short explanation, shown after the round. */
  answer: string
  explanation: string
  /** Explainer rounds: what was read. */
  learned?: { id: string; title: string; category: string }
}

export interface SkillUpdate {
  skill: Category | null
  outcome: number
}

export type SfxName =
  | 'tap'
  | 'hover'
  | 'correct'
  | 'wrong'
  | 'combo'
  | 'warning'
  | 'start'
  | 'warp'
  | 'levelup'
  | 'unlock'
  | 'flip'
  | 'lock'

export type HapticName = 'tap' | 'correct' | 'wrong' | 'combo' | 'timerWarning' | 'unlock' | 'lock'

export interface GameFx {
  sfx(name: SfxName, combo?: number): void
  haptic(name: HapticName): void
  /** Screen shake in native pixels, capped at 2. */
  shake(px: number): void
  /** Lower music during fast reaction games. */
  duck(on: boolean): void
}

export interface GameContext<L extends Level = Level> {
  host: HTMLElement
  level: L
  difficulty: number
  rng: RNG
  fx: GameFx
  reducedMotion: boolean
  boss: boolean
  /** Item ids for system rounds (the explainer id). */
  items?: string[]
  finish(result: RoundResult): void
}

export interface GameInstance {
  destroy(): void
  pause?(): void
  resume?(): void
}

export interface GameModule<L extends Level = Level> {
  id: string
  category: Category
  title: string
  /** One or two short lines shown before the round starts. */
  howTo: string
  generate(rng: RNG, difficulty: number): L
  verify(level: L): boolean
  mount(ctx: GameContext<L>): GameInstance
  score(result: RoundResult): SkillUpdate
}

/** Shared generate → verify loop. Throws if no valid level appears, which tests catch. */
export function generateVerified<L extends Level>(m: GameModule<L>, rng: RNG, difficulty: number, tries = 200): L {
  for (let i = 0; i < tries; i++) {
    const lvl = m.generate(rng.fork('try' + i), difficulty)
    if (m.verify(lvl)) return lvl
  }
  throw new Error(`${m.id}: no valid level after ${tries} tries`)
}

export const defaultScore =
  (category: Category) =>
  (r: RoundResult): SkillUpdate => ({ skill: category, outcome: r.score })

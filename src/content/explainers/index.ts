import { RNG } from '../../lib/rng'
import { IDEAS } from './ideas'
import { SOCIETY } from './society'
import type { Explainer } from './types'
import { WORLD } from './world'
import { POLITICS2 } from './politics2'
import { ECONOMICS2 } from './economics2'
import { MIND2 } from './mind2'
import { PHILOSOPHY2 } from './philosophy2'
import { MATHS2 } from './maths2'
import { PHYSICS2 } from './physics2'
import { SPACE2 } from './space2'
import { ENGINEERING2 } from './engineering2'
import { TECH2 } from './tech2'
import { EARTH2 } from './earth2'
import { LIFE2 } from './life2'
import { HISTORY2 } from './history2'

export type { Explainer }

export const EXPLAINERS: Explainer[] = [
  ...SOCIETY,
  ...IDEAS,
  ...WORLD,
  ...POLITICS2,
  ...ECONOMICS2,
  ...MIND2,
  ...PHILOSOPHY2,
  ...MATHS2,
  ...PHYSICS2,
  ...SPACE2,
  ...ENGINEERING2,
  ...TECH2,
  ...EARTH2,
  ...LIFE2,
  ...HISTORY2,
]

/** Fixed shuffled order, so everyone reads the same explainer on the same day. */
const ORDER = new RNG('orbit-explainer-order-v1').shuffle(EXPLAINERS.map((e) => e.id))

/**
 * Today's explainer: start at the day's slot in the shared order and take the
 * first one this reader has not seen. Null once everything has been read.
 */
export function pickExplainer(dayNumber: number, seen: ReadonlySet<string>): Explainer | null {
  for (let k = 0; k < ORDER.length; k++) {
    const id = ORDER[(((dayNumber + k) % ORDER.length) + ORDER.length) % ORDER.length]
    if (!seen.has(id)) return EXPLAINERS.find((e) => e.id === id) ?? null
  }
  return null
}

export function getExplainer(id: string): Explainer | undefined {
  return EXPLAINERS.find((e) => e.id === id)
}

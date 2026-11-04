import { RNG } from '../../lib/rng'
import { IDEAS } from './ideas'
import { SOCIETY } from './society'
import type { Explainer } from './types'
import { WORLD } from './world'

export type { Explainer }

export const EXPLAINERS: Explainer[] = [...SOCIETY, ...IDEAS, ...WORLD]

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

// Seeded randomness. xmur3 hashes the seed string, sfc32 generates numbers.
// This is the only file allowed to touch Math.random (and it does not).

export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

export function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0
    b >>>= 0
    c >>>= 0
    d >>>= 0
    let t = (a + b) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    d = (d + 1) | 0
    t = (t + d) | 0
    c = (c + t) | 0
    return (t >>> 0) / 4294967296
  }
}

export class RNG {
  private next: () => number
  readonly seed: string

  constructor(seed: string) {
    this.seed = seed
    const h = xmur3(seed)
    this.next = sfc32(h(), h(), h(), h())
    // Discard the first outputs, as bryc recommends for sfc32.
    for (let i = 0; i < 12; i++) this.next()
  }

  /** Float in [0, 1). */
  float(): number {
    return this.next()
  }

  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  bool(p = 0.5): boolean {
    return this.next() < p
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick from empty array')
    return arr[Math.floor(this.next() * arr.length)]
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  /** Pick an index with probability proportional to its weight. */
  weighted(weights: readonly number[]): number {
    let total = 0
    for (const w of weights) total += Math.max(0, w)
    if (total <= 0) return this.int(0, weights.length - 1)
    let r = this.next() * total
    for (let i = 0; i < weights.length; i++) {
      r -= Math.max(0, weights[i])
      if (r < 0) return i
    }
    return weights.length - 1
  }

  /** A child generator with its own stream, stable for the same label. */
  fork(label: string): RNG {
    return new RNG(this.seed + '/' + label)
  }
}

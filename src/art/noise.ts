// Seeded 3D gradient noise and fBm. Deterministic for a given RNG.
import type { RNG } from '../lib/rng'

const GRAD = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
]

export class Noise3 {
  private perm = new Uint8Array(512)

  constructor(rng: RNG) {
    const p = rng.shuffle(Array.from({ length: 256 }, (_, i) => i))
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255]
  }

  /** Perlin noise in roughly [-1, 1]. */
  noise(x: number, y: number, z: number): number {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const zi = Math.floor(z)
    const xf = x - xi
    const yf = y - yi
    const zf = z - zi
    const X = xi & 255
    const Y = yi & 255
    const Z = zi & 255
    const u = fade(xf)
    const v = fade(yf)
    const w = fade(zf)
    const p = this.perm
    const A = p[X] + Y
    const AA = p[A] + Z
    const AB = p[A + 1] + Z
    const B = p[X + 1] + Y
    const BA = p[B] + Z
    const BB = p[B + 1] + Z
    return lerp(
      w,
      lerp(
        v,
        lerp(u, grad(p[AA], xf, yf, zf), grad(p[BA], xf - 1, yf, zf)),
        lerp(u, grad(p[AB], xf, yf - 1, zf), grad(p[BB], xf - 1, yf - 1, zf)),
      ),
      lerp(
        v,
        lerp(u, grad(p[AA + 1], xf, yf, zf - 1), grad(p[BA + 1], xf - 1, yf, zf - 1)),
        lerp(u, grad(p[AB + 1], xf, yf - 1, zf - 1), grad(p[BB + 1], xf - 1, yf - 1, zf - 1)),
      ),
    )
  }

  /** Fractal sum, normalised to roughly [0, 1]. */
  fbm(x: number, y: number, z: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
    let amp = 0.5
    let freq = 1
    let sum = 0
    let norm = 0
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.noise(x * freq, y * freq, z * freq)
      norm += amp
      amp *= gain
      freq *= lacunarity
    }
    return 0.5 + (0.5 * sum) / norm / 0.7
  }
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a)
}

function grad(h: number, x: number, y: number, z: number): number {
  const g = GRAD[h % 12]
  return g[0] * x + g[1] * y + g[2] * z
}

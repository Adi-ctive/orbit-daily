// Shared colour palette for the game canvases: calm, realistic space tones.

export type RGB = readonly [number, number, number]

function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Named ramps, darkest first. Ramps are what the shaders index into. */
export const RAMPS = {
  void: ['#03050b', '#070b17', '#0c1224', '#141c33', '#1d2742'],
  indigo: ['#25315c', '#33427a', '#46599c', '#6680c4', '#8fa8e6'],
  violet: ['#2c2245', '#3e3062', '#56448a', '#7563b3', '#9a8ad6'],
  teal: ['#0c2a33', '#12404a', '#1b5d66', '#2b8088', '#45a6a8'],
  cyan: ['#6cc7e0', '#9fdcf0', '#d6f2fb'],
  magenta: ['#4a1d3a', '#6c2a54', '#93406f', '#c06192', '#e08db5'],
  amber: ['#5a2f12', '#8a4c1c', '#c07a2c', '#efa94a', '#ffc978', '#ffe6b8'],
  star: ['#5c6478', '#8d96ab', '#bfc6d6', '#e9edf5', '#ffffff'],
  green: ['#173a2a', '#24613f', '#3f9a62', '#6fdc9b'],
  lava: ['#3a0f10', '#6e1f1b', '#c2412e', '#ff7a6b'],
  earth: ['#3d2c22', '#6a4d36'],
} as const

export type RampName = keyof typeof RAMPS

export const PALETTE_HEX: string[] = Object.values(RAMPS).flat()
export const PALETTE: RGB[] = PALETTE_HEX.map(hex)

export const RAMP_RGB: Record<RampName, RGB[]> = Object.fromEntries(
  Object.entries(RAMPS).map(([k, v]) => [k, v.map(hex)]),
) as Record<RampName, RGB[]>

/** Common UI colours, all taken from the palette. */
export const C = {
  bg: RAMPS.void[1],
  deep: RAMPS.void[0],
  panel: RAMPS.void[3],
  panelHi: RAMPS.void[4],
  ink: RAMPS.star[3],
  inkBright: RAMPS.star[4],
  muted: RAMPS.star[1],
  dim: RAMPS.star[0],
  outline: RAMPS.violet[0],
  amber: RAMPS.amber[3],
  amberHi: RAMPS.amber[4],
  cyan: RAMPS.cyan[0],
  cyanHi: RAMPS.cyan[1],
  magenta: RAMPS.magenta[3],
  good: RAMPS.green[3],
  bad: RAMPS.lava[3],
} as const

/** 4×4 ordered (Bayer) dither thresholds in [0, 1). */
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)

export function bayer(x: number, y: number): number {
  return BAYER4[((y & 3) << 2) | (x & 3)]
}

/** Pick a ramp step for a 0..1 value with ordered dithering. */
export function rampIndex(value: number, steps: number, x: number, y: number): number {
  const v = Math.max(0, Math.min(0.9999, value)) * (steps - 1)
  const base = Math.floor(v)
  return Math.min(steps - 1, base + (v - base > bayer(x, y) ? 1 : 0))
}

const nearestCache = new Map<number, number>()

/** Index of the nearest palette colour (weighted RGB distance). */
export function nearestIndex(r: number, g: number, b: number): number {
  const key = (r << 16) | (g << 8) | b
  const hit = nearestCache.get(key)
  if (hit !== undefined) return hit
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < PALETTE.length; i++) {
    const p = PALETTE[i]
    const dr = r - p[0]
    const dg = g - p[1]
    const db = b - p[2]
    const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  nearestCache.set(key, best)
  return best
}

/** Snap an ImageData to the palette in place. */
export function quantize(img: ImageData): void {
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    const p = PALETTE[nearestIndex(d[i], d[i + 1], d[i + 2])]
    d[i] = p[0]
    d[i + 1] = p[1]
    d[i + 2] = p[2]
    d[i + 3] = 255
  }
}

export function rgbCss(c: RGB): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

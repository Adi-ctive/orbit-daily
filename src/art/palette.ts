// Master palette (48 colours). Every procedural and hand-made asset uses these.

export type RGB = readonly [number, number, number]

function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Named ramps, darkest first. Ramps are what the shaders index into. */
export const RAMPS = {
  void: ['#05030f', '#0b0820', '#140f33', '#1d1647', '#2a1f5e'],
  indigo: ['#2c2470', '#3b3591', '#4f4cb0', '#6b6fd0', '#8d97e6'],
  violet: ['#3a1a5c', '#55247a', '#73319a', '#9446b5', '#b86ad0'],
  teal: ['#0c2b3a', '#114552', '#18636b', '#22867f', '#36a893'],
  cyan: ['#3cc6d6', '#7fe3ea', '#c2f5f4'],
  magenta: ['#5c1550', '#86206b', '#b0307f', '#d84d93', '#f07fb0'],
  amber: ['#6b2e12', '#9a4a17', '#c86f1f', '#f0a03a', '#ffcf6b', '#fff0b8'],
  star: ['#7a6f9e', '#a99fc4', '#d8cfe0', '#f4ecdc', '#fff9ec'],
  green: ['#1d3d2a', '#2e6b3a', '#4f9a46', '#8ccf5e'],
  lava: ['#3d0d14', '#7a1a1a', '#c23a22', '#ff6a2a'],
  earth: ['#4a3326', '#7a5a3c'],
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

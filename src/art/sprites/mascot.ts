// Pip, the original star-creature guide. A puffy five-point star built in code
// at 48×48, shaded with 5 tones, a coloured outline, and expression frames.
import { RAMPS } from '../palette'
import { bayer } from '../palette'
import { outline, type IndexedSprite } from './sprite'

export type Mood = 'idle' | 'blink' | 'happy' | 'sad' | 'cheer' | 'sleep'

const S = 48
// Index → colour. 1 outline, 2-6 body tones, 7 eye, 8 eye shine, 9 cheek, 10 sparkle, 11 mouth.
const COLORS = [
  '',
  RAMPS.amber[0],
  RAMPS.amber[1],
  RAMPS.amber[2],
  RAMPS.amber[3],
  RAMPS.amber[4],
  RAMPS.amber[5],
  RAMPS.void[2],
  RAMPS.star[4],
  RAMPS.magenta[3],
  RAMPS.cyan[1],
  RAMPS.lava[1],
]

function body(bob: number, squash: number): Uint8Array {
  const d = new Uint8Array(S * S)
  const cx = 23.5
  const cy = 25.5 + bob
  const R = 17
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5 - cx) / (1 + squash)
      const dy = (y + 0.5 - cy) * (1 + squash)
      const r = Math.hypot(dx, dy)
      const th = Math.atan2(dy, dx) + Math.PI / 2
      // Soft star: blend a circle with a 5-lobe cosine.
      const edge = R * (0.74 + 0.26 * Math.pow(0.5 + 0.5 * Math.cos(5 * th), 1.6))
      if (r > edge) continue
      const t = r / edge
      const nz = Math.sqrt(Math.max(0, 1 - t * t))
      const nx = (dx / (r || 1)) * t
      const ny = (dy / (r || 1)) * t
      let l = -0.55 * nx - 0.6 * ny + 0.58 * nz
      l = Math.max(0, Math.min(1, (l + 0.3) / 1.2))
      const v = l * 4.0
      let i = Math.floor(v)
      if (v - i > bayer(x, y)) i++
      d[y * S + x] = 2 + Math.min(4, i)
    }
  return d
}

function setPx(d: Uint8Array, x: number, y: number, c: number): void {
  if (x >= 0 && y >= 0 && x < S && y < S) d[y * S + x] = c
}

function rect(d: Uint8Array, x: number, y: number, w: number, h: number, c: number): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) setPx(d, x + i, y + j, c)
}

function face(d: Uint8Array, mood: Mood, bob: number): void {
  const ey = 23 + bob
  const lx = 17
  const rx = 27
  if (mood === 'blink' || mood === 'sleep') {
    rect(d, lx, ey + 2, 4, 1, 7)
    rect(d, rx, ey + 2, 4, 1, 7)
  } else if (mood === 'happy' || mood === 'cheer') {
    // ^ ^ eyes
    for (const ex of [lx, rx]) {
      setPx(d, ex, ey + 2, 7)
      setPx(d, ex + 1, ey + 1, 7)
      setPx(d, ex + 2, ey + 1, 7)
      setPx(d, ex + 3, ey + 2, 7)
    }
  } else {
    for (const ex of [lx, rx]) {
      rect(d, ex, ey, 3, 5, 7)
      rect(d, ex + 1, ey - 1, 1, 1, 7)
      setPx(d, ex, ey, 8)
      setPx(d, ex + 1, ey + 1, 8)
    }
    if (mood === 'sad') {
      rect(d, lx - 1, ey - 3, 2, 1, 3)
      rect(d, lx + 1, ey - 2, 2, 1, 3)
      rect(d, rx + 2, ey - 3, 2, 1, 3)
      rect(d, rx, ey - 2, 2, 1, 3)
    }
  }
  // Cheeks.
  rect(d, lx - 2, ey + 5, 2, 1, 9)
  rect(d, rx + 3, ey + 5, 2, 1, 9)
  // Mouth.
  const my = ey + 7
  if (mood === 'happy' || mood === 'cheer') {
    rect(d, 21, my, 6, 1, 7)
    rect(d, 22, my + 1, 4, 1, 11)
    rect(d, 22, my + 2, 4, 1, 7)
  } else if (mood === 'sad') {
    rect(d, 22, my + 1, 4, 1, 7)
    setPx(d, 21, my + 2, 7)
    setPx(d, 26, my + 2, 7)
  } else if (mood === 'sleep') {
    rect(d, 23, my, 2, 2, 7)
  } else {
    setPx(d, 22, my, 7)
    rect(d, 23, my + 1, 2, 1, 7)
    setPx(d, 25, my, 7)
  }
}

function sparkles(d: Uint8Array, phase: number): void {
  const pts = [
    [5, 8],
    [41, 6],
    [43, 34],
    [4, 38],
  ]
  pts.forEach(([x, y], i) => {
    if ((i + phase) % 2) return
    setPx(d, x, y, 10)
    setPx(d, x - 1, y, 10)
    setPx(d, x + 1, y, 10)
    setPx(d, x, y - 1, 10)
    setPx(d, x, y + 1, 10)
  })
}

function zzz(d: Uint8Array): void {
  for (const [x, y, s] of [
    [36, 10, 3],
    [41, 4, 2],
  ]) {
    rect(d, x, y, s, 1, 8)
    for (let i = 1; i < s; i++) setPx(d, x + s - 1 - i, y + i, 8)
    rect(d, x, y + s, s, 1, 8)
  }
}

export function mascotFrame(mood: Mood, frame: number): IndexedSprite {
  const bob = mood === 'cheer' ? (frame % 2 ? -3 : 0) : frame % 2 ? 1 : 0
  const squash = mood === 'cheer' && frame % 2 === 0 ? 0.06 : 0
  const d = body(bob, squash)
  face(d, mood, bob)
  const s = outline({ w: S, h: S, data: d, colors: COLORS }, 1)
  if (mood === 'cheer' || mood === 'happy') sparkles(s.data, frame)
  if (mood === 'sleep') zzz(s.data)
  return s
}

export const MASCOT_SIZE = S

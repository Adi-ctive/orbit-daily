// Isobar Wind Reader: a generated pressure map. Pick which way the surface wind
// blows at the marked point and how strong it is.
// Physics: geostrophic wind runs along the isobars with low pressure on the left
// in the northern hemisphere (Buys Ballot's law) and on the right in the
// southern; near the ground, friction turns it about 25° toward the low.
import { line, rect } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import { makeOffscreen } from '../art/pixelCanvas'
import type { RNG } from '../lib/rng'
import { button, el, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

interface Centre {
  x: number
  y: number
  amp: number
  sigma: number
}
interface Trial {
  centres: Centre[]
  px: number
  py: number
  north: boolean
  dir: number
}
interface L {
  trials: Trial[]
}

export const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const NAMES = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']
const FRICTION = (25 * Math.PI) / 180

export function pressure(cs: Centre[], x: number, y: number): number {
  let p = 1012
  for (const c of cs) p += c.amp * Math.exp(-((x - c.x) ** 2 + (y - c.y) ** 2) / (2 * c.sigma * c.sigma))
  return p
}

/** Gradient in hPa per map width, with y pointing north (up). */
export function gradient(cs: Centre[], x: number, y: number): [number, number] {
  let gx = 0
  let gy = 0
  for (const c of cs) {
    const e = c.amp * Math.exp(-((x - c.x) ** 2 + (y - c.y) ** 2) / (2 * c.sigma * c.sigma))
    gx += (-e * (x - c.x)) / (c.sigma * c.sigma)
    gy += (-e * (y - c.y)) / (c.sigma * c.sigma)
  }
  return [gx, gy]
}

/** Surface wind direction (blowing toward), radians, math convention (0 = east, CCW, y north). */
export function windAngle(cs: Centre[], x: number, y: number, north: boolean): number {
  const [gx, gy] = gradient(cs, x, y)
  const m = Math.hypot(gx, gy)
  // Geostrophic: k × ∇p in the north, −k × ∇p in the south.
  let vx = -gy / m
  let vy = gx / m
  if (!north) {
    vx = -vx
    vy = -vy
  }
  // Friction turns it toward low pressure (−∇p).
  const lx = -gx / m
  const ly = -gy / m
  return Math.atan2(vy * Math.cos(FRICTION) + ly * Math.sin(FRICTION), vx * Math.cos(FRICTION) + lx * Math.sin(FRICTION))
}

/** Compass sector 0..7 (0 = toward north) and how far from the sector centre (radians). */
export function sector(angle: number): { s: number; off: number } {
  const bearing = ((Math.PI / 2 - angle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
  const s = Math.round(bearing / (Math.PI / 4)) % 8
  const off = Math.abs(((bearing - s * (Math.PI / 4) + Math.PI) % (2 * Math.PI)) - Math.PI)
  return { s, off }
}

/** One clear high and one clear low, with the point somewhere between them. */
function makeTrial(rng: RNG): Trial | null {
  const hx = rng.range(0.15, 0.85)
  const hy = rng.range(0.15, 0.85)
  let lx = 0
  let ly = 0
  for (let g = 0; g < 30; g++) {
    lx = rng.range(0.15, 0.85)
    ly = rng.range(0.15, 0.85)
    if (Math.hypot(lx - hx, ly - hy) > 0.5) break
  }
  if (Math.hypot(lx - hx, ly - hy) <= 0.5) return null
  const centres: Centre[] = [
    { x: hx, y: hy, amp: rng.range(14, 24), sigma: rng.range(0.2, 0.28) },
    { x: lx, y: ly, amp: -rng.range(14, 24), sigma: rng.range(0.2, 0.28) },
  ]
  const north = rng.bool(0.55)
  for (let g = 0; g < 30; g++) {
    // Between the two centres, nudged sideways a little.
    const k = rng.range(0.35, 0.65)
    const side = rng.range(-0.14, 0.14)
    const dx = lx - hx
    const dy = ly - hy
    const len = Math.hypot(dx, dy)
    const px = hx + dx * k - (dy / len) * side
    const py = hy + dy * k + (dx / len) * side
    if (px < 0.12 || px > 0.88 || py < 0.12 || py > 0.88) continue
    if (centres.some((c) => Math.hypot(c.x - px, c.y - py) < 0.15)) continue
    const [gx, gy] = gradient(centres, px, py)
    if (Math.hypot(gx, gy) < 8) continue
    const { s, off } = sector(windAngle(centres, px, py, north))
    if (off > (15 * Math.PI) / 180) continue
    return { centres, px, py, north, dir: s }
  }
  return null
}

function generate(rng: RNG, _d: number): L {
  const trials: Trial[] = []
  for (let g = 0; g < 120 && trials.length < 4; g++) {
    const t = makeTrial(rng)
    if (t) trials.push(t)
  }
  return { trials }
}

function verify(l: L): boolean {
  return (
    l.trials.length === 4 &&
    l.trials.every((t) => {
      const { s, off } = sector(windAngle(t.centres, t.px, t.py, t.north))
      return t.centres.length === 2 && t.centres[0].amp > 0 && t.centres[1].amp < 0 && s === t.dir && off <= (15 * Math.PI) / 180
    })
  )
}

/** Pressure map at full device resolution: soft tints for highs and lows, thin isobars every 4 hPa. */
function renderMap(t: Trial, w: number, h: number, res: number): HTMLCanvasElement {
  const W = Math.max(1, Math.round(w * res))
  const H = Math.max(1, Math.round(h * res))
  const { canvas, ctx } = makeOffscreen(W, H)
  const img = ctx.createImageData(W, H)
  const band = (p: number) => Math.floor(p / 4)
  const P = (x: number, y: number) => pressure(t.centres, x / W, 1 - y / H)
  const base = [12, 18, 36]
  const low = [70, 60, 140]
  const high = [150, 96, 44]
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = P(x, y)
      const dev = p - 1012
      const k = Math.min(1, Math.abs(dev) / 28) * 0.55
      const tint = dev < 0 ? low : high
      let r = base[0] + (tint[0] - base[0]) * k
      let gg = base[1] + (tint[1] - base[1]) * k
      let bb = base[2] + (tint[2] - base[2]) * k
      if (band(p) !== band(P(x + 1, y)) || band(p) !== band(P(x, y + 1))) {
        const v = band(p) % 2 ? 0.85 : 0.6
        r = 233 * v
        gg = 237 * v
        bb = 245 * v
      }
      const o = (y * W + x) * 4
      img.data[o] = r
      img.data[o + 1] = gg
      img.data[o + 2] = bb
      img.data[o + 3] = 255
    }
  ctx.putImageData(img, 0, 0)
  ctx.scale(res, res)
  for (const c of t.centres) drawText(ctx, c.amp > 0 ? 'H' : 'L', c.x * w, (1 - c.y) * h - 5, c.amp > 0 ? RAMPS.amber[4] : RAMPS.cyan[1], 1.6, 'center')
  return canvas
}

const mod: GameModule<L> = {
  id: 'isobar-wind',
  category: 'stem',
  title: 'Isobar Wind Reader',
  rules: {
    goal: "Read which way the wind blows.",
    steps: ["Lines join places with equal air pressure. H is high, L is low.","Find the marker between them.","North: put the wind at your back and the low is on your left. South: on your right.","Tap the direction the wind blows toward. 4 maps."],
  },
  howTo: 'Wind circles highs and lows instead of blowing straight between them. In the north, stand with the wind at your back and the low is on your left. In the south, it is on your right. Near the ground the wind also bends a little toward the low. Pick where it blows at the marker.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 160, 160)
    const { pc } = st
    const L = ctx.level
    let i = 0
    let score = 0
    const notes: string[] = []
    let map: HTMLCanvasElement | null = null
    let reveal = false

    const draw = () => {
      const t = L.trials[i]
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const res = Math.min(pc.res, 2)
      if (!map || map.width !== Math.round(pc.w * res) || map.height !== Math.round(pc.h * res)) map = renderMap(t, pc.w, pc.h, res)
      g.drawImage(map, 0, 0, pc.w, pc.h)
      const x = Math.round(t.px * pc.w)
      const y = Math.round((1 - t.py) * pc.h)
      rect(g, x - 5, y, 4, 1, C.amberHi)
      rect(g, x + 2, y, 4, 1, C.amberHi)
      rect(g, x, y - 5, 1, 4, C.amberHi)
      rect(g, x, y + 2, 1, 4, C.amberHi)
      // North arrow and hemisphere.
      line(g, pc.w - 6, 14, pc.w - 6, 4, RAMPS.star[3])
      rect(g, pc.w - 7, 5, 3, 1, RAMPS.star[3])
      drawText(g, 'N', pc.w - 6, 16, RAMPS.star[3], 1, 'center')
      drawText(g, t.north ? 'NORTH HEMI' : 'SOUTH HEMI', 3, 3, t.north ? RAMPS.cyan[1] : RAMPS.magenta[4])
      if (reveal) {
        const a = windAngle(t.centres, t.px, t.py, t.north)
        const len = 14
        const ex = x + Math.cos(a) * len
        const ey = y - Math.sin(a) * len
        line(g, x, y, ex, ey, C.good)
        for (const s of [-1, 1]) line(g, ex, ey, ex - Math.cos(a + s * 0.5) * 5, ey + Math.sin(a + s * 0.5) * 5, C.good)
      }
    }

    const ask = () => {
      const t = L.trials[i]
      reveal = false
      map = null
      draw()
      st.hud.textContent = `Map ${i + 1} / ${L.trials.length} · ${t.north ? 'northern' : 'southern'} hemisphere · wind blows toward…`
      const rule = el('p', { class: 'iw-rule', text: t.north ? 'North: wind at your back, low on your LEFT.' : 'South: wind at your back, low on your RIGHT.' })
      const dirGrid = el('div', { class: 'iw-grid' })
      for (const k of [7, 0, 1, 6, -1, 2, 5, 4, 3]) {
        if (k < 0) {
          dirGrid.append(el('span', { class: 'iw-mid', text: '✛' }))
          continue
        }
        const b = button(COMPASS[k], () => {
          const ok = k === t.dir
          if (ok) score++
          ctx.fx.sfx(ok ? 'correct' : 'wrong')
          ctx.fx.haptic(ok ? 'correct' : 'wrong')
          reveal = true
          draw()
          const low = t.centres[1]
          const lowDir = sector(Math.atan2(low.y - t.py, low.x - t.px)).s
          const note = `The low is to the ${NAMES[lowDir]}. In the ${t.north ? 'north' : 'south'} the wind keeps it on its ${t.north ? 'left' : 'right'}, bending slightly toward it, so it blows toward the ${NAMES[t.dir]}.`
          notes.push(note)
          st.hud.textContent = ok ? '✓ Correct' : `✗ It blows toward ${COMPASS[t.dir]}`
          st.controls.replaceChildren(
            el('p', { class: 'g-text', text: note }),
            button(i + 1 < L.trials.length ? 'Next map' : 'Finish', () => {
              i++
              if (i < L.trials.length) ask()
              else
                ctx.finish({
                  score: score / L.trials.length,
                  correct: score,
                  total: L.trials.length,
                  answer: `${score} of ${L.trials.length} wind directions right.`,
                  explanation: 'Earth\'s spin deflects moving air (the Coriolis effect), to the right in the north and to the left in the south. So instead of rushing straight from high to low, wind runs along the isobars around them. Friction near the ground turns it about 25° toward the low. Closer lines mean stronger wind.',
                })
            }, 'big'),
          )
        })
        b.setAttribute('aria-label', 'Toward ' + COMPASS[k])
        dirGrid.append(b)
      }
      st.controls.replaceChildren(rule, dirGrid)
    }
    ask()
    const ro = new ResizeObserver(() => draw())
    ro.observe(st.canvasBox)
    return {
      destroy() {
        ro.disconnect()
        st.destroy()
      },
    }
  },
  score: defaultScore('stem'),
}

export default mod

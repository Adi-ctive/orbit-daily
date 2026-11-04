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
  strength: number
}
interface L {
  trials: Trial[]
}

export const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const STRENGTH = ['Light', 'Moderate', 'Strong']
const FRICTION = (25 * Math.PI) / 180
/** hPa per map width; thresholds for strength classes. */
const LIGHT_MAX = 28
const MOD_MAX = 60

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

function makeTrial(rng: RNG): Trial | null {
  const k = rng.int(2, 4)
  const centres: Centre[] = []
  for (let i = 0; i < k; i++) {
    centres.push({ x: rng.range(0.1, 0.9), y: rng.range(0.1, 0.9), amp: (rng.bool() ? 1 : -1) * rng.range(10, 26), sigma: rng.range(0.14, 0.26) })
  }
  const north = rng.bool(0.6)
  for (let g = 0; g < 30; g++) {
    const px = rng.range(0.2, 0.8)
    const py = rng.range(0.2, 0.8)
    if (centres.some((c) => Math.hypot(c.x - px, c.y - py) < 0.1)) continue
    const [gx, gy] = gradient(centres, px, py)
    const mag = Math.hypot(gx, gy)
    if (mag < 8) continue
    const { s, off } = sector(windAngle(centres, px, py, north))
    if (off > (15 * Math.PI) / 180) continue
    const nearEdge = [LIGHT_MAX, MOD_MAX].some((t) => Math.abs(mag - t) / t < 0.15)
    if (nearEdge || mag > 140) continue
    return { centres, px, py, north, dir: s, strength: mag < LIGHT_MAX ? 0 : mag < MOD_MAX ? 1 : 2 }
  }
  return null
}

function generate(rng: RNG, _d: number): L {
  const trials: Trial[] = []
  for (let g = 0; g < 80 && trials.length < 3; g++) {
    const t = makeTrial(rng)
    if (t) trials.push(t)
  }
  return { trials }
}

function verify(l: L): boolean {
  return (
    l.trials.length === 3 &&
    l.trials.every((t) => {
      const { s, off } = sector(windAngle(t.centres, t.px, t.py, t.north))
      const [gx, gy] = gradient(t.centres, t.px, t.py)
      const mag = Math.hypot(gx, gy)
      return s === t.dir && off <= (15 * Math.PI) / 180 && (mag < LIGHT_MAX ? 0 : mag < MOD_MAX ? 1 : 2) === t.strength
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
  howTo: 'Lines join places of equal air pressure (every 4 hPa). At the marked point, which way does the surface wind blow, and how strong is it? Check the hemisphere.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 160, 160)
    const { pc } = st
    const L = ctx.level
    let i = 0
    let score = 0
    let dirOk = 0
    let strOk = 0
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
      st.hud.textContent = `Map ${i + 1} / ${L.trials.length} · wind blowing toward…`
      let pickedDir = -1
      const dirGrid = el('div', { class: 'iw-grid' })
      const order = [7, 0, 1, 6, -1, 2, 5, 4, 3]
      for (const k of order) {
        if (k < 0) {
          dirGrid.append(el('span', { class: 'iw-mid', text: '✛' }))
          continue
        }
        const b = button(COMPASS[k], () => {
          pickedDir = k
          ctx.fx.sfx('tap')
          st.hud.textContent = 'How strong?'
          st.controls.replaceChildren(
            ...STRENGTH.map((s, j) =>
              button(s, () => {
                const dOk = pickedDir === t.dir
                const sOk = j === t.strength
                dirOk += dOk ? 1 : 0
                strOk += sOk ? 1 : 0
                score += (dOk ? 0.7 : 0) + (sOk ? 0.3 : 0)
                ctx.fx.sfx(dOk ? 'correct' : 'wrong')
                ctx.fx.haptic(dOk ? 'correct' : 'wrong')
                reveal = true
                draw()
                const side = t.north ? 'left' : 'right'
                const from = COMPASS[(t.dir + 4) % 8]
                const note = `Toward ${COMPASS[t.dir]} (a ${from === 'N' ? 'northerly' : from === 'S' ? 'southerly' : from === 'E' ? 'easterly' : from === 'W' ? 'westerly' : from + ' wind'}), ${STRENGTH[t.strength].toLowerCase()}. With your back to the wind in the ${t.north ? 'north' : 'south'}, low pressure is on your ${side}.`
                notes.push(note)
                st.hud.textContent = `${dOk ? '✓' : '✗'} direction · ${sOk ? '✓' : '✗'} strength`
                st.controls.replaceChildren(
                  el('p', { class: 'g-text', text: note }),
                  button(i + 1 < L.trials.length ? 'Next map' : 'Finish', () => {
                    i++
                    if (i < L.trials.length) ask()
                    else
                      ctx.finish({
                        score: score / L.trials.length,
                        correct: dirOk,
                        total: L.trials.length,
                        answer: `${dirOk}/${L.trials.length} directions and ${strOk}/${L.trials.length} strengths right.`,
                        explanation: `Air flows along isobars because Earth's spin (the Coriolis effect) deflects it, right in the north and left in the south. Ground friction turns it about 25° toward the low. Closer isobars mean a steeper pressure slope and stronger wind. ${notes.join(' ')}`,
                      })
                  }, 'big'),
                )
              }),
            ),
          )
        })
        b.setAttribute('aria-label', 'Toward ' + COMPASS[k])
        dirGrid.append(b)
      }
      st.controls.replaceChildren(dirGrid)
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

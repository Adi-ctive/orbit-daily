// Wind Rider: a balloon drifts on the surface wind over a generated pressure map.
// Pick the launch pad that lets the wind carry it onto the beacon, then watch it fly.
// Physics: geostrophic wind runs along the isobars with low pressure on the left
// in the northern hemisphere (Buys Ballot's law) and on the right in the
// southern. Near the ground, friction turns it about 25° toward the low, so air
// spirals in to lows and out of highs. The flight is that field integrated step by step.
import { disc, halo, line, ring, starShape, arrow } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import { makeOffscreen } from '../art/pixelCanvas'
import type { RNG } from '../lib/rng'
import { button, el, Loop, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

interface Centre {
  x: number
  y: number
  amp: number
  sigma: number
}
export interface Pt {
  x: number
  y: number
}
interface Trial {
  centres: Centre[]
  north: boolean
  target: Pt
  pads: Pt[]
  answer: number
}
interface L {
  trials: Trial[]
}

export const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const FRICTION = (25 * Math.PI) / 180
const STEP = 0.008
const HIT = 0.035
const MISS = 0.1
const PAD_NAMES = ['A', 'B', 'C', 'D']
const TRIALS = 5

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
  const m = Math.hypot(gx, gy) || 1
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
  return Math.atan2(
    vy * Math.cos(FRICTION) + ly * Math.sin(FRICTION),
    vx * Math.cos(FRICTION) + lx * Math.sin(FRICTION),
  )
}

/** Compass sector 0..7 (0 = toward north) and how far from the sector centre (radians). */
export function sector(angle: number): { s: number; off: number } {
  const bearing = (((Math.PI / 2 - angle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  const s = Math.round(bearing / (Math.PI / 4)) % 8
  const off = Math.abs(((bearing - s * (Math.PI / 4) + Math.PI) % (2 * Math.PI)) - Math.PI)
  return { s, off }
}

/**
 * The balloon's track: midpoint steps along the wind (sign 1) or against it (sign −1, to trace
 * where air came from). Stops at the map edge, in calm air, or when caught in a low's centre.
 */
export function drift(cs: Centre[], north: boolean, start: Pt, sign = 1, maxSteps = 220): Pt[] {
  let { x, y } = start
  const pts: Pt[] = [{ x, y }]
  for (let k = 0; k < maxSteps; k++) {
    const [gx, gy] = gradient(cs, x, y)
    if (Math.hypot(gx, gy) < 1.5) break
    const a0 = windAngle(cs, x, y, north)
    const mx = x + sign * Math.cos(a0) * STEP * 0.5
    const my = y + sign * Math.sin(a0) * STEP * 0.5
    const a = windAngle(cs, mx, my, north)
    x += sign * Math.cos(a) * STEP
    y += sign * Math.sin(a) * STEP
    if (x < 0.02 || x > 0.98 || y < 0.02 || y > 0.98) break
    pts.push({ x, y })
    if (sign > 0 && cs.some((c) => c.amp < 0 && Math.hypot(c.x - x, c.y - y) < 0.05)) break
  }
  return pts
}

/** Closest the track comes to a point. */
export function missBy(path: Pt[], p: Pt): number {
  let m = Infinity
  for (const q of path) m = Math.min(m, Math.hypot(q.x - p.x, q.y - p.y))
  return m
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)
const inside = (p: Pt, m: number) => p.x > m && p.x < 1 - m && p.y > m && p.y < 1 - m

function makeTrial(rng: RNG, d: number): Trial | null {
  // One high and one low, plus a third system on harder maps.
  const n = d > 0.45 && rng.bool(0.3 + d * 0.5) ? 3 : 2
  const centres: Centre[] = []
  for (let g = 0; g < 40 && centres.length < n; g++) {
    const c = { x: rng.range(0.15, 0.85), y: rng.range(0.15, 0.85), amp: 0, sigma: rng.range(0.18, 0.26) }
    if (centres.some((o) => dist(o, c) < 0.38)) continue
    const sign = centres.length === 0 ? 1 : centres.length === 1 ? -1 : rng.bool() ? 1 : -1
    c.amp = sign * rng.range(14, 24)
    centres.push(c)
  }
  if (centres.length < n) return null
  const north = rng.bool()

  let target: Pt | null = null
  for (let g = 0; g < 30 && !target; g++) {
    const p = { x: rng.range(0.2, 0.8), y: rng.range(0.2, 0.8) }
    const [gx, gy] = gradient(centres, p.x, p.y)
    if (centres.some((c) => dist(c, p) < 0.13) || Math.hypot(gx, gy) < 10) continue
    target = p
  }
  if (!target) return null

  // Trace the air back from the beacon: the right pad sits upwind on that track.
  const back = drift(centres, north, target, -1, rng.int(40, 70))
  if (back.length < 36) return null
  const pad = back[back.length - 1]
  if (!inside(pad, 0.08) || dist(pad, target) < 0.2) return null
  if (missBy(drift(centres, north, pad), target) > HIT) return null

  const pads: Pt[] = [pad]
  const ok = (p: Pt) =>
    inside(p, 0.08) &&
    dist(p, target) > 0.16 &&
    pads.every((q) => dist(q, p) > 0.14) &&
    centres.every((c) => dist(c, p) > 0.08) &&
    missBy(drift(centres, north, p), target) > MISS
  // A decoy for the classic mistake: the pad that works in the other hemisphere.
  const wrong = drift(centres, !north, target, -1, back.length - 1)
  if (wrong.length > 25 && ok(wrong[wrong.length - 1])) pads.push(wrong[wrong.length - 1])
  for (let g = 0; g < 60 && pads.length < 4; g++) {
    const a = rng.range(0, Math.PI * 2)
    const r = rng.range(0.2, 0.5)
    const p = { x: target.x + Math.cos(a) * r, y: target.y + Math.sin(a) * r }
    if (ok(p)) pads.push(p)
  }
  if (pads.length < 4) return null
  const order = rng.shuffle([0, 1, 2, 3])
  return { centres, north, target, pads: order.map((k) => pads[k]), answer: order.indexOf(0) }
}

function generate(rng: RNG, d: number): L {
  const trials: Trial[] = []
  for (let g = 0; g < 300 && trials.length < TRIALS; g++) {
    const t = makeTrial(rng, Math.min(1, d + trials.length * 0.08))
    if (t) trials.push(t)
  }
  return { trials }
}

function verify(l: L): boolean {
  return (
    l.trials.length === TRIALS &&
    l.trials.every((t) => {
      if (t.pads.length !== 4 || !t.centres.some((c) => c.amp > 0) || !t.centres.some((c) => c.amp < 0))
        return false
      // Exactly one pad's flight reaches the beacon, and the others clearly miss.
      return t.pads.every((p, k) => {
        const m = missBy(drift(t.centres, t.north, p), t.target)
        return k === t.answer ? m <= HIT : m > MISS
      })
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
        const v = band(p) % 2 ? 0.7 : 0.5
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
  for (const c of t.centres)
    drawText(
      ctx,
      c.amp > 0 ? 'H' : 'L',
      c.x * w,
      (1 - c.y) * h - 5,
      c.amp > 0 ? RAMPS.amber[4] : RAMPS.cyan[1],
      1.6,
      'center',
    )
  return canvas
}

const RULE_N =
  'North: air turns anticlockwise around a low and clockwise around a high, drifting in toward the low.'
const RULE_S =
  'South: air turns clockwise around a low and anticlockwise around a high, drifting in toward the low.'

const mod: GameModule<L> = {
  id: 'isobar-wind',
  category: 'stem',
  title: 'Wind Rider',
  rules: {
    goal: 'Launch the balloon from the pad where the wind will carry it onto the beacon.',
    steps: [
      'Lines join places with equal air pressure. H is high, L is low.',
      'Wind does not blow straight from H to L. It curls around them.',
      'North: it turns anticlockwise around a low. South: clockwise. It also drifts slowly in toward the low.',
      'Tap a pad, or A to D. You get one launch per map. 5 maps.',
    ],
  },
  howTo:
    "Air does not rush straight from high pressure to low. Earth's spin bends it, so it curls around the lows and highs. In the north it turns anticlockwise around a low, and in the south clockwise. Near the ground it also drifts in toward the low. Closer lines mean faster wind. Trace the curl back from the beacon to find the right pad.",
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 180, 180)
    const { pc } = st
    const L = ctx.level
    let i = 0
    let score = 0
    let map: HTMLCanvasElement | null = null
    // pick: waiting for a choice. fly: balloon moving. done: result shown.
    let phase: 'pick' | 'fly' | 'done' = 'pick'
    let chosen = -1
    let path: Pt[] = []
    let truth: Pt[] = []
    let pos = 0
    let glow = 0

    const X = (p: Pt) => p.x * pc.w
    const Y = (p: Pt) => (1 - p.y) * pc.h

    const drawPath = (pts: Pt[], upto: number, color: string, dash = 0) => {
      const g = pc.ctx
      for (let k = 1; k <= Math.min(upto, pts.length - 1); k++)
        line(g, X(pts[k - 1]), Y(pts[k - 1]), X(pts[k]), Y(pts[k]), color, dash, 1.4)
    }

    const draw = () => {
      const t = L.trials[i]
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const res = Math.min(pc.res, 2)
      if (!map || map.width !== Math.round(pc.w * res) || map.height !== Math.round(pc.h * res))
        map = renderMap(t, pc.w, pc.h, res)
      g.drawImage(map, 0, 0, pc.w, pc.h)

      // After the flight, show the wind itself so the curl is visible.
      if (phase === 'done') {
        for (let gx = 0.08; gx < 1; gx += 0.12)
          for (let gy = 0.08; gy < 1; gy += 0.12) {
            const a = windAngle(t.centres, gx, gy, t.north)
            arrow(g, gx * pc.w, (1 - gy) * pc.h, -a, 6, 'rgba(233,237,245,0.55)', 1.2)
          }
        if (chosen !== t.answer) drawPath(truth, truth.length, C.good, 3)
      }

      const tx = X(t.target)
      const ty = Y(t.target)
      halo(g, tx, ty, 6, 6 + Math.sin(glow * 3) * 2, 'rgba(255,214,120,0.25)')
      starShape(g, tx, ty, 7, C.amberHi)

      t.pads.forEach((p, k) => {
        const px = X(p)
        const py = Y(p)
        const active = k === chosen
        disc(g, px, py, 8, active ? C.panelHi : C.panel)
        ring(
          g,
          px,
          py,
          8,
          phase === 'done' && k === t.answer ? C.good : active ? C.cyanHi : C.ink,
          false,
          1.2,
        )
        drawText(g, PAD_NAMES[k], px, py - 3, C.inkBright, 1, 'center')
      })

      if (phase !== 'pick' && path.length) {
        const k = Math.min(Math.floor(pos), path.length - 1)
        drawPath(path, k, chosen === t.answer ? C.good : C.cyanHi, 0)
        const b = path[k]
        disc(g, X(b), Y(b) - 5, 4, C.magenta)
        line(g, X(b), Y(b) - 1, X(b), Y(b) + 2, C.ink)
      }

      drawText(g, t.north ? 'NORTH' : 'SOUTH', 3, 3, t.north ? RAMPS.cyan[1] : RAMPS.magenta[4])
      line(g, pc.w - 6, 14, pc.w - 6, 4, RAMPS.star[3])
      drawText(g, 'N', pc.w - 6, 16, RAMPS.star[3], 1, 'center')
    }

    const loop = new Loop((dt) => {
      glow += dt
      if (phase === 'fly') {
        const t = L.trials[i]
        const k = Math.min(Math.floor(pos), path.length - 1)
        const [gx, gy] = gradient(t.centres, path[k].x, path[k].y)
        // Faster where the lines are close together.
        pos += dt * 40 * Math.max(0.6, Math.min(2, Math.hypot(gx, gy) / 25))
        if (pos >= path.length - 1) land()
      }
      draw()
    })

    const launch = (k: number) => {
      if (phase !== 'pick') return
      const t = L.trials[i]
      chosen = k
      path = drift(t.centres, t.north, t.pads[k])
      truth = drift(t.centres, t.north, t.pads[t.answer])
      pos = 0
      phase = 'fly'
      ctx.fx.sfx('tap')
      st.hud.textContent = `Map ${i + 1} / ${L.trials.length} · balloon away from ${PAD_NAMES[k]}…`
      st.controls.replaceChildren(el('p', { class: 'iw-rule', text: t.north ? RULE_N : RULE_S }))
    }

    const land = () => {
      const t = L.trials[i]
      phase = 'done'
      const ok = chosen === t.answer
      if (ok) score++
      ctx.fx.sfx(ok ? 'correct' : 'wrong')
      ctx.fx.haptic(ok ? 'correct' : 'wrong')
      st.hud.textContent = ok ? '✓ Right onto the beacon' : `✗ Missed. Pad ${PAD_NAMES[t.answer]} was the one`
      const note = ok
        ? `The wind curled ${t.north ? 'anticlockwise' : 'clockwise'} around the low and carried you in.`
        : `The green line shows the flight from ${PAD_NAMES[t.answer]}. The faint arrows show the wind. In the ${t.north ? 'north' : 'south'} it turns ${t.north ? 'anticlockwise' : 'clockwise'} around a low.`
      st.controls.replaceChildren(
        el('p', { class: 'g-text', text: note }),
        button(
          i + 1 < L.trials.length ? 'Next map' : 'Finish',
          () => {
            i++
            if (i < L.trials.length) ask()
            else {
              loop.stop()
              ctx.finish({
                score: score / L.trials.length,
                correct: score,
                total: L.trials.length,
                answer: `${score} of ${L.trials.length} balloons landed on the beacon.`,
                explanation:
                  "Earth's spin deflects moving air (the Coriolis effect), to the right in the north and to the left in the south. So wind curls around highs and lows instead of rushing straight between them. Near the ground, friction lets it drift in toward the low, which is why storms spiral inward.",
              })
            }
          },
          'big',
        ),
      )
    }

    const ask = () => {
      const t = L.trials[i]
      phase = 'pick'
      chosen = -1
      path = []
      map = null
      st.hud.textContent = `Map ${i + 1} / ${L.trials.length} · ${t.north ? 'northern' : 'southern'} hemisphere · which pad reaches the beacon?`
      const row = el('div', { class: 'iw-pads' })
      t.pads.forEach((_, k) => {
        const b = button(PAD_NAMES[k], () => launch(k))
        b.setAttribute('aria-label', 'Launch from pad ' + PAD_NAMES[k])
        row.append(b)
      })
      st.controls.replaceChildren(el('p', { class: 'iw-rule', text: t.north ? RULE_N : RULE_S }), row)
    }

    pc.canvas.addEventListener('pointerdown', (e) => {
      if (phase !== 'pick') return
      const p = pc.toNative(e.clientX, e.clientY)
      const t = L.trials[i]
      let best = -1
      let bd = 16
      t.pads.forEach((q, k) => {
        const dd = Math.hypot(X(q) - p.x, Y(q) - p.y)
        if (dd < bd) {
          bd = dd
          best = k
        }
      })
      if (best >= 0) launch(best)
    })

    ask()
    return {
      destroy() {
        loop.stop()
        st.destroy()
      },
    }
  },
  score: defaultScore('stem'),
}

export default mod

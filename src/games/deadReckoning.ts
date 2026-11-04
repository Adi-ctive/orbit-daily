// Dead Reckoning: path integration. Watch the ship's turns and thrusts with no
// trail, then tap where it ended up.
import { frame, halo, line, polygon, ring } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { Loop, makeStage, dInt } from './kit'
import { defaultScore, type GameModule } from './types'

interface Leg {
  turn: number
  len: number
}
interface Trial {
  x: number
  y: number
  heading: number
  legs: Leg[]
}
interface L {
  trials: Trial[]
}

const TURNS = [-135, -90, -45, 45, 90, 135]

export function pathPoints(t: Trial): { x: number; y: number }[] {
  const pts = [{ x: t.x, y: t.y }]
  let h = t.heading
  let { x, y } = t
  for (const l of t.legs) {
    h += (l.turn * Math.PI) / 180
    x += Math.cos(h) * l.len
    y += Math.sin(h) * l.len
    pts.push({ x, y })
  }
  return pts
}

function generate(rng: RNG, d: number): L {
  const trials: Trial[] = []
  for (let k = 0; k < 3; k++) {
    let best: Trial | null = null
    for (let tries = 0; tries < 40; tries++) {
      const n = dInt(d, 4, 8)
      const t: Trial = {
        x: rng.range(0.3, 0.7),
        y: rng.range(0.3, 0.7),
        heading: (rng.int(0, 7) * Math.PI) / 4,
        legs: Array.from({ length: n }, (_, i) => ({ turn: i === 0 ? 0 : rng.pick(TURNS), len: rng.range(0.12, 0.26) })),
      }
      const pts = pathPoints(t)
      const end = pts[pts.length - 1]
      if (pts.every((p) => p.x > 0.08 && p.x < 0.92 && p.y > 0.08 && p.y < 0.92) && Math.hypot(end.x - t.x, end.y - t.y) > 0.12) {
        best = t
        break
      }
    }
    if (best) trials.push(best)
  }
  return { trials }
}

function verify(l: L): boolean {
  return (
    l.trials.length === 3 &&
    l.trials.every((t) => {
      const pts = pathPoints(t)
      return t.legs.length >= 4 && pts.every((p) => p.x > 0.08 && p.x < 0.92 && p.y > 0.08 && p.y < 0.92)
    })
  )
}

function shipAt(g: CanvasRenderingContext2D, x: number, y: number, h: number, thrust: boolean): void {
  const c = Math.cos(h)
  const s = Math.sin(h)
  const P = (u: number, v: number): [number, number] => [x + u * c - v * s, y + u * s + v * c]
  if (thrust) halo(g, ...P(-8, 0), 1, 6, RAMPS.amber[4])
  polygon(g, [P(9, 0), P(-6, -5.5), P(-3.5, 0), P(-6, 5.5)], RAMPS.cyan[1])
}

const mod: GameModule<L> = {
  id: 'dead-reckoning',
  category: 'memory',
  title: 'Dead Reckoning',
  howTo: 'The ship flies a route of turns and thrusts, then its scanner goes dark. Tap the spot where it stopped.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 200, 200)
    const { pc } = st
    const L = ctx.level
    let ti = 0
    let phase: 'fly' | 'guess' | 'reveal' = 'fly'
    let tt = 0
    let guess: { x: number; y: number } | null = null
    const scores: number[] = []
    const SPEED = 0.48
    const TURN_T = 0.22

    const timeline = (t: Trial) => {
      // Precompute segment timings: turn, then move.
      const segs: { start: number; turnEnd: number; end: number; from: { x: number; y: number }; h0: number; h1: number; len: number }[] = []
      let time = 0.5
      let h = t.heading
      let p = { x: t.x, y: t.y }
      for (const l of t.legs) {
        const h1 = h + (l.turn * Math.PI) / 180
        const turnEnd = time + (l.turn ? TURN_T : 0)
        const end = turnEnd + l.len / SPEED
        segs.push({ start: time, turnEnd, end, from: p, h0: h, h1, len: l.len })
        p = { x: p.x + Math.cos(h1) * l.len, y: p.y + Math.sin(h1) * l.len }
        h = h1
        time = end
      }
      return { segs, total: time }
    }
    let tl = timeline(L.trials[0])

    const shipState = (t: number) => {
      for (const s of tl.segs) {
        if (t < s.turnEnd) {
          const k = Math.max(0, (t - s.start) / (s.turnEnd - s.start || 1))
          return { x: s.from.x, y: s.from.y, h: s.h0 + (s.h1 - s.h0) * k, thrust: false }
        }
        if (t < s.end) {
          const k = (t - s.turnEnd) / (s.end - s.turnEnd)
          return { x: s.from.x + Math.cos(s.h1) * s.len * k, y: s.from.y + Math.sin(s.h1) * s.len * k, h: s.h1, thrust: true }
        }
      }
      const last = tl.segs[tl.segs.length - 1]
      return { x: last.from.x + Math.cos(last.h1) * last.len, y: last.from.y + Math.sin(last.h1) * last.len, h: last.h1, thrust: false }
    }

    // A square field, so turn angles are drawn true.
    const field = () => {
      const side = Math.min(pc.w, pc.h) - 16
      return { side, ox: Math.floor((pc.w - side) / 2), oy: Math.floor((pc.h - side) / 2) }
    }
    const map = (x: number, y: number) => {
      const f = field()
      return { x: Math.round(f.ox + x * f.side), y: Math.round(f.oy + y * f.side) }
    }

    pc.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      if (phase !== 'guess') return
      const p = pc.toNative(e.clientX, e.clientY)
      const f = field()
      guess = { x: (p.x - f.ox) / f.side, y: (p.y - f.oy) / f.side }
      const end = pathPoints(L.trials[ti]).at(-1)!
      const err = Math.hypot(guess.x - end.x, guess.y - end.y)
      const sc = Math.max(0, 1 - err / 0.35)
      scores.push(sc)
      ctx.fx.sfx(sc > 0.6 ? 'correct' : 'wrong')
      ctx.fx.haptic(sc > 0.6 ? 'correct' : 'wrong')
      phase = 'reveal'
      tt = 0
      st.hud.textContent = `Off by ${Math.round(err * 100)} units`
    })

    st.hud.textContent = 'Watch the ship · 1 / 3'
    const loop = new Loop((dt) => {
      tt += dt
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const fd = field()
      frame(g, fd.ox - 4, fd.oy - 4, fd.side + 8, fd.side + 8, RAMPS.indigo[1])
      const tr = L.trials[ti]
      if (phase === 'fly') {
        const s = shipState(tt)
        const p = map(s.x, s.y)
        // Start beacon.
        const s0 = map(tr.x, tr.y)
        ring(g, s0.x, s0.y, 3, RAMPS.teal[3])
        shipAt(g, p.x, p.y, s.h, s.thrust)
        if (tt > tl.total + 0.4) {
          phase = 'guess'
          st.hud.textContent = 'Tap where the ship stopped'
        }
      } else {
        const s0 = map(tr.x, tr.y)
        ring(g, s0.x, s0.y, 3, RAMPS.teal[3])
        if (phase === 'reveal') {
          const pts = pathPoints(tr).map((p) => map(p.x, p.y))
          for (let k = 1; k < pts.length; k++) line(g, pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y, RAMPS.indigo[3], 2)
          const end = pts[pts.length - 1]
          ring(g, end.x, end.y, 4, C.good)
          if (guess) {
            const gp = map(guess.x, guess.y)
            line(g, gp.x - 3, gp.y - 3, gp.x + 3, gp.y + 3, C.amberHi)
            line(g, gp.x - 3, gp.y + 3, gp.x + 3, gp.y - 3, C.amberHi)
            line(g, gp.x, gp.y, end.x, end.y, RAMPS.amber[2], 1)
          }
          if (tt > 1.8) {
            ti++
            if (ti >= L.trials.length) {
              loop.stop()
              const total = scores.reduce((a, b) => a + b, 0)
              ctx.finish({
                score: total / scores.length,
                correct: scores.filter((s) => s > 0.6).length,
                total: scores.length,
                answer: `Navigation accuracy ${Math.round((total / scores.length) * 100)}%.`,
                explanation: 'Sailors and spacecraft use dead reckoning: known speed, heading and time give position without a fix. Small heading errors grow with every leg.',
              })
              return
            }
            tl = timeline(L.trials[ti])
            phase = 'fly'
            tt = 0
            guess = null
            st.hud.textContent = `Watch the ship · ${ti + 1} / 3`
          }
        } else drawText(g, '?', pc.w / 2, pc.h / 2, RAMPS.star[1], 2, 'center')
      }
    })
    return {
      destroy() {
        loop.stop()
        st.destroy()
      },
      pause: () => loop.pause(),
      resume: () => loop.resume(),
    }
  },
  score: defaultScore('memory'),
}

export default mod

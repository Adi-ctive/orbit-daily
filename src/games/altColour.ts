// Pulsar Path: an alternating-colour logic maze. Links between cells are red
// (diamond pattern) or blue (dot pattern). Each link you take must be a
// different colour from the last. BFS over (cell, last colour) checks it, and
// levels a greedy walker can solve are rejected.
import { ball, disc, halo, line, polygon, rect } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { button, Loop, makeStage, dInt } from './kit'
import { defaultScore, type GameModule } from './types'

interface L {
  n: number
  /** Horizontal links: n rows × (n-1). -1 = wall, 0 = red, 1 = blue. */
  hl: number[]
  /** Vertical links: (n-1) × n. */
  vl: number[]
  minLen: number
}

export function links(l: Pick<L, 'n' | 'hl' | 'vl'>, c: number): { to: number; col: number }[] {
  const { n } = l
  const x = c % n
  const y = Math.floor(c / n)
  const out: { to: number; col: number }[] = []
  if (x < n - 1 && l.hl[y * (n - 1) + x] >= 0) out.push({ to: c + 1, col: l.hl[y * (n - 1) + x] })
  if (x > 0 && l.hl[y * (n - 1) + x - 1] >= 0) out.push({ to: c - 1, col: l.hl[y * (n - 1) + x - 1] })
  if (y < n - 1 && l.vl[y * n + x] >= 0) out.push({ to: c + n, col: l.vl[y * n + x] })
  if (y > 0 && l.vl[(y - 1) * n + x] >= 0) out.push({ to: c - n, col: l.vl[(y - 1) * n + x] })
  return out
}

/** Shortest legal path from top-left to bottom-right. State = (cell, last colour + 1). */
export function solveAlt(l: Pick<L, 'n' | 'hl' | 'vl'>): number {
  const goal = l.n * l.n - 1
  const dist = new Int32Array(l.n * l.n * 3).fill(-1)
  dist[0] = 0
  const q = [0]
  for (let qi = 0; qi < q.length; qi++) {
    const s = q[qi]
    const c = Math.floor(s / 3)
    const last = (s % 3) - 1
    if (c === goal) return dist[s]
    for (const e of links(l, c)) {
      if (e.col === last) continue
      const ns = e.to * 3 + e.col + 1
      if (dist[ns] < 0) {
        dist[ns] = dist[s] + 1
        q.push(ns)
      }
    }
  }
  return -1
}

/** Greedy walker: always takes a legal link that gets closer to the goal. */
export function greedySolves(l: Pick<L, 'n' | 'hl' | 'vl'>): boolean {
  const goal = l.n * l.n - 1
  let c = 0
  let last = -1
  const md = (a: number) => Math.abs((a % l.n) - (l.n - 1)) + Math.abs(Math.floor(a / l.n) - (l.n - 1))
  for (let i = 0; i < l.n * 4; i++) {
    if (c === goal) return true
    const e = links(l, c).filter((e) => e.col !== last && md(e.to) < md(c))[0]
    if (!e) return false
    c = e.to
    last = e.col
  }
  return c === goal
}

function generate(rng: RNG, d: number): L {
  const n = dInt(d, 6, 8)
  const lo = dInt(d, n * 2 + 2, n * 3 + 4)
  let best: L = { n, hl: [], vl: [], minLen: -1 }
  for (let tries = 0; tries < 60; tries++) {
    const hl = Array.from({ length: n * (n - 1) }, () => (rng.bool(0.2) ? -1 : rng.int(0, 1)))
    const vl = Array.from({ length: n * (n - 1) }, () => (rng.bool(0.2) ? -1 : rng.int(0, 1)))
    const l = { n, hl, vl, minLen: 0 }
    l.minLen = solveAlt(l)
    if (l.minLen < 0 || greedySolves(l)) continue
    if (l.minLen > best.minLen) best = l
    if (l.minLen >= lo) break
  }
  return best
}

function verify(l: L): boolean {
  return l.minLen >= 2 * l.n - 2 && solveAlt(l) === l.minLen && !greedySolves(l)
}

const mod: GameModule<L> = {
  id: 'alt-colour',
  category: 'maze',
  title: 'Pulsar Path',
  rules: {
    goal: "Cross the grid while alternating link colours.",
    steps: ["Start at the top left. Finish at the bright beacon, bottom right.","Hop to a neighbouring cell along a link.","Each link must be a different colour from the last one: red ◆, then blue ●, then red ◆…","Fewer hops score more. Undo if you get stuck."],
  },
  howTo: 'Hop from the top-left beacon to the bottom-right one. Links are red ◆ or blue ●, and you must alternate: red, blue, red… Tap a neighbouring cell to hop.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 160, 160)
    const { pc } = st
    const L = ctx.level
    const goal = L.n * L.n - 1
    let c = 0
    let last = -1
    let path: [number, number][] = []
    let moves = 0
    let done = false

    const geo = () => {
      const cs = Math.floor(Math.min((pc.w - 8) / L.n, (pc.h - 8) / L.n))
      return { cs, ox: Math.floor((pc.w - cs * L.n) / 2), oy: Math.floor((pc.h - cs * L.n) / 2) }
    }

    const hop = (to: number) => {
      if (done) return
      const e = links(L, c).find((e) => e.to === to)
      if (!e) return
      if (e.col === last) {
        ctx.fx.sfx('wrong')
        ctx.fx.haptic('wrong')
        st.hud.textContent = `Must take a ${last === 0 ? 'blue ●' : 'red ◆'} link next`
        return
      }
      path.push([c, last])
      c = to
      last = e.col
      moves++
      ctx.fx.sfx('tap')
      if (c === goal) {
        done = true
        ctx.fx.sfx('levelup')
        setTimeout(() => {
          loop.stop()
          ctx.finish({
            score: Math.max(0.4, Math.min(1, L.minLen / moves)),
            correct: 1,
            total: 1,
            answer: `Reached the pulsar in ${moves} hops (shortest: ${L.minLen}).`,
            explanation: 'Rule mazes like this one, after Robert Abbott, hide a second maze: your state is both where you are and which colour you came in on. The same cell can be a dead end or a gateway.',
          })
        }, 600)
      }
    }

    pc.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      const p = pc.toNative(e.clientX, e.clientY)
      const { cs, ox, oy } = geo()
      const x = Math.floor((p.x - ox) / cs)
      const y = Math.floor((p.y - oy) / cs)
      if (x >= 0 && y >= 0 && x < L.n && y < L.n) hop(y * L.n + x)
    })
    const onKey = (e: KeyboardEvent) => {
      const k: Record<string, number> = { ArrowUp: -L.n, ArrowDown: L.n, ArrowLeft: -1, ArrowRight: 1 }
      if (e.code in k) {
        e.preventDefault()
        hop(c + k[e.code])
      }
    }
    addEventListener('keydown', onKey)
    st.controls.append(
      button('Undo', () => {
        const h = path.pop()
        if (h && !done) {
          ;[c, last] = h
          moves--
        }
      }),
      button('Restart', () => {
        if (done) return
        c = 0
        last = -1
        path = []
        moves = 0
      }),
      button('Give up', () => {
        if (done) return
        done = true
        loop.stop()
        ctx.finish({ score: 0.1, correct: 0, total: 1, answer: `A ${L.minLen}-hop path existed.`, explanation: 'Sometimes the way forward is to step away from the goal, just to arrive at a cell with the right colour coming in.' })
      }),
    )

    const loop = new Loop((_dt, t) => {
      if (!done && path.length === 0) st.hud.textContent = 'Alternate red ◆ and blue ●'
      else if (!done) st.hud.textContent = `Next link: ${last === 0 ? 'blue ●' : 'red ◆'} · hops ${moves}`
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const { cs, ox, oy } = geo()
      const center = (k: number) => [ox + (k % L.n) * cs + Math.floor(cs / 2), oy + Math.floor(k / L.n) * cs + Math.floor(cs / 2)]
      const legal = new Set(done ? [] : links(L, c).filter((e) => e.col !== last).map((e) => e.to))
      const drawLink = (a: number, b: number, col: number) => {
        const [x0, y0] = center(a)
        const [x1, y1] = center(b)
        const red = col === 0
        const base = red ? RAMPS.lava[2] : RAMPS.indigo[3]
        line(g, x0, y0, x1, y1, base, 0, 2.2)
        const mx = (x0 + x1) / 2
        const my = (y0 + y1) / 2
        if (red) polygon(g, [[mx, my - 3], [mx + 3, my], [mx, my + 3], [mx - 3, my]], RAMPS.lava[3])
        else disc(g, mx, my, 2.4, RAMPS.cyan[1])
      }
      for (let y = 0; y < L.n; y++)
        for (let x = 0; x < L.n - 1; x++) {
          const v = L.hl[y * (L.n - 1) + x]
          if (v >= 0) drawLink(y * L.n + x, y * L.n + x + 1, v)
        }
      for (let y = 0; y < L.n - 1; y++)
        for (let x = 0; x < L.n; x++) {
          const v = L.vl[y * L.n + x]
          if (v >= 0) drawLink(y * L.n + x, (y + 1) * L.n + x, v)
        }
      for (let k = 0; k < L.n * L.n; k++) {
        const [x, y] = center(k)
        rect(g, x - 2, y - 2, 5, 5, legal.has(k) && Math.floor(t * 4) % 2 ? RAMPS.amber[4] : RAMPS.void[4])
        rect(g, x - 1, y - 1, 3, 3, RAMPS.void[2])
      }
      const [gx, gy] = center(goal)
      halo(g, gx, gy, 4, 3, RAMPS.amber[2])
      ball(g, gx, gy, 4, RAMPS.amber[1], RAMPS.amber[3], RAMPS.amber[4], RAMPS.amber[5])
      const [px, py] = center(c)
      ball(g, px, py, 3, RAMPS.teal[2], RAMPS.cyan[0], RAMPS.cyan[1], RAMPS.star[4])
      if (done) drawText(g, 'ARRIVED', pc.w / 2, 1, C.good, 1, 'center')
    })
    return {
      destroy() {
        loop.stop()
        removeEventListener('keydown', onKey)
        st.destroy()
      },
      pause: () => loop.pause(),
      resume: () => loop.resume(),
    }
  },
  score: defaultScore('maze'),
}

export default mod

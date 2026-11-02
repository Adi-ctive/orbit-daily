// Escape the Void Beast: a Theseus-and-Minotaur style logic maze. For every move
// you make (or wait), the beast takes two steps toward you, horizontal first.
// BFS over (you, beast) states guarantees a solution of a minimum length.
import { ball, halo, rect } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { button, Loop, makeStage, dInt } from './kit'
import { canMove, DIRS, directionInput, wallsConsistent, N, E, S, W } from './grid'
import { defaultScore, type GameModule } from './types'

interface L {
  w: number
  h: number
  cells: number[]
  p: number
  m: number
  exit: number
  minLen: number
}

/** One beast step: reduce horizontal distance if possible, else vertical, else stay. */
export function beastStep(cells: number[], w: number, h: number, m: number, p: number): number {
  const mx = m % w
  const px = p % w
  const my = Math.floor(m / w)
  const py = Math.floor(p / w)
  if (px !== mx) {
    const d = DIRS[px > mx ? 1 : 3]
    if (canMove(cells, w, h, m, d)) return m + d.dx
  }
  if (py !== my) {
    const d = DIRS[py > my ? 2 : 0]
    if (canMove(cells, w, h, m, d)) return m + d.dy * w
  }
  return m
}

/** Apply a player move (0-3) or wait (4). Returns null if the move is blocked. */
export function stepState(l: Pick<L, 'w' | 'h' | 'cells' | 'exit'>, p: number, m: number, mv: number): { p: number; m: number; won: boolean; lost: boolean } | null {
  let np = p
  if (mv < 4) {
    if (!canMove(l.cells, l.w, l.h, p, DIRS[mv])) return null
    np = p + DIRS[mv].dx + DIRS[mv].dy * l.w
  }
  if (np === l.exit) return { p: np, m, won: true, lost: false }
  let nm = beastStep(l.cells, l.w, l.h, m, np)
  if (nm === np) return { p: np, m: nm, won: false, lost: true }
  nm = beastStep(l.cells, l.w, l.h, nm, np)
  return { p: np, m: nm, won: false, lost: nm === np }
}

export function solve(l: Pick<L, 'w' | 'h' | 'cells' | 'exit' | 'p' | 'm'>): number {
  const n = l.w * l.h
  const dist = new Int16Array(n * n).fill(-1)
  const start = l.p * n + l.m
  dist[start] = 0
  const q = [start]
  for (let qi = 0; qi < q.length; qi++) {
    const s = q[qi]
    const p = Math.floor(s / n)
    const m = s % n
    for (let mv = 0; mv < 5; mv++) {
      const r = stepState(l, p, m, mv)
      if (!r || r.lost) continue
      if (r.won) return dist[s] + 1
      const ns = r.p * n + r.m
      if (dist[ns] < 0) {
        dist[ns] = dist[s] + 1
        q.push(ns)
      }
    }
  }
  return -1
}

function toggleWall(cells: number[], w: number, c: number, dir: number): void {
  const d = DIRS[dir]
  const n = c + d.dx + d.dy * w
  cells[c] ^= d.bit
  cells[n] ^= d.opp
}

function generate(rng: RNG, d: number): L {
  const w = d > 0.75 ? 7 : 6
  const h = w
  const target = dInt(d, 7, 16)
  const cells = new Array(w * h).fill(0)
  for (let c = 0; c < w * h; c++) {
    const x = c % w
    const y = Math.floor(c / w)
    if (y === 0) cells[c] |= N
    if (y === h - 1) cells[c] |= S
    if (x === 0) cells[c] |= W
    if (x === w - 1) cells[c] |= E
  }
  // Random interior walls.
  for (let c = 0; c < w * h; c++) {
    if (c % w < w - 1 && rng.bool(0.22)) toggleWall(cells, w, c, 1)
    if (Math.floor(c / w) < h - 1 && rng.bool(0.22)) toggleWall(cells, w, c, 2)
  }
  const side = rng.int(0, 3)
  const k = rng.int(1, w - 2)
  const exit = side === 0 ? k : side === 1 ? k * w + (w - 1) : side === 2 ? (h - 1) * w + k : k * w
  const far = Array.from({ length: w * h }, (_, i) => i).filter((i) => Math.abs((i % w) - (exit % w)) + Math.abs(Math.floor(i / w) - Math.floor(exit / w)) >= w - 1)
  const lvl: L = { w, h, cells, p: rng.pick(far), m: 0, exit, minLen: -1 }
  const cands = Array.from({ length: w * h }, (_, i) => i).filter((i) => i !== lvl.p && i !== exit)
  lvl.m = rng.pick(cands)
  lvl.minLen = solve(lvl)
  // Hill-climb: toggle interior walls, keep changes that keep it solvable and make it longer.
  for (let it = 0; it < 160 && lvl.minLen < target; it++) {
    const c = rng.int(0, w * h - 1)
    const dir = rng.bool() ? 1 : 2
    if ((dir === 1 && c % w === w - 1) || (dir === 2 && Math.floor(c / w) === h - 1)) continue
    toggleWall(cells, w, c, dir)
    const len = solve(lvl)
    if (len >= lvl.minLen && len > 0) lvl.minLen = len
    else toggleWall(cells, w, c, dir)
  }
  return lvl
}

function verify(l: L): boolean {
  return wallsConsistent(l.cells, l.w, l.h) && l.minLen >= 7 && solve(l) === l.minLen && l.p !== l.m
}

const mod: GameModule<L> = {
  id: 'void-beast',
  category: 'maze',
  title: 'Escape the Void Beast',
  howTo: 'Reach the portal. Each time you move or wait, the beast takes two steps toward you, sideways first if it can. Walls can trap it.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 160, 160)
    const { pc } = st
    const L = ctx.level
    let p = L.p
    let m = L.m
    let hist: [number, number][] = []
    let moves = 0
    let resets = 0
    let state: 'play' | 'caught' | 'won' = 'play'
    let t = 0

    const reset = () => {
      p = L.p
      m = L.m
      hist = []
      moves = 0
      state = 'play'
    }

    const act = (mv: number) => {
      if (state !== 'play') return
      const r = stepState(L, p, m, mv)
      if (!r) {
        ctx.fx.sfx('wrong')
        return
      }
      hist.push([p, m])
      p = r.p
      m = r.m
      moves++
      ctx.fx.sfx('tap')
      ctx.fx.haptic('tap')
      if (r.won) {
        state = 'won'
        ctx.fx.sfx('levelup')
        setTimeout(() => {
          loop.stop()
          const eff = Math.min(1, L.minLen / moves)
          ctx.finish({
            score: Math.max(0.4, eff - resets * 0.08),
            correct: 1,
            total: 1,
            answer: `Escaped in ${moves} moves (best possible: ${L.minLen}) after ${resets} restart${resets === 1 ? '' : 's'}.`,
            explanation: 'The trick is that the beast always tries the sideways step first. Lead it so a wall sits between you, and it wastes its moves bumping into it.',
          })
        }, 700)
      } else if (r.lost) {
        state = 'caught'
        resets++
        ctx.fx.sfx('wrong')
        ctx.fx.haptic('wrong')
        ctx.fx.shake(2)
        setTimeout(reset, 900)
      }
    }

    const extra = [
      button('Wait', () => act(4)),
      button('Undo', () => {
        const h = hist.pop()
        if (h && state === 'play') {
          ;[p, m] = h
          moves--
        }
      }),
      button('Restart', () => {
        resets++
        reset()
      }),
      button('Give up', () => {
        loop.stop()
        ctx.finish({ score: 0.1, correct: 0, total: 1, answer: `A ${L.minLen}-move escape existed.`, explanation: 'Use walls to block the beast: it never steps away from you, so it can get stuck behind a wall while you slip past.' })
      }),
    ]
    extra[0].setAttribute('aria-label', 'Wait one turn')
    const stopInput = directionInput(st.controls, pc.canvas, act, extra)

    const loop = new Loop((dt) => {
      t += dt
      st.hud.textContent = state === 'caught' ? 'Caught! Restarting…' : `Moves ${moves} · best ${L.minLen}`
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const cs = Math.floor(Math.min((pc.w - 8) / L.w, (pc.h - 8) / L.h))
      const ox = Math.floor((pc.w - cs * L.w) / 2)
      const oy = Math.floor((pc.h - cs * L.h) / 2)
      for (let c = 0; c < L.cells.length; c++) {
        const x = ox + (c % L.w) * cs
        const y = oy + Math.floor(c / L.w) * cs
        rect(g, x, y, cs, cs, (c + Math.floor(c / L.w)) % 2 ? RAMPS.void[2] : RAMPS.void[3])
      }
      const ex = ox + (L.exit % L.w) * cs + cs / 2
      const ey = oy + Math.floor(L.exit / L.w) * cs + cs / 2
      halo(g, ex, ey, Math.floor(cs / 3), 3, RAMPS.teal[3])
      ball(g, ex, ey, Math.floor(cs / 3), RAMPS.teal[1], RAMPS.teal[3], RAMPS.cyan[1], RAMPS.star[4])
      for (let c = 0; c < L.cells.length; c++) {
        const x = ox + (c % L.w) * cs
        const y = oy + Math.floor(c / L.w) * cs
        const v = L.cells[c]
        const col = RAMPS.amber[3]
        if (v & N && !(c === L.exit && Math.floor(c / L.w) === 0)) rect(g, x - 1, y - 1, cs + 2, 2, col)
        if (v & W && !(c === L.exit && c % L.w === 0)) rect(g, x - 1, y - 1, 2, cs + 2, col)
        if (v & S && !(c === L.exit && Math.floor(c / L.w) === L.h - 1)) rect(g, x - 1, y + cs - 1, cs + 2, 2, col)
        if (v & E && !(c === L.exit && c % L.w === L.w - 1)) rect(g, x + cs - 1, y - 1, 2, cs + 2, col)
      }
      const r = Math.max(2, Math.floor(cs / 3))
      const bx = ox + (m % L.w) * cs + cs / 2
      const by = oy + Math.floor(m / L.w) * cs + cs / 2 + (Math.floor(t * 3) % 2)
      ball(g, bx, by, r + 1, RAMPS.violet[0], RAMPS.violet[2], RAMPS.magenta[2], RAMPS.magenta[4])
      rect(g, bx - 2, by - 1, 1, 1, C.bad)
      rect(g, bx + 2, by - 1, 1, 1, C.bad)
      const px = ox + (p % L.w) * cs + cs / 2
      const py = oy + Math.floor(p / L.w) * cs + cs / 2
      ball(g, px, py, r, RAMPS.indigo[2], RAMPS.star[2], RAMPS.star[3], RAMPS.star[4])
      rect(g, px - 1, py - 1, 3, 2, RAMPS.cyan[0])
      if (state === 'won') drawText(g, 'ESCAPED', pc.w / 2, 1, C.good, 1, 'center')
    })
    return {
      destroy() {
        loop.stop()
        stopInput()
        st.destroy()
      },
      pause: () => loop.pause(),
      resume: () => loop.resume(),
    }
  },
  score: defaultScore('maze'),
}

export default mod

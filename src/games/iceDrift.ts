// Ice Drift: a sliding puzzle. The pod slides on ice until it hits a rock or the
// edge. It must come to rest exactly on the beacon. Plan the route before moving.
import { disc, halo, ring, roundRect } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { DIRS, directionInput } from './grid'
import { button, Loop, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

interface Puzzle {
  w: number
  h: number
  rocks: number[]
  start: number
  goal: number
  par: number
}
interface L {
  puzzles: Puzzle[]
}

const COUNT = 3

export function slide(p: Puzzle, from: number, dir: number): number {
  const rocks = new Set(p.rocks)
  const d = DIRS[dir]
  let x = from % p.w
  let y = Math.floor(from / p.w)
  for (;;) {
    const nx = x + d.dx
    const ny = y + d.dy
    if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h || rocks.has(ny * p.w + nx)) break
    x = nx
    y = ny
  }
  return y * p.w + x
}

/** Fewest slides from start to rest on the goal, or -1. */
export function solve(p: Puzzle): number {
  const dist = new Map<number, number>([[p.start, 0]])
  const q = [p.start]
  while (q.length) {
    const c = q.shift() as number
    if (c === p.goal) return dist.get(c) as number
    for (let k = 0; k < 4; k++) {
      const n = slide(p, c, k)
      if (!dist.has(n)) {
        dist.set(n, (dist.get(c) as number) + 1)
        q.push(n)
      }
    }
  }
  return -1
}

const parRange = (d: number): [number, number] => [3 + Math.round(d * 3), 7 + Math.round(d * 4)]

function generate(rng: RNG, d: number): L {
  const puzzles: Puzzle[] = []
  const [lo, hi] = parRange(d)
  for (let k = 0; k < COUNT; k++) {
    const size = 7 + Math.round(d * 2)
    let best: Puzzle | null = null
    for (let tries = 0; tries < 80 && !best; tries++) {
      const cells = rng.shuffle(Array.from({ length: size * size }, (_, i) => i))
      const nRocks = Math.round(size * size * rng.range(0.12, 0.18))
      const p: Puzzle = { w: size, h: size, rocks: cells.slice(0, nRocks), start: cells[nRocks], goal: cells[nRocks + 1], par: 0 }
      const par = solve(p)
      if (par >= lo && par <= hi) best = { ...p, par }
    }
    if (best) puzzles.push(best)
  }
  return { puzzles }
}

function verify(l: L): boolean {
  return l.puzzles.length === COUNT && l.puzzles.every((p) => p.par >= 3 && solve(p) === p.par && !p.rocks.includes(p.start) && !p.rocks.includes(p.goal))
}

const mod: GameModule<L> = {
  id: 'ice-drift',
  category: 'maze',
  title: 'Ice Drift',
  rules: {
    goal: 'Slide the pod so it stops exactly on the beacon.',
    steps: [
      'Swipe, use the arrows, or the keyboard to push the pod.',
      'It slides on the ice until it hits a rock or the edge. It cannot stop halfway.',
      'Passing over the beacon does not count. It has to come to rest there.',
      'Each puzzle shows par, the fewest slides possible. 3 puzzles. Reset if you get stuck.',
    ],
  },
  howTo: 'The pod slides until it hits a rock or the edge. Make it stop on the beacon. Par is the fewest slides possible.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 200, 200)
    const { pc } = st
    const L = ctx.level
    let k = 0
    let pos = L.puzzles[0].start
    let from = pos
    let anim = 1
    let moves = 0
    let resets = 0
    let solvedT = 0
    let ended = false
    const results: { moves: number; par: number; solved: boolean }[] = []

    const hud = () => {
      const p = L.puzzles[k]
      st.hud.textContent = `Puzzle ${k + 1} / ${COUNT} · ${moves} slides · par ${p.par}`
    }
    hud()

    const move = (dir: number) => {
      if (ended || anim < 1 || solvedT > 0) return
      const p = L.puzzles[k]
      const n = slide(p, pos, dir)
      if (n === pos) {
        ctx.fx.sfx('tap')
        return
      }
      from = pos
      pos = n
      anim = 0
      moves++
      ctx.fx.sfx('hover')
      hud()
    }
    const reset = button('Reset', () => {
      if (ended || solvedT > 0) return
      pos = L.puzzles[k].start
      from = pos
      anim = 1
      resets++
      hud()
    })
    const giveUp = button('Skip', () => {
      if (ended || solvedT > 0) return
      results.push({ moves, par: L.puzzles[k].par, solved: false })
      nextPuzzle()
    })
    const stopInput = directionInput(st.controls, pc.canvas, move, [reset, giveUp])

    const nextPuzzle = () => {
      k++
      moves = 0
      if (k >= COUNT) return finish()
      pos = L.puzzles[k].start
      from = pos
      anim = 1
      hud()
    }

    const finish = () => {
      ended = true
      loop.stop()
      const pts = results.map((r): number => (!r.solved ? 0 : r.moves <= r.par ? 1 : r.moves <= r.par + 2 ? 0.75 : 0.5))
      const solved = results.filter((r) => r.solved).length
      ctx.finish({
        score: pts.reduce((a, b) => a + b, 0) / COUNT,
        correct: results.filter((r) => r.solved && r.moves <= r.par).length,
        total: COUNT,
        answer: `${solved} of ${COUNT} solved. ${results.map((r) => (r.solved ? `${r.moves} slides (par ${r.par})` : `skipped (par ${r.par})`)).join(', ')}.`,
        explanation: `Work backwards: find what the pod could stop against to rest on the beacon, then ask how to reach that line. ${resets ? `You reset ${resets} time${resets > 1 ? 's' : ''}. ` : ''}Planning two slides ahead beats trial and error.`,
      })
    }

    const loop = new Loop((dt) => {
      if (ended) return
      const p = L.puzzles[k]
      if (anim < 1) {
        anim = Math.min(1, anim + dt * 7)
        if (anim >= 1 && pos === p.goal) {
          solvedT = 0.9
          ctx.fx.sfx('levelup')
          ctx.fx.haptic('correct')
        }
      } else if (solvedT > 0) {
        solvedT -= dt
        if (solvedT <= 0) {
          results.push({ moves, par: p.par, solved: true })
          nextPuzzle()
          if (ended) return
        }
      }
      const q = L.puzzles[k]
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const cell = Math.floor(Math.min(pc.w, pc.h) / q.w)
      const x0 = (pc.w - cell * q.w) / 2
      const y0 = (pc.h - cell * q.h) / 2
      roundRect(g, x0 - 3, y0 - 3, cell * q.w + 6, cell * q.h + 6, 8, RAMPS.teal[0])
      for (let c = 0; c < q.w * q.h; c++) {
        const x = x0 + (c % q.w) * cell
        const y = y0 + Math.floor(c / q.w) * cell
        roundRect(g, x + 1, y + 1, cell - 2, cell - 2, 3, (c + Math.floor(c / q.w)) % 2 ? RAMPS.teal[1] : 'rgba(22,76,86,0.9)')
      }
      for (const r of q.rocks) {
        const x = x0 + (r % q.w) * cell + cell / 2
        const y = y0 + Math.floor(r / q.w) * cell + cell / 2
        roundRect(g, x - cell * 0.42, y - cell * 0.42, cell * 0.84, cell * 0.84, cell * 0.2, RAMPS.void[4])
        roundRect(g, x - cell * 0.3, y - cell * 0.38, cell * 0.5, cell * 0.2, cell * 0.1, RAMPS.indigo[1])
      }
      const gx = x0 + (q.goal % q.w) * cell + cell / 2
      const gy = y0 + Math.floor(q.goal / q.w) * cell + cell / 2
      halo(g, gx, gy, cell * 0.2, cell * 0.4, RAMPS.amber[3])
      ring(g, gx, gy, cell * 0.3, RAMPS.amber[4], false, 2)
      const sx = x0 + (q.start % q.w) * cell + cell / 2
      const sy = y0 + Math.floor(q.start / q.w) * cell + cell / 2
      ring(g, sx, sy, cell * 0.18, RAMPS.star[0], true, 1)
      const e = 1 - (1 - anim) * (1 - anim)
      const fx = (from % q.w) + ((pos % q.w) - (from % q.w)) * e
      const fy = Math.floor(from / q.w) + (Math.floor(pos / q.w) - Math.floor(from / q.w)) * e
      const px = x0 + fx * cell + cell / 2
      const py = y0 + fy * cell + cell / 2
      halo(g, px, py, cell * 0.25, cell * 0.3, RAMPS.cyan[0])
      disc(g, px, py, cell * 0.3, RAMPS.cyan[1])
      disc(g, px - cell * 0.08, py - cell * 0.08, cell * 0.1, RAMPS.star[4])
      if (solvedT > 0) drawText(g, moves <= q.par ? 'PAR!' : 'DOCKED', pc.w / 2, 2, C.good, 1.6, 'center')
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

// Vanishing Walls: memorise the maze, then the walls fade and you fly it from memory.
// Bumping a wall flashes it and leaves it faintly visible.
import { ball, halo, rect } from '../art/draw'
import { C, RAMPS, bayer } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { button, Loop, makeStage, dInt } from './kit'
import { backtracker, bfs, canMove, DIRS, directionInput, wallsConsistent } from './grid'
import { defaultScore, type GameModule } from './types'

interface L {
  w: number
  h: number
  cells: number[]
  show: number
  shortest: number
}

function generate(rng: RNG, d: number): L {
  const w = dInt(d, 5, 9)
  const h = dInt(d, 5, 9)
  const cells = backtracker(rng, w, h)
  return { w, h, cells, show: Math.round(10 - d * 5), shortest: bfs(cells, w, h, 0, w * h - 1) }
}

function verify(l: L): boolean {
  return wallsConsistent(l.cells, l.w, l.h) && l.shortest >= l.w + l.h - 2 && bfs(l.cells, l.w, l.h, 0, l.w * l.h - 1) === l.shortest
}

const mod: GameModule<L> = {
  id: 'vanishing-walls',
  category: 'maze',
  title: 'Vanishing Walls',
  howTo: 'Memorise the maze. When the walls vanish, steer your probe to the portal from memory. Bumping a wall reveals it.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 160, 160)
    const { pc } = st
    const L = ctx.level
    let pos = 0
    let moves = 0
    let bumps = 0
    let phase: 'memo' | 'fade' | 'run' | 'done' = 'memo'
    let t = 0
    const revealed = new Set<string>()
    let flash: { key: string; t: number } | null = null
    const goal = L.w * L.h - 1

    const tryMove = (i: number) => {
      if (phase !== 'run' && phase !== 'fade') return
      const d = DIRS[i]
      if (canMove(L.cells, L.w, L.h, pos, d)) {
        pos += d.dx + d.dy * L.w
        moves++
        ctx.fx.sfx('tap')
        if (pos === goal) win()
      } else {
        bumps++
        const key = pos + ':' + d.bit
        revealed.add(key)
        flash = { key, t: 0.35 }
        ctx.fx.sfx('wrong')
        ctx.fx.haptic('wrong')
        ctx.fx.shake(1)
      }
    }

    const win = () => {
      phase = 'done'
      ctx.fx.sfx('levelup')
      ctx.fx.haptic('combo')
      setTimeout(() => {
        loop.stop()
        ctx.finish({
          score: Math.max(0.2, 1 - bumps * 0.08 - Math.max(0, moves - L.shortest) * 0.02),
          correct: Math.max(0, 10 - bumps),
          total: 10,
          answer: `Escaped in ${moves} moves with ${bumps} bump${bumps === 1 ? '' : 's'}. Shortest route: ${L.shortest}.`,
          explanation: 'This maze was carved by a recursive backtracker, which makes long winding corridors with few branches. Remembering the turns as a sequence ("down, right, right, up…") is easier than remembering the picture.',
        })
      }, 600)
    }

    const giveUp = button('Give up', () => {
      if (phase === 'done') return
      phase = 'done'
      loop.stop()
      ctx.finish({ score: 0.1, correct: 0, total: 10, answer: `The shortest route was ${L.shortest} moves.`, explanation: 'Try chunking the route into short runs of moves while the walls are visible.' })
    })
    const stopInput = directionInput(st.controls, pc.canvas, tryMove, [giveUp])

    const loop = new Loop((dt) => {
      t += dt
      if (flash) {
        flash.t -= dt
        if (flash.t <= 0) flash = null
      }
      if (phase === 'memo') {
        st.hud.textContent = `Memorise: ${Math.max(0, Math.ceil(L.show - t))} s`
        if (t >= L.show) {
          phase = 'fade'
          t = 0
          ctx.fx.sfx('warp')
        }
      } else if (phase === 'fade' && t > 0.8) phase = 'run'
      if (phase === 'run') st.hud.textContent = `Moves ${moves} · bumps ${bumps}`
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const cs = Math.floor(Math.min((pc.w - 8) / L.w, (pc.h - 8) / L.h))
      const ox = Math.floor((pc.w - cs * L.w) / 2)
      const oy = Math.floor((pc.h - cs * L.h) / 2)
      rect(g, ox, oy, cs * L.w, cs * L.h, RAMPS.void[2])
      const fadeK = phase === 'memo' ? 1 : phase === 'fade' ? 1 - t / 0.8 : 0
      for (let c = 0; c < L.cells.length; c++) {
        const x = ox + (c % L.w) * cs
        const y = oy + Math.floor(c / L.w) * cs
        for (const d of DIRS) {
          if (!(L.cells[c] & d.bit)) continue
          const key = c + ':' + d.bit
          const isFlash = flash?.key === key
          const rev = revealed.has(key)
          const border = (d.bit === 1 && c < L.w) || (d.bit === 8 && c % L.w === 0) || (d.bit === 4 && c >= L.w * (L.h - 1)) || (d.bit === 2 && c % L.w === L.w - 1)
          let col: string | null = null
          if (isFlash) col = C.bad
          else if (border) col = RAMPS.indigo[3]
          else if (rev) col = RAMPS.lava[1]
          else if (fadeK > 0) col = RAMPS.cyan[0]
          if (!col) continue
          const seg = (sx: number, sy: number, w: number, h: number) => {
            for (let yy = 0; yy < h; yy++)
              for (let xx = 0; xx < w; xx++) {
                if (!isFlash && !rev && !border && fadeK < 1 && bayer(sx + xx, sy + yy) > fadeK) continue
                g.fillStyle = col!
                g.fillRect(sx + xx, sy + yy, 1, 1)
              }
          }
          if (d.bit === 1) seg(x, y, cs + 1, 1)
          if (d.bit === 4) seg(x, y + cs, cs + 1, 1)
          if (d.bit === 8) seg(x, y, 1, cs + 1)
          if (d.bit === 2) seg(x + cs, y, 1, cs + 1)
        }
      }
      // Portal and probe.
      const gx = ox + (goal % L.w) * cs + cs / 2
      const gy = oy + Math.floor(goal / L.w) * cs + cs / 2
      halo(g, gx, gy, Math.floor(cs / 4), 2, RAMPS.magenta[2])
      ball(g, gx, gy, Math.max(2, Math.floor(cs / 4)), RAMPS.magenta[1], RAMPS.magenta[3], RAMPS.magenta[4], RAMPS.star[4])
      const px = ox + (pos % L.w) * cs + cs / 2
      const py = oy + Math.floor(pos / L.w) * cs + cs / 2
      ball(g, px, py, Math.max(2, Math.floor(cs / 3.5)), RAMPS.teal[2], RAMPS.cyan[0], RAMPS.cyan[1], RAMPS.cyan[2])
      if (phase === 'memo') drawText(g, String(Math.max(0, Math.ceil(L.show - t))), pc.w - 2, 1, C.amberHi, 1, 'right')
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

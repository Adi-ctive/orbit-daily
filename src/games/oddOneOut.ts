// Odd One Out: visual search. A grid of identical probes, except one. It is turned
// a little, a little bigger, or a mirror image. Find it before the timer runs out.
import { halo, polygon, roundRect } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { Loop, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

type Kind = 'rot' | 'size' | 'mirror'
interface Board {
  n: number
  odd: number
  kind: Kind
  /** Shared heading of every probe, radians. */
  angle: number
  /** Degrees for rot, scale gap for size. */
  delta: number
}
interface L {
  boards: Board[]
  limit: number
}

const COUNT = 10
// An asymmetric probe, so a mirror image really is different.
const SHAPE: [number, number][] = [
  [0, -1],
  [0.62, 0.72],
  [0.08, 0.38],
  [-0.38, 0.86],
]

function generate(rng: RNG, d: number): L {
  const boards: Board[] = []
  const kinds: Kind[] = ['rot', 'size', 'mirror']
  for (let b = 0; b < COUNT; b++) {
    const n = Math.min(7, 4 + Math.round(d * 2) + (b >= COUNT / 2 ? 1 : 0))
    const kind = kinds[(b + rng.int(0, 2)) % 3]
    const ramp = b / (COUNT - 1)
    const delta = kind === 'rot' ? Math.round(34 - d * 14 - ramp * 8) : kind === 'size' ? Math.round((0.3 - d * 0.1 - ramp * 0.06) * 100) / 100 : 0
    boards.push({ n, odd: rng.int(0, n * n - 1), kind, angle: rng.range(0, Math.PI * 2), delta })
  }
  return { boards, limit: Math.round((8 - d * 3) * 10) / 10 }
}

function verify(l: L): boolean {
  return (
    l.boards.length === COUNT &&
    l.boards.every(
      (b) => b.n >= 4 && b.n <= 7 && b.odd >= 0 && b.odd < b.n * b.n && (b.kind === 'rot' ? b.delta >= 10 : b.kind === 'size' ? b.delta >= 0.1 : true),
    )
  )
}

function probe(g: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, mirror: boolean, col: string): void {
  const pts = SHAPE.map(([px, py]): [number, number] => {
    const qx = (mirror ? -px : px) * r
    const qy = py * r
    return [x + qx * Math.cos(a) - qy * Math.sin(a), y + qx * Math.sin(a) + qy * Math.cos(a)]
  })
  polygon(g, pts, col)
}

const mod: GameModule<L> = {
  id: 'odd-one-out',
  category: 'reflex',
  title: 'Odd One Out',
  rules: {
    goal: 'Find the one probe that is not like the others.',
    steps: [
      'Every probe in the grid is the same, except one.',
      'The odd one is turned slightly, slightly bigger, or a mirror image.',
      'Tap it before the bar runs out. A wrong tap costs time.',
      '10 boards. The grids grow and the difference shrinks.',
    ],
  },
  howTo: 'All probes match except one: turned, bigger, or mirrored. Tap it.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 220, 220)
    const { pc } = st
    const L = ctx.level
    let b = 0
    let t = 0
    let found = 0
    let wrong = 0
    let show = 0
    let showOk = true
    let ended = false
    let wrongFlash = 0
    let wrongCell = -1
    const missedKinds: Kind[] = []
    const times: number[] = []

    const geom = () => {
      const B = L.boards[b]
      const size = Math.min(pc.w, pc.h - 30) - 8
      const cell = size / B.n
      const x0 = (pc.w - size) / 2
      const y0 = 22 + (pc.h - 30 - size) / 2
      return { B, cell, x0, y0 }
    }

    const hud = () => (st.hud.textContent = `Board ${b + 1} / ${COUNT} · ${found} found`)
    hud()

    const advance = (ok: boolean) => {
      if (!ok) missedKinds.push(L.boards[b].kind)
      showOk = ok
      show = ok ? 0.45 : 1.1
      ctx.fx.sfx(ok ? 'correct' : 'wrong')
      ctx.fx.haptic(ok ? 'correct' : 'wrong')
    }

    pc.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      if (ended || show > 0) return
      const p = pc.toNative(e.clientX, e.clientY)
      const { B, cell, x0, y0 } = geom()
      const cx = Math.floor((p.x - x0) / cell)
      const cy = Math.floor((p.y - y0) / cell)
      if (cx < 0 || cy < 0 || cx >= B.n || cy >= B.n) return
      const k = cy * B.n + cx
      if (k === B.odd) {
        found++
        times.push(t)
        advance(true)
      } else {
        wrong++
        wrongCell = k
        wrongFlash = 0.35
        t += 1
        ctx.fx.sfx('wrong')
      }
    })

    const finish = () => {
      ended = true
      loop.stop()
      const avg = times.length ? times.reduce((a, c) => a + c, 0) / times.length : 0
      const hardest = missedKinds.length ? missedKinds.sort((a, c) => missedKinds.filter((x) => x === c).length - missedKinds.filter((x) => x === a).length)[0] : null
      const name = { rot: 'the slightly turned ones', size: 'the slightly bigger ones', mirror: 'the mirror images' }
      ctx.finish({
        score: Math.max(0, (found - wrong * 0.25) / COUNT),
        correct: found,
        total: COUNT,
        answer: `${found} of ${COUNT} found, ${times.length ? avg.toFixed(1) + ' s on average' : 'none in time'}, ${wrong} wrong taps.`,
        explanation: `${hardest ? `You missed most on ${name[hardest]}. ` : ''}Fast search works by letting the odd item pop out of the crowd. Scanning row by row is slower. Relax your eyes on the centre and let the different one jump out.`,
      })
    }

    const loop = new Loop((dt) => {
      if (ended) return
      wrongFlash = Math.max(0, wrongFlash - dt)
      if (show > 0) {
        show -= dt
        if (show <= 0) {
          b++
          t = 0
          if (b >= COUNT) return finish()
          hud()
        }
      } else {
        t += dt
        if (t >= L.limit) advance(false)
      }
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const { B, cell, x0, y0 } = geom()
      const r = cell * 0.34
      for (let k = 0; k < B.n * B.n; k++) {
        const x = x0 + (k % B.n) * cell + cell / 2
        const y = y0 + Math.floor(k / B.n) * cell + cell / 2
        const odd = k === B.odd
        let a = B.angle
        let rr = r
        let mir = false
        if (odd && B.kind === 'rot') a += (B.delta * Math.PI) / 180
        if (odd && B.kind === 'size') rr *= 1 + B.delta
        if (odd && B.kind === 'mirror') mir = true
        if (show > 0 && odd) {
          halo(g, x, y, r, r, showOk ? C.good : C.bad)
          roundRect(g, x - cell / 2 + 2, y - cell / 2 + 2, cell - 4, cell - 4, 6, showOk ? 'rgba(111,220,155,0.18)' : 'rgba(255,122,107,0.18)')
        }
        if (wrongFlash > 0 && k === wrongCell) roundRect(g, x - cell / 2 + 2, y - cell / 2 + 2, cell - 4, cell - 4, 6, 'rgba(255,122,107,0.25)')
        probe(g, x, y, rr, a, mir, RAMPS.cyan[1])
      }
      // Timer bar.
      const f = show > 0 ? 0 : Math.max(0, 1 - t / L.limit)
      roundRect(g, 6, 6, (pc.w - 12) * f, 4, 2, f < 0.25 ? C.bad : RAMPS.indigo[4])
      if (show > 0 && !showOk) drawText(g, 'HERE', pc.w / 2, pc.h - 12, C.bad, 1.2, 'center')
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
  score: defaultScore('reflex'),
}

export default mod

// Turn or Mirror: mental rotation. Two block shapes. Is the right one the left one
// turned around, or its mirror image turned around?
import { roundRect } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { button, Loop, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

type Cell = [number, number]
interface Trial {
  cells: Cell[]
  mirror: boolean
  /** Degrees the right shape is turned. */
  angle: number
}
interface L {
  trials: Trial[]
  limit: number
}

const COUNT = 12

const norm = (cs: Cell[]): string => {
  const mx = Math.min(...cs.map((c) => c[0]))
  const my = Math.min(...cs.map((c) => c[1]))
  return cs
    .map(([x, y]) => [x - mx, y - my])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .join(';')
}
const rot90 = (cs: Cell[]): Cell[] => cs.map(([x, y]) => [-y, x])
const flip = (cs: Cell[]): Cell[] => cs.map(([x, y]) => [-x, y])

/** True when no rotation of the shape equals its mirror image. */
export function chiral(cs: Cell[]): boolean {
  const m = norm(flip(cs))
  let r = cs
  for (let k = 0; k < 4; k++) {
    if (norm(r) === m) return false
    r = rot90(r)
  }
  return true
}

function grow(rng: RNG, n: number): Cell[] {
  const cells: Cell[] = [[0, 0]]
  const has = (x: number, y: number) => cells.some((c) => c[0] === x && c[1] === y)
  while (cells.length < n) {
    const [x, y] = rng.pick(cells)
    const [dx, dy] = rng.pick([
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const)
    if (!has(x + dx, y + dy)) cells.push([x + dx, y + dy])
  }
  return cells
}

function generate(rng: RNG, d: number): L {
  const trials: Trial[] = []
  const mirrors = rng.shuffle(Array.from({ length: COUNT }, (_, i) => i < COUNT / 2))
  for (let i = 0; i < COUNT; i++) {
    const n = Math.round(5 + d * 3) + (i >= COUNT / 2 ? 1 : 0)
    let cells = grow(rng, n)
    for (let k = 0; k < 20 && !chiral(cells); k++) cells = grow(rng, n)
    const step = d > 0.5 ? 30 : 90
    const angle = rng.int(1, 360 / step - 1) * step
    trials.push({ cells, mirror: mirrors[i], angle })
  }
  return { trials, limit: Math.round((8 - d * 3) * 10) / 10 }
}

function verify(l: L): boolean {
  const m = l.trials.filter((t) => t.mirror).length
  return l.trials.length === COUNT && m === COUNT / 2 && l.trials.every((t) => chiral(t.cells) && t.angle % 360 !== 0)
}

function drawShape(g: CanvasRenderingContext2D, cells: Cell[], cx: number, cy: number, unit: number, angleDeg: number, mirror: boolean, col: string): void {
  const xs = cells.map((c) => c[0])
  const ys = cells.map((c) => c[1])
  const mx = (Math.min(...xs) + Math.max(...xs) + 1) / 2
  const my = (Math.min(...ys) + Math.max(...ys) + 1) / 2
  g.save()
  g.translate(cx, cy)
  g.rotate((angleDeg * Math.PI) / 180)
  if (mirror) g.scale(-1, 1)
  for (const [x, y] of cells) roundRect(g, (x - mx) * unit + 1, (y - my) * unit + 1, unit - 2, unit - 2, 3, col)
  // Mark one end so the shape has a clear "head".
  const [hx, hy] = cells[0]
  roundRect(g, (hx - mx) * unit + unit * 0.3, (hy - my) * unit + unit * 0.3, unit * 0.4, unit * 0.4, 2, RAMPS.void[1])
  g.restore()
}

const mod: GameModule<L> = {
  id: 'turn-mirror',
  category: 'logic',
  title: 'Turn or Mirror',
  rules: {
    goal: 'Decide if the right shape is the left one turned, or its mirror image.',
    steps: [
      'Two block shapes appear side by side.',
      'Turn the left one in your head until it lines up with the right one.',
      'If it fits, tap TURNED. If only a flipped copy would fit, tap MIRROR.',
      '12 pairs, half are mirrors. Arrow keys work too.',
    ],
  },
  howTo: 'Rotate the left shape in your head. TURNED if it matches the right one, MIRROR if only a flipped copy would.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 220, 160)
    const { pc } = st
    const L = ctx.level
    let i = 0
    let t = 0
    let fb = 0
    let fbOk = true
    let right = 0
    let ended = false
    const times: number[] = []
    let bigMiss = 0

    const hud = () => (st.hud.textContent = `Pair ${i + 1} / ${COUNT} · ${right} right`)
    hud()

    const answer = (sayMirror: boolean | null) => {
      if (ended || fb > 0) return
      const tr = L.trials[i]
      const ok = sayMirror === tr.mirror
      if (ok) {
        right++
        times.push(t)
      } else if (Math.min(tr.angle, 360 - tr.angle) >= 120) bigMiss++
      fbOk = ok
      fb = ok ? 0.5 : 1.3
      ctx.fx.sfx(ok ? 'correct' : 'wrong')
      ctx.fx.haptic(ok ? 'correct' : 'wrong')
    }
    st.controls.append(button('TURNED', () => answer(false), 'big'), button('MIRROR', () => answer(true), 'big'))
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') answer(false)
      if (e.code === 'ArrowRight') answer(true)
    }
    addEventListener('keydown', onKey)

    const loop = new Loop((dt) => {
      if (ended) return
      if (fb > 0) {
        fb -= dt
        if (fb <= 0) {
          i++
          t = 0
          if (i >= COUNT) {
            ended = true
            loop.stop()
            const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0
            ctx.finish({
              score: right / COUNT,
              correct: right,
              total: COUNT,
              answer: `${right} of ${COUNT} right${times.length ? `, ${avg.toFixed(1)} s per correct pair` : ''}.`,
              explanation: `${bigMiss ? `${bigMiss} of your misses were on big turns. ` : ''}In the classic experiment, the time to answer grows steadily with the angle, as if people really turn a picture in their head. Anchor on the dark-marked block and one corner, then rotate just those.`,
            })
            return
          }
          hud()
        }
      } else {
        t += dt
        if (t >= L.limit) answer(null)
      }
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const tr = L.trials[i]
      const unit = Math.min(pc.w / 2 / 6.5, pc.h / 6.5)
      const cy = pc.h * 0.5
      drawShape(g, tr.cells, pc.w * 0.25, cy, unit, 0, false, RAMPS.cyan[0])
      const col = fb > 0 ? (fbOk ? C.good : C.bad) : RAMPS.amber[4]
      drawShape(g, tr.cells, pc.w * 0.75, cy, unit, tr.angle, tr.mirror, col)
      g.fillStyle = RAMPS.void[4]
      g.fillRect(pc.w / 2 - 0.5, 14, 1, pc.h - 28)
      if (fb > 0) drawText(g, tr.mirror ? 'IT WAS A MIRROR' : 'IT WAS TURNED', pc.w / 2, 4, col, 1.3, 'center')
      else roundRect(g, 10, 4, (pc.w - 20) * Math.max(0, 1 - t / L.limit), 4, 2, RAMPS.indigo[4])
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
  score: defaultScore('logic'),
}

export default mod

// Signal Drift: 2-back. Tap MATCH when the current pulse is the same as the
// one two pulses ago. Every symbol has its own shape and colour.
import { disc, halo, line, rect, ring } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { button, Loop, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

interface L {
  seq: number[]
  n: number
  match: boolean[]
  interval: number
}

const LEN = 22
const SHAPES = ['circle', 'triangle', 'square', 'diamond', 'plus', 'ring'] as const
const COLORS = [RAMPS.cyan[1], RAMPS.amber[4], RAMPS.magenta[3], RAMPS.green[3], RAMPS.violet[4], RAMPS.star[4]]

function generate(rng: RNG, d: number): L {
  const n = 2
  const seq: number[] = []
  const match: boolean[] = []
  const eligible = Array.from({ length: LEN - n }, (_, i) => i + n)
  const matchSet = new Set(rng.shuffle(eligible).slice(0, Math.round(eligible.length * 0.3)))
  for (let i = 0; i < LEN; i++) {
    if (matchSet.has(i)) {
      seq.push(seq[i - n])
      match.push(true)
      continue
    }
    let s: number
    // Lures: sometimes repeat the 1-back or 3-back symbol.
    if (i >= 3 && rng.bool(0.2) && seq[i - 3] !== seq[i - n]) s = seq[i - 3]
    else if (i >= 1 && rng.bool(0.15) && (i < n || seq[i - 1] !== seq[i - n])) s = seq[i - 1]
    else {
      do s = rng.int(0, SHAPES.length - 1)
      while (i >= n && s === seq[i - n])
    }
    seq.push(s)
    match.push(false)
  }
  return { seq, n, match, interval: 2.0 - d * 0.6 }
}

function verify(l: L): boolean {
  if (l.seq.length !== LEN) return false
  let m = 0
  for (let i = 0; i < l.seq.length; i++) {
    const truth = i >= l.n && l.seq[i] === l.seq[i - l.n]
    if (truth !== l.match[i]) return false
    if (truth) m++
  }
  const rate = m / (LEN - l.n)
  return rate >= 0.25 && rate <= 0.35
}

function shape(g: CanvasRenderingContext2D, id: number, x: number, y: number): void {
  const col = COLORS[id]
  halo(g, x, y, 13, 5, RAMPS.indigo[2])
  switch (SHAPES[id]) {
    case 'circle':
      disc(g, x, y, 10, col)
      break
    case 'triangle':
      for (let k = 0; k < 20; k++) rect(g, x - Math.floor(k / 2), y - 10 + k, Math.floor(k / 2) * 2 + 1, 1, col)
      break
    case 'square':
      rect(g, x - 9, y - 9, 19, 19, col)
      break
    case 'diamond':
      for (let k = -10; k <= 10; k++) rect(g, x - (10 - Math.abs(k)), y + k, (10 - Math.abs(k)) * 2 + 1, 1, col)
      break
    case 'plus':
      rect(g, x - 10, y - 3, 21, 7, col)
      rect(g, x - 3, y - 10, 7, 21, col)
      break
    case 'ring':
      for (let r = 7; r <= 10; r++) ring(g, x, y, r, col)
      break
  }
}

const mod: GameModule<L> = {
  id: 'signal-drift',
  category: 'memory',
  title: 'Signal Drift',
  howTo: 'Radio pulses arrive one at a time. Tap MATCH when a pulse is the same as the one 2 pulses before it.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 180, 160)
    const { pc } = st
    const L = ctx.level
    let i = -1
    let t = 0
    let pressed = false
    let hits = 0
    let cr = 0
    let fa = 0
    let miss = 0
    let fb = 0
    let fbOk = true

    const judge = () => {
      if (i < L.n) return
      const m = L.match[i]
      if (m && pressed) hits++
      else if (m && !pressed) miss++
      else if (!m && pressed) fa++
      else cr++
    }

    const press = () => {
      if (i < 0 || pressed) return
      pressed = true
      const ok = i >= L.n && L.match[i]
      fbOk = ok
      fb = 0.35
      ctx.fx.sfx(ok ? 'correct' : 'wrong')
      ctx.fx.haptic(ok ? 'tap' : 'wrong')
    }
    st.controls.append(button('MATCH', press, 'big'))
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        press()
      }
    }
    addEventListener('keydown', onKey)

    const loop = new Loop((dt, time) => {
      t += dt
      fb = Math.max(0, fb - dt)
      if (i < 0 || t >= L.interval) {
        if (i >= 0) judge()
        i++
        t = 0
        pressed = false
        if (i >= L.seq.length) {
          loop.stop()
          const total = L.seq.length - L.n
          ctx.finish({
            score: (hits + cr) / total,
            correct: hits + cr,
            total,
            answer: `${hits} matches caught, ${miss} missed, ${fa} false alarms.`,
            explanation: '2-back makes you hold two items and update them every pulse. The lures (repeats one or three back) are designed to feel familiar but are not matches.',
          })
          return
        }
        ctx.fx.sfx('hover')
        st.hud.textContent = `Pulse ${i + 1} / ${L.seq.length}`
      }
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const cx = Math.round(pc.w / 2)
      const cy = Math.round(pc.h / 2)
      // Dish grille.
      for (let r = 26; r < 60; r += 8) ring(g, cx, cy, r, RAMPS.indigo[1], true)
      line(g, cx - 60, cy, cx + 60, cy, RAMPS.void[3], 3)
      if (t < Math.min(0.9, L.interval * 0.55)) shape(g, L.seq[i], cx, cy)
      else drawText(g, '.', cx, cy - 2, RAMPS.star[0], 1, 'center')
      // Sweep dot.
      const a = time * 2
      g.fillStyle = RAMPS.teal[3]
      g.fillRect(Math.round(cx + Math.cos(a) * 50), Math.round(cy + Math.sin(a) * 50), 2, 2)
      if (fb > 0) drawText(g, fbOk ? 'MATCH!' : 'NO MATCH', cx, 4, fbOk ? C.good : C.bad, 1, 'center')
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
  score: defaultScore('memory'),
}

export default mod

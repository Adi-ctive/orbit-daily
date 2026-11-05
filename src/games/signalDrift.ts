// Signal Match (n-back). Each pulse: is it the SAME as the one N pulses ago, or
// DIFFERENT? The first pulses show the history strip with the comparison pulse
// outlined, so the rule is obvious. After that the strip hides and it is memory only.
import { disc, halo, line, polygon, ring, roundRect } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { button, el, Loop, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

interface L {
  seq: number[]
  n: number
  match: boolean[]
  interval: number
}

const LEN = 24
const SHAPES = ['circle', 'triangle', 'square', 'diamond', 'plus', 'ring'] as const
const COLORS = [RAMPS.cyan[1], RAMPS.amber[4], RAMPS.magenta[4], RAMPS.green[3], RAMPS.violet[4], RAMPS.star[4]]

function generate(rng: RNG, d: number): L {
  const n = d > 0.5 ? 3 : 2
  const seq: number[] = []
  const match: boolean[] = []
  const eligible = Array.from({ length: LEN - n }, (_, i) => i + n)
  const matchSet = new Set(rng.shuffle(eligible).slice(0, Math.round(eligible.length * 0.35)))
  for (let i = 0; i < LEN; i++) {
    if (matchSet.has(i)) {
      seq.push(seq[i - n])
      match.push(true)
      continue
    }
    let s: number
    // Lures: repeat a pulse one step off, so it feels familiar but is not a match.
    if (i >= n + 1 && rng.bool(0.25) && seq[i - n - 1] !== seq[i - n]) s = seq[i - n - 1]
    else if (i >= 1 && rng.bool(0.2) && (i < n || seq[i - 1] !== seq[i - n])) s = seq[i - 1]
    else {
      do s = rng.int(0, SHAPES.length - 1)
      while (i >= n && s === seq[i - n])
    }
    seq.push(s)
    match.push(false)
  }
  return { seq, n, match, interval: 2.4 - d * 0.8 }
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
  return rate >= 0.3 && rate <= 0.4
}

function shape(g: CanvasRenderingContext2D, id: number, x: number, y: number, k = 1, glow = true): void {
  const col = COLORS[id]
  if (glow) halo(g, x, y, 10 * k, 16 * k, col)
  switch (SHAPES[id]) {
    case 'circle':
      disc(g, x, y, 10 * k, col)
      break
    case 'triangle':
      polygon(g, [[x, y - 11 * k], [x + 11 * k, y + 9 * k], [x - 11 * k, y + 9 * k]], col)
      break
    case 'square':
      roundRect(g, x - 9 * k, y - 9 * k, 18 * k, 18 * k, 2.5 * k, col)
      break
    case 'diamond':
      polygon(g, [[x, y - 12 * k], [x + 10 * k, y], [x, y + 12 * k], [x - 10 * k, y]], col)
      break
    case 'plus':
      roundRect(g, x - 11 * k, y - 3.5 * k, 22 * k, 7 * k, 2 * k, col)
      roundRect(g, x - 3.5 * k, y - 11 * k, 7 * k, 22 * k, 2 * k, col)
      break
    case 'ring':
      ring(g, x, y, 8.5 * k, col, false, 3.5 * k)
      break
  }
}

const mod: GameModule<L> = {
  id: 'signal-drift',
  category: 'memory',
  title: 'Signal Match',
  rules: {
    goal: 'Say whether each pulse matches the one N pulses before it.',
    steps: [
      'Symbols arrive one at a time. N is 2 or 3 and is shown at the top.',
      'For each new symbol, compare it with the one N steps back.',
      'Tap SAME if they match, DIFFERENT if not, before the next one arrives.',
      'The first few show the history strip to help. After that it is memory only.',
    ],
  },
  howTo: 'For each symbol, tap SAME if it matches the one N steps back, otherwise DIFFERENT.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 200, 170)
    const { pc } = st
    const L = ctx.level
    const TRAIN = L.n + 3
    let i = -1
    let t = 0
    let answered = false
    let right = 0
    let asked = 0
    let flash = 0
    let flashOk = true

    const same = button('SAME', () => answer(true), 'big')
    const diff = button('DIFFERENT', () => answer(false), 'big')
    const prompt = el('p', { class: 'g-text sm-prompt' })
    st.controls.append(prompt, same, diff)

    const setButtons = (on: boolean) => {
      same.disabled = !on
      diff.disabled = !on
    }

    const answer = (saySame: boolean) => {
      if (answered || i < L.n) return
      answered = true
      asked++
      const ok = saySame === L.match[i]
      if (ok) right++
      flashOk = ok
      flash = 0.45
      ctx.fx.sfx(ok ? 'correct' : 'wrong')
      ctx.fx.haptic(ok ? 'tap' : 'wrong')
      setButtons(false)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyS') answer(true)
      if (e.code === 'ArrowRight' || e.code === 'KeyD') answer(false)
    }
    addEventListener('keydown', onKey)

    const advance = () => {
      // An unanswered comparison counts as wrong.
      if (i >= L.n && !answered) {
        asked++
        flashOk = false
        flash = 0.45
        ctx.fx.sfx('wrong')
      }
      i++
      t = 0
      answered = false
      if (i >= L.seq.length) {
        loop.stop()
        ctx.finish({
          score: right / Math.max(1, asked),
          correct: right,
          total: asked,
          answer: `${right} of ${asked} comparisons right (${L.n}-back).`,
          explanation: `Holding the last ${L.n} symbols and updating them every step is the hard part. The decoys repeated a symbol one step off, so they felt familiar without matching.`,
        })
        return
      }
      ctx.fx.sfx('hover')
      setButtons(i >= L.n)
      prompt.textContent = i < L.n ? `Remember this one (${i + 1} of ${L.n})` : `Same as ${L.n} back?`
      st.hud.textContent = `${L.n}-back · ${i + 1} / ${L.seq.length}${i < TRAIN ? ' · practice' : ''}`
    }

    const loop = new Loop((dt) => {
      t += dt
      flash = Math.max(0, flash - dt)
      if (i < 0 || t >= L.interval) advance()
      if (i >= L.seq.length) return
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const cx = pc.w / 2
      const cy = pc.h * 0.4
      // Current symbol, big.
      if (i >= 0) shape(g, L.seq[i], cx, cy, 1.5)
      if (flash > 0) ring(g, cx, cy, 30, flashOk ? C.good : C.bad, false, 2.5)
      // History strip: the last N symbols, oldest on the left.
      const tw = 22
      const sy = pc.h * 0.8
      const x0 = cx - ((L.n + 1) * (tw + 6)) / 2 + tw / 2
      for (let k = 0; k <= L.n; k++) {
        const idx = i - L.n + k
        const x = x0 + k * (tw + 6)
        const isNow = k === L.n
        roundRect(g, x - tw / 2, sy - tw / 2, tw, tw, 5, isNow ? RAMPS.void[4] : RAMPS.void[3])
        if (idx < 0) continue
        if (isNow || i < TRAIN) shape(g, L.seq[idx], x, sy, 0.55, false)
        else drawText(g, '?', x, sy - 4, RAMPS.star[1], 1.2, 'center')
        if (k === 0 && i >= L.n) {
          g.strokeStyle = RAMPS.amber[4]
          g.lineWidth = 1.4
          g.beginPath()
          g.roundRect(x - tw / 2 - 2, sy - tw / 2 - 2, tw + 4, tw + 4, 6)
          g.stroke()
        }
      }
      drawText(g, `${L.n} BACK`, x0, sy + tw / 2 + 4, RAMPS.amber[4], 0.9, 'center')
      drawText(g, 'NOW', x0 + L.n * (tw + 6), sy + tw / 2 + 4, RAMPS.star[2], 0.9, 'center')
      // Time left for this symbol.
      line(g, 10, pc.h - 3, 10 + (pc.w - 20) * Math.max(0, 1 - t / L.interval), pc.h - 3, RAMPS.indigo[3], 0, 2)
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

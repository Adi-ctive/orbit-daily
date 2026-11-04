// Constellation Recall: Corsi block span on stars. Repeat the sequence forward,
// then backward. Span grows after a success and shrinks after a miss.
import { halo, line, starShape } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { GameTimer, Loop, makeStage, dInt } from './kit'
import { defaultScore, type GameModule } from './types'

interface L {
  stars: { x: number; y: number }[]
  seqs: number[][]
  span0: number
}

const MODES = ['forward', 'forward', 'backward', 'backward'] as const

function generate(rng: RNG, d: number): L {
  const stars: { x: number; y: number }[] = []
  let g = 0
  while (stars.length < 12 && g++ < 3000) {
    const x = rng.range(0.1, 0.9)
    const y = rng.range(0.1, 0.9)
    if (stars.every((s) => Math.hypot(s.x - x, s.y - y) >= 0.19)) stars.push({ x, y })
  }
  const seqs = MODES.map(() => rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))
  return { stars, seqs, span0: dInt(d, 4, 7) }
}

function verify(l: L): boolean {
  return (
    l.stars.length === 12 &&
    l.seqs.length === 4 &&
    l.seqs.every((s) => s.length === 12 && new Set(s).size === 12) &&
    l.span0 >= 4 &&
    l.span0 <= 9
  )
}

const mod: GameModule<L> = {
  id: 'constellation',
  category: 'memory',
  title: 'Constellation Recall',
  howTo: 'Stars light up one by one. Tap them in the same order. In the second half, tap them in reverse.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 200, 200)
    const { pc } = st
    const L = ctx.level
    const timer = new GameTimer()
    let trial = 0
    let span = L.span0
    let phase: 'show' | 'input' | 'fb' = 'show'
    let lit = -1
    let taps: number[] = []
    let fbOk = false
    let correct = 0
    const best = { forward: 0, backward: 0 }
    let flash = -1

    const seq = () => L.seqs[trial].slice(0, span)
    const expected = () => (MODES[trial] === 'forward' ? seq() : seq().slice().reverse())

    const startTrial = () => {
      phase = 'show'
      taps = []
      st.hud.textContent = `${MODES[trial] === 'forward' ? 'Forward' : 'Backward'} · ${span} stars · ${trial + 1} / 4`
      const s = seq()
      s.forEach((idx, k) => {
        timer.after(0.5 + k * 0.62, () => {
          lit = idx
          ctx.fx.sfx('hover')
        })
        timer.after(0.5 + k * 0.62 + 0.38, () => (lit = -1))
      })
      timer.after(0.5 + s.length * 0.62 + 0.1, () => {
        phase = 'input'
        st.hud.textContent = MODES[trial] === 'forward' ? 'Tap in the same order' : 'Tap in REVERSE order'
      })
    }

    const pos = (i: number) => ({ x: Math.round(14 + L.stars[i].x * (pc.w - 28)), y: Math.round(14 + L.stars[i].y * (pc.h - 28)) })

    pc.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      if (phase !== 'input') return
      const p = pc.toNative(e.clientX, e.clientY)
      let hit = -1
      let bd = 16
      L.stars.forEach((_, i) => {
        const q = pos(i)
        const d = Math.hypot(q.x - p.x, q.y - p.y)
        if (d < bd) {
          bd = d
          hit = i
        }
      })
      if (hit < 0) return
      taps.push(hit)
      flash = hit
      timer.after(0.2, () => (flash = -1))
      ctx.fx.sfx('tap')
      ctx.fx.haptic('tap')
      const exp = expected()
      const wrong = taps[taps.length - 1] !== exp[taps.length - 1]
      if (wrong || taps.length === exp.length) {
        fbOk = !wrong
        phase = 'fb'
        if (fbOk) {
          correct++
          best[MODES[trial]] = Math.max(best[MODES[trial]], span)
          ctx.fx.sfx('correct')
        } else {
          ctx.fx.sfx('wrong')
          ctx.fx.shake(1)
        }
        timer.after(1.1, () => {
          span = Math.max(2, Math.min(12, span + (fbOk ? 1 : -1)))
          trial++
          if (trial === 2) span = Math.max(2, L.span0 - 1)
          if (trial >= 4) {
            loop.stop()
            ctx.finish({
              score: correct / 4,
              correct,
              total: 4,
              answer: `Best span: ${best.forward || '–'} forward, ${best.backward || '–'} backward.`,
              explanation: 'Many adults hold about 5 locations in order. Reversing the order adds a mental step, so backward spans usually run one shorter.',
            })
            return
          }
          startTrial()
        })
      }
    })

    const loop = new Loop((dt, t) => {
      timer.tick(dt)
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      // Lines between tapped stars.
      for (let k = 1; k < taps.length; k++) {
        const a = pos(taps[k - 1])
        const b = pos(taps[k])
        line(g, a.x, a.y, b.x, b.y, RAMPS.indigo[3], 2)
      }
      L.stars.forEach((_, i) => {
        const { x, y } = pos(i)
        const on = i === lit || i === flash
        const tw = Math.sin(t * 2 + i) > 0.6
        if (on) halo(g, x, y, 4, 12, RAMPS.amber[4])
        else halo(g, x, y, 1, 5, RAMPS.indigo[3])
        starShape(g, x, y, on ? 7 : 5, on ? RAMPS.amber[5] : tw ? RAMPS.star[4] : RAMPS.star[2])
      })
      if (phase === 'fb') drawText(g, fbOk ? 'CORRECT' : 'NOT QUITE', pc.w / 2, 2, fbOk ? C.good : C.bad, 1, 'center')
    })
    startTrial()
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

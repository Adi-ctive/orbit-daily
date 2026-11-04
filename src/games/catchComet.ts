// Catch the Comet: coincidence-anticipation timing. The comet passes behind a
// planet; tap the moment it reaches the gate marker.
import { ball, disc, halo, line, polygon } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { button, Loop, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

interface Trial {
  /** Path widths per second. */
  speed: number
  occ: [number, number]
  gate: number
  delay: number
  y: number
}
interface L {
  trials: Trial[]
  tol: number
}

function generate(rng: RNG, d: number): L {
  const trials: Trial[] = []
  for (let i = 0; i < 10; i++) {
    const width = 0.24 + d * 0.24 + rng.range(-0.04, 0.04)
    const o0 = rng.range(0.2, 0.32)
    trials.push({
      speed: Math.round((0.42 + d * 0.45 + rng.range(-0.06, 0.1)) * 1000) / 1000,
      occ: [o0, o0 + width],
      gate: Math.min(0.92, o0 + width + rng.range(0.02, 0.1)),
      delay: rng.range(0.4, 1.0),
      y: rng.range(0.38, 0.62),
    })
  }
  return { trials, tol: 0.22 - d * 0.12 }
}

function verify(l: L): boolean {
  return (
    l.trials.length === 10 &&
    l.trials.every((t) => t.speed > 0.1 && t.occ[0] > 0.1 && t.occ[1] < t.gate && t.gate <= 0.95 && t.occ[1] - t.occ[0] > 0.1)
  )
}

const mod: GameModule<L> = {
  id: 'catch-comet',
  category: 'reflex',
  title: 'Catch the Comet',
  howTo: 'A comet slides behind a planet. Tap CATCH at the exact moment it reaches the gate ▼, even while it is hidden.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 220, 160)
    const { pc } = st
    const L = ctx.level
    ctx.fx.duck(true)
    let i = 0
    let t = 0
    let tapped = false
    let fb = ''
    let fbT = 0
    const errs: (number | null)[] = []
    let ended = false

    const arrival = (tr: Trial) => tr.delay + (tr.gate + 0.05) / tr.speed

    const endTrial = (err: number | null) => {
      errs.push(err)
      if (err === null) fb = 'MISSED'
      else fb = (err > 0 ? '+' : '') + Math.round(err * 1000) + ' MS'
      const good = err !== null && Math.abs(err) < L.tol / 2
      ctx.fx.sfx(good ? 'correct' : err === null ? 'wrong' : 'tap')
      if (good) ctx.fx.haptic('correct')
      fbT = 0.8
      i++
      t = 0
      tapped = false
      st.hud.textContent = `${Math.min(i + 1, L.trials.length)} / ${L.trials.length}`
      if (i >= L.trials.length) finish()
    }

    const finish = () => {
      if (ended) return
      ended = true
      const scores = errs.map((e) => (e === null ? 0 : Math.max(0, 1 - Math.abs(e) / L.tol)))
      const hit = errs.filter((e) => e !== null && Math.abs(e) < L.tol / 2).length
      const valid = errs.filter((e): e is number => e !== null)
      const bias = valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 1000) : 0
      setTimeout(() => {
        loop.stop()
        ctx.finish({
          score: scores.reduce((a, b) => a + b, 0) / scores.length,
          correct: hit,
          total: L.trials.length,
          answer: `${hit} of ${L.trials.length} catches within ${Math.round((L.tol / 2) * 1000)} ms.`,
          explanation: `On average you were ${Math.abs(bias)} ms ${bias >= 0 ? 'late' : 'early'}. Your brain keeps tracking motion it can't see by extrapolating speed, which is why hidden stretches feel harder the longer they are.`,
        })
      }, 700)
    }

    const tap = () => {
      if (i >= L.trials.length || tapped) return
      const tr = L.trials[i]
      if (t < tr.delay) return
      tapped = true
      ctx.fx.haptic('tap')
      endTrial(t - arrival(tr))
    }
    st.controls.append(button('CATCH', tap, 'big'))
    pc.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      tap()
    })
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        tap()
      }
    }
    addEventListener('keydown', onKey)
    st.hud.textContent = `1 / ${L.trials.length}`

    const loop = new Loop((dt) => {
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      fbT = Math.max(0, fbT - dt)
      if (i >= L.trials.length) {
        drawText(g, fb, pc.w / 2, pc.h * 0.2, C.amberHi, 1, 'center')
        return
      }
      t += dt
      const tr = L.trials[i]
      const W = pc.w
      const y = Math.round(pc.h * tr.y)
      // Path.
      line(g, 0, y, W, y, RAMPS.indigo[1], 2)
      // Gate.
      const gx = Math.round(tr.gate * W)
      line(g, gx, y - 22, gx, y + 22, RAMPS.amber[3], 2)
      polygon(g, [[gx - 4, y - 30], [gx + 4, y - 30], [gx, y - 24]], RAMPS.amber[4])
      // Occluding planet.
      const ox = ((tr.occ[0] + tr.occ[1]) / 2) * W
      const r = Math.round(((tr.occ[1] - tr.occ[0]) * W) / 2)
      halo(g, ox, y, r, 3, RAMPS.magenta[1])
      ball(g, ox, y, r, RAMPS.violet[0], RAMPS.violet[2], RAMPS.violet[3], RAMPS.violet[4])
      // Comet.
      if (t >= tr.delay) {
        const x = ((t - tr.delay) * tr.speed - 0.05) * W
        const hidden = x / W > tr.occ[0] && x / W < tr.occ[1]
        if (!hidden && x < W + 10) {
          const tail = g.createLinearGradient(x - 22, y, x, y)
          tail.addColorStop(0, 'rgba(159,220,240,0)')
          tail.addColorStop(1, 'rgba(214,242,251,0.9)')
          polygon(g, [[x - 22, y], [x, y - 2.2], [x, y + 2.2]], tail)
          halo(g, x, y, 1.5, 6, RAMPS.cyan[1])
          disc(g, x, y, 2.2, RAMPS.star[4])
        }
        if (!tapped && t > arrival(tr) + 0.6) endTrial(null)
      }
      if (fbT > 0) drawText(g, fb, W / 2, pc.h * 0.12, C.amberHi, 1, 'center')
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
  score: defaultScore('reflex'),
}

export default mod

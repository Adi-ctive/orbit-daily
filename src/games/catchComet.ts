// Catch the Comet: coincidence timing. A comet flies along a line, passes behind a
// planet, and you tap the moment it crosses the gate. The first pass is practice
// with nothing hidden; after every tap a ghost shows where the comet really was.
import { ball, disc, halo, line, polygon } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { button, Loop, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

interface Trial {
  /** Path widths per second. */
  speed: number
  /** Hidden stretch as fractions of the path. Zero width on the practice pass. */
  occ: [number, number]
  gate: number
  delay: number
}
interface L {
  trials: Trial[]
  tol: number
}

const N = 9

function generate(rng: RNG, d: number): L {
  const trials: Trial[] = []
  for (let i = 0; i < N; i++) {
    const practice = i === 0
    const width = practice ? 0 : 0.22 + d * 0.26 + rng.range(-0.04, 0.04)
    const o0 = rng.range(0.22, 0.34)
    trials.push({
      speed: Math.round((0.38 + d * 0.42 + rng.range(-0.05, 0.08)) * 1000) / 1000,
      occ: [o0, o0 + width],
      gate: Math.min(0.92, o0 + width + rng.range(0.03, 0.1)),
      delay: rng.range(0.4, 0.9),
    })
  }
  return { trials, tol: 0.22 - d * 0.12 }
}

function verify(l: L): boolean {
  return (
    l.trials.length === N &&
    l.trials[0].occ[1] === l.trials[0].occ[0] &&
    l.trials.slice(1).every((t) => t.speed > 0.1 && t.occ[0] > 0.1 && t.occ[1] < t.gate && t.gate <= 0.95 && t.occ[1] - t.occ[0] > 0.1)
  )
}

const mod: GameModule<L> = {
  id: 'catch-comet',
  category: 'reflex',
  title: 'Catch the Comet',
  rules: {
    goal: 'Tap the exact moment the comet crosses the gate.',
    steps: [
      'The comet flies left to right at a steady speed.',
      'It passes behind a planet, so for a while you cannot see it.',
      'Keep its speed in your head and tap CATCH when it crosses the bright gate line.',
      'The first pass is practice with nothing hidden. Then 8 scored passes.',
    ],
  },
  howTo: 'Tap CATCH when the comet crosses the gate, even while it is hidden behind the planet.',
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
    let ghostX: number | null = null
    let resultT = 0
    let msg = ''
    let msgCol: string = C.amberHi
    const errs: (number | null)[] = []
    let ended = false

    const arrival = (tr: Trial) => tr.delay + tr.gate / tr.speed
    const posAt = (tr: Trial, time: number) => (time - tr.delay) * tr.speed

    const hud = () => (st.hud.textContent = i === 0 ? 'Practice pass · nothing hidden' : `Pass ${i} / ${N - 1} · tap as it crosses the gate`)

    const judge = (err: number | null) => {
      if (i > 0) errs.push(err)
      if (err === null) {
        msg = 'MISSED'
        msgCol = C.bad
      } else {
        const ms = Math.round(Math.abs(err) * 1000)
        const good = Math.abs(err) < L.tol / 2
        msg = ms < 15 ? 'PERFECT' : `${ms} MS ${err > 0 ? 'LATE' : 'EARLY'}`
        msgCol = good ? C.good : Math.abs(err) < L.tol ? C.amberHi : C.bad
        ctx.fx.sfx(good ? 'correct' : 'tap')
        if (good) ctx.fx.haptic('correct')
      }
      if (err === null) ctx.fx.sfx('wrong')
      resultT = 1.2
    }

    const nextTrial = () => {
      i++
      t = 0
      tapped = false
      ghostX = null
      if (i >= L.trials.length) return finish()
      hud()
    }

    const finish = () => {
      if (ended) return
      ended = true
      const scores = errs.map((e) => (e === null ? 0 : Math.max(0, 1 - Math.abs(e) / L.tol)))
      const hit = errs.filter((e) => e !== null && Math.abs(e) < L.tol / 2).length
      const valid = errs.filter((e): e is number => e !== null)
      const bias = valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 1000) : 0
      loop.stop()
      ctx.finish({
        score: scores.reduce((a, b) => a + b, 0) / scores.length,
        correct: hit,
        total: errs.length,
        answer: `${hit} of ${errs.length} catches within ${Math.round((L.tol / 2) * 1000)} ms.`,
        explanation: `On average you tapped ${Math.abs(bias)} ms ${bias >= 0 ? 'late' : 'early'}. When something disappears, your brain keeps extrapolating its speed. The longer it is hidden, the more that estimate drifts.`,
      })
    }

    const tap = () => {
      if (ended || tapped || i >= L.trials.length) return
      const tr = L.trials[i]
      if (t < tr.delay) return
      tapped = true
      ctx.fx.haptic('tap')
      ghostX = posAt(tr, t)
      judge(t - arrival(tr))
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
    hud()

    const loop = new Loop((dt) => {
      if (ended) return
      if (resultT > 0) {
        resultT -= dt
        if (resultT <= 0) nextTrial()
        if (ended) return
      } else {
        t += dt
        if (!tapped && t > arrival(L.trials[i]) + 0.6) {
          tapped = true
          judge(null)
        }
      }
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const tr = L.trials[i]
      const W = pc.w
      const y = Math.round(pc.h * 0.55)
      const pad = 10
      const X = (f: number) => pad + f * (W - pad * 2)
      // Track.
      line(g, X(0), y, X(1), y, RAMPS.indigo[1], 2)
      // Gate: a bright line with a label.
      const gx = X(tr.gate)
      halo(g, gx, y, 1, 10, RAMPS.amber[3])
      line(g, gx, y - 26, gx, y + 26, RAMPS.amber[4], 0, 1.6)
      polygon(g, [[gx - 4, y - 32], [gx + 4, y - 32], [gx, y - 27]], RAMPS.amber[4])
      drawText(g, 'GATE', gx, y + 30, RAMPS.amber[4], 1, 'center')
      // Planet hides part of the path.
      const hidden = tr.occ[1] > tr.occ[0]
      if (hidden) {
        const ox = (X(tr.occ[0]) + X(tr.occ[1])) / 2
        const r = (X(tr.occ[1]) - X(tr.occ[0])) / 2
        halo(g, ox, y, r, 6, RAMPS.indigo[3])
        ball(g, ox, y, r, RAMPS.void[3], RAMPS.violet[2], RAMPS.violet[3], RAMPS.violet[4])
      }
      // Comet.
      const p = posAt(tr, t)
      const shown = !tapped || resultT <= 0 ? p : ghostX ?? p
      const behind = hidden && shown > tr.occ[0] && shown < tr.occ[1]
      if (t >= tr.delay && shown <= 1.05 && !(tapped && resultT > 0) && !behind) {
        const x = X(shown)
        const tail = g.createLinearGradient(x - 26, y, x, y)
        tail.addColorStop(0, 'rgba(159,220,240,0)')
        tail.addColorStop(1, 'rgba(214,242,251,0.9)')
        polygon(g, [[x - 26, y], [x, y - 2.4], [x, y + 2.4]], tail)
        halo(g, x, y, 1.5, 7, RAMPS.cyan[1])
        disc(g, x, y, 2.4, RAMPS.star[4])
      }
      // After a tap: a ghost where the comet really was, and the gap to the gate.
      if (tapped && resultT > 0 && ghostX !== null) {
        const x = X(ghostX)
        line(g, x, y - 10, gx, y - 10, msgCol, 0, 1.4)
        disc(g, x, y, 4, msgCol)
        disc(g, x, y, 2, RAMPS.void[1])
        drawText(g, msg, W / 2, 10, msgCol, 1.6, 'center')
      } else if (tapped && resultT > 0) drawText(g, msg, W / 2, 10, msgCol, 1.6, 'center')
      if (i === 0) drawText(g, 'PRACTICE', 8, pc.h - 14, RAMPS.star[1], 1, 'left')
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

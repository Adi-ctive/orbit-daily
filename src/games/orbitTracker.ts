// Orbit Tracker: multiple object tracking. Marked moons flash, then every moon
// looks the same and drifts. Pick the marked ones.
import { ball, frame, ring } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { Loop, makeStage, dInt } from './kit'
import { defaultScore, type GameModule } from './types'

interface Moon {
  x: number
  y: number
  vx: number
  vy: number
}
interface Trial {
  moons: Moon[]
  targets: number[]
  duration: number
}
interface L {
  trials: Trial[]
}

function generate(rng: RNG, d: number): L {
  const trials: Trial[] = []
  for (let k = 0; k < 3; k++) {
    const n = dInt(d, 6, 10)
    const nt = dInt(d, 3, 5)
    const moons: Moon[] = []
    let guard = 0
    while (moons.length < n && guard++ < 500) {
      const x = rng.range(0.1, 0.9)
      const y = rng.range(0.1, 0.9)
      if (moons.some((m) => Math.hypot(m.x - x, m.y - y) < 0.16)) continue
      const a = rng.range(0, Math.PI * 2)
      const s = 0.12 + d * 0.18
      moons.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s })
    }
    trials.push({ moons, targets: rng.shuffle(moons.map((_, i) => i)).slice(0, nt).sort((a, b) => a - b), duration: 4 + d * 4 })
  }
  return { trials }
}

function verify(l: L): boolean {
  return l.trials.every(
    (t) =>
      t.moons.length >= 6 &&
      t.targets.length >= 3 &&
      t.targets.length < t.moons.length &&
      new Set(t.targets).size === t.targets.length &&
      t.moons.every((m, i) => t.moons.every((o, j) => i === j || Math.hypot(m.x - o.x, m.y - o.y) >= 0.16)),
  )
}

const mod: GameModule<L> = {
  id: 'orbit-tracker',
  category: 'reflex',
  title: 'Orbit Tracker',
  howTo: 'Watch the moons marked with ◆. When they all look alike and drift, keep your eyes on them. Then tap the marked ones.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 200, 200)
    const { pc } = st
    const L = ctx.level
    let ti = 0
    let phase: 'show' | 'move' | 'pick' | 'reveal' = 'show'
    let pt = 0
    let moons: Moon[] = []
    let picks: number[] = []
    let correct = 0
    let total = 0

    const startTrial = () => {
      moons = L.trials[ti].moons.map((m) => ({ ...m }))
      picks = []
      phase = 'show'
      pt = 0
      st.hud.textContent = `Track ${L.trials[ti].targets.length} moons · ${ti + 1} / ${L.trials.length}`
    }

    const field = () => {
      const m = 8
      return { x: m, y: m, w: pc.w - m * 2, h: pc.h - m * 2 }
    }

    const step = (dt: number) => {
      for (const m of moons) {
        m.x += m.vx * dt
        m.y += m.vy * dt
        if (m.x < 0.04 || m.x > 0.96) {
          m.vx *= -1
          m.x = Math.max(0.04, Math.min(0.96, m.x))
        }
        if (m.y < 0.04 || m.y > 0.96) {
          m.vy *= -1
          m.y = Math.max(0.04, Math.min(0.96, m.y))
        }
      }
    }

    pc.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      if (phase !== 'pick') return
      const p = pc.toNative(e.clientX, e.clientY)
      const f = field()
      let best = -1
      let bd = 18
      moons.forEach((m, i) => {
        const d = Math.hypot(f.x + m.x * f.w - p.x, f.y + m.y * f.h - p.y)
        if (d < bd) {
          bd = d
          best = i
        }
      })
      if (best < 0) return
      const at = picks.indexOf(best)
      if (at >= 0) picks.splice(at, 1)
      else picks.push(best)
      ctx.fx.sfx('tap')
      ctx.fx.haptic('tap')
      const tr = L.trials[ti]
      if (picks.length === tr.targets.length) {
        const ok = picks.filter((p) => tr.targets.includes(p)).length
        correct += ok
        total += tr.targets.length
        ctx.fx.sfx(ok === tr.targets.length ? 'correct' : 'wrong')
        phase = 'reveal'
        pt = 0
      }
    })

    const loop = new Loop((dt, t) => {
      pt += dt
      const tr = L.trials[ti]
      if (phase === 'show' && pt > 2.2) {
        phase = 'move'
        pt = 0
      } else if (phase === 'move') {
        step(dt)
        if (pt > tr.duration) {
          phase = 'pick'
          pt = 0
          st.hud.textContent = `Tap the ${tr.targets.length} marked moons`
        }
      } else if (phase === 'reveal' && pt > 1.4) {
        ti++
        if (ti >= L.trials.length) {
          loop.stop()
          ctx.finish({
            score: correct / total,
            correct,
            total,
            answer: `You found ${correct} of ${total} marked moons.`,
            explanation: 'Most people can track about four moving objects at once. Beyond that, attention starts swapping targets when they pass close together.',
          })
          return
        }
        startTrial()
      }
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const f = field()
      g.fillStyle = RAMPS.void[1]
      g.fillRect(f.x - 4, f.y - 4, f.w + 8, f.h + 8)
      frame(g, f.x - 4, f.y - 4, f.w + 8, f.h + 8, RAMPS.indigo[1])
      moons.forEach((m, i) => {
        const x = Math.round(f.x + m.x * f.w)
        const y = Math.round(f.y + m.y * f.h)
        const isT = tr.targets.includes(i)
        const mark = (phase === 'show' && isT) || (phase === 'reveal' && isT)
        if (mark) {
          ball(g, x, y, 5, RAMPS.amber[1], RAMPS.amber[3], RAMPS.amber[4], RAMPS.amber[5])
          // Diamond marker.
          const blink = phase === 'show' && Math.floor(t * 6) % 2
          if (!blink)
            for (let k = 0; k < 3; k++) {
              g.fillRect(x - k, y - 10 + k, k * 2 + 1, 1)
              g.fillRect(x - k, y - 6 - k, k * 2 + 1, 1)
            }
        } else ball(g, x, y, 5, RAMPS.indigo[1], RAMPS.indigo[3], RAMPS.indigo[4], RAMPS.star[3])
        if (picks.includes(i)) ring(g, x, y, 8, phase === 'reveal' ? (isT ? C.good : C.bad) : C.cyanHi)
      })
      if (phase === 'show') drawText(g, 'WATCH', pc.w / 2, 2, C.amberHi, 1, 'center')
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
  score: defaultScore('reflex'),
}

export default mod

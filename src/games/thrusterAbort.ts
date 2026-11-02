// Thruster Abort: stop-signal task. Fire on GO; hold when the abort beacon flashes.
// The stop delay adapts by staircase within the round.
import { C, RAMPS } from '../art/palette'
import { halo, line, rect } from '../art/draw'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { button, GameTimer, Loop, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

interface Trial {
  stop: boolean
  wait: number
}
interface L {
  trials: Trial[]
  ssd0: number
  deadline: number
}

const N = 20
const STOPS = 5

function generate(rng: RNG, d: number): L {
  const rest = rng.shuffle([...Array(STOPS).fill(true), ...Array(N - 2 - STOPS).fill(false)] as boolean[])
  const flags = [false, false, ...rest]
  return {
    trials: flags.map((stop) => ({ stop, wait: Math.round(rng.range(0.7, 1.6) * 100) / 100 })),
    ssd0: 0.2,
    deadline: Math.round((1 - d * 0.4) * 100) / 100,
  }
}

function verify(l: L): boolean {
  return (
    l.trials.length === N &&
    l.trials.filter((t) => t.stop).length === STOPS &&
    !l.trials[0].stop &&
    !l.trials[1].stop &&
    l.deadline >= 0.55 &&
    l.trials.every((t) => t.wait >= 0.5 && t.wait <= 2)
  )
}

function ship(ctx: CanvasRenderingContext2D, cx: number, cy: number, flame: number): void {
  const hull = [RAMPS.star[1], RAMPS.star[2], RAMPS.star[3], RAMPS.star[4]]
  for (let y = 0; y < 26; y++) {
    const w = Math.round(2 + y * 0.42)
    for (let x = -w; x <= w; x++) {
      const t = (x + w) / (2 * w + 1)
      rect(ctx, cx + x, cy - 14 + y, 1, 1, x === -w || x === w ? RAMPS.violet[0] : hull[Math.min(3, Math.floor((1 - t) * 3.2 + (y < 6 ? 1 : 0)))])
    }
  }
  rect(ctx, cx - 2, cy - 6, 5, 5, RAMPS.cyan[0])
  rect(ctx, cx - 1, cy - 6, 2, 2, RAMPS.cyan[2])
  rect(ctx, cx - 14, cy + 6, 4, 8, RAMPS.magenta[2])
  rect(ctx, cx + 11, cy + 6, 4, 8, RAMPS.magenta[2])
  if (flame > 0) {
    const fl = [RAMPS.amber[5], RAMPS.amber[4], RAMPS.amber[3], RAMPS.lava[3]]
    for (let i = 0; i < 4; i++) rect(ctx, cx - 4 + i, cy + 12, 9 - i * 2, Math.round(flame * (10 - i * 2)), fl[i])
  }
}

function goBeacon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  halo(ctx, cx, cy, 9, 4, RAMPS.teal[2])
  // Up-pointing triangle = GO.
  for (let y = 0; y < 14; y++) rect(ctx, cx - Math.floor(y / 2), cy - 7 + y, Math.floor(y / 2) * 2 + 1, 1, y < 3 ? RAMPS.cyan[2] : RAMPS.green[3])
}

function abortBeacon(ctx: CanvasRenderingContext2D, cx: number, cy: number, blink: boolean): void {
  halo(ctx, cx, cy, 10, 5, RAMPS.lava[2])
  // Octagon with an X = ABORT.
  for (let y = -9; y <= 9; y++) {
    const w = Math.abs(y) > 5 ? 9 - (Math.abs(y) - 5) : 9
    rect(ctx, cx - w, cy + y, w * 2 + 1, 1, blink ? RAMPS.lava[3] : RAMPS.lava[2])
  }
  line(ctx, cx - 5, cy - 5, cx + 5, cy + 5, RAMPS.star[4])
  line(ctx, cx - 5, cy + 5, cx + 5, cy - 5, RAMPS.star[4])
}

const mod: GameModule<L> = {
  id: 'thruster-abort',
  category: 'reflex',
  title: 'Thruster Abort',
  howTo: 'Tap FIRE as soon as the green ▲ GO beacon lights. If the red ✕ ABORT beacon flashes, hold fire.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 200, 200)
    const { pc } = st
    const L = ctx.level
    ctx.fx.duck(true)
    const timer = new GameTimer()
    let i = 0
    let ssd = L.ssd0
    let phase: 'wait' | 'go' | 'fb' | 'done' = 'wait'
    let shownAbort = false
    let goAt = 0
    let flame = 0
    let fbText = ''
    let fbGood = true
    let goOk = 0
    let goN = 0
    let stopOk = 0
    let stopN = 0
    let early = 0
    const rts: number[] = []

    const next = () => {
      if (i >= L.trials.length) {
        phase = 'done'
        loop.stop()
        const correct = goOk + stopOk
        const mean = rts.length ? Math.round((rts.reduce((a, b) => a + b, 0) / rts.length) * 1000) : 0
        ctx.finish({
          score: correct / L.trials.length,
          correct,
          total: L.trials.length,
          answer: `Fired on ${goOk}/${goN} GO signals, held on ${stopOk}/${stopN} aborts.`,
          explanation: `Average reaction ${mean} ms. Your abort delay ended at ${Math.round(ssd * 1000)} ms: the later the abort comes, the harder it is to stop a reaction already on its way.${early ? ` ${early} early tap${early > 1 ? 's' : ''} before the signal.` : ''}`,
        })
        return
      }
      phase = 'wait'
      shownAbort = false
      timer.after(L.trials[i].wait, () => {
        phase = 'go'
        goAt = timer.now
        if (L.trials[i].stop) timer.after(ssd, () => {
          if (phase === 'go') {
            shownAbort = true
            ctx.fx.sfx('warning')
          }
        })
        timer.after(L.deadline + (L.trials[i].stop ? ssd : 0), () => {
          if (phase === 'go') resolve(false)
        })
      })
    }

    const resolve = (pressed: boolean) => {
      const t = L.trials[i]
      timer.clear()
      if (t.stop) {
        stopN++
        const ok = !pressed
        if (ok) stopOk++
        ssd = Math.max(0.05, Math.min(0.6, ssd + (ok ? 0.05 : -0.05)))
        fbGood = ok
        fbText = ok ? 'HELD' : 'ABORT MISSED'
      } else {
        goN++
        const ok = pressed
        if (ok) {
          goOk++
          rts.push(timer.now - goAt)
        }
        fbGood = ok
        fbText = ok ? Math.round((timer.now - goAt) * 1000) + ' MS' : 'TOO SLOW'
      }
      ctx.fx.sfx(fbGood ? 'tap' : 'wrong')
      if (!fbGood) ctx.fx.shake(2)
      phase = 'fb'
      st.hud.textContent = `${i + 1} / ${L.trials.length}`
      i++
      timer.after(0.45, next)
    }

    const fire = () => {
      if (phase === 'go') {
        flame = 1
        ctx.fx.haptic('tap')
        resolve(true)
      } else if (phase === 'wait') {
        early++
        fbText = 'WAIT'
      }
    }

    const fireBtn = button('FIRE', fire, 'big')
    fireBtn.setAttribute('aria-label', 'Fire thrusters')
    st.controls.append(fireBtn)
    pc.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      fire()
    })
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        fire()
      }
    }
    addEventListener('keydown', onKey)
    st.hud.textContent = `1 / ${L.trials.length}`

    const loop = new Loop((dt, t) => {
      timer.tick(dt)
      flame = Math.max(0, flame - dt * 3)
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const cx = Math.round(pc.w / 2)
      const cy = Math.round(pc.h * 0.62)
      ship(g, cx, cy, flame)
      const by = Math.round(pc.h * 0.22)
      // Beacon pad.
      rect(g, cx - 14, by - 12, 29, 25, RAMPS.void[2])
      if (phase === 'go' && !shownAbort) goBeacon(g, cx, by)
      if (phase === 'go' && shownAbort) abortBeacon(g, cx, by, Math.floor(t * 12) % 2 === 0)
      if (phase === 'wait') rect(g, cx - 1, by - 1, 3, 3, RAMPS.star[0])
      if (phase === 'fb' || (phase === 'wait' && fbText === 'WAIT')) drawText(g, fbText, cx, by + 18, fbGood ? C.good : C.bad, 1, 'center')
    })
    next()
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

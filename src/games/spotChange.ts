// Spot the Change: change detection. A field of objects shows for a few seconds,
// blanks out, and comes back with exactly one thing different. Tap it.
import { disc, halo, polygon, ring, roundRect } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { Loop, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

interface Obj {
  x: number
  y: number
  shape: number
  col: number
}
type Change = { kind: 'colour'; idx: number; to: number } | { kind: 'shape'; idx: number; to: number } | { kind: 'move'; idx: number; x: number; y: number } | { kind: 'add'; obj: Obj }
interface Scene {
  objs: Obj[]
  change: Change
}
interface L {
  scenes: Scene[]
  look: number
}

const COUNT = 8
const COLS = [RAMPS.cyan[1], RAMPS.amber[4], RAMPS.magenta[4], RAMPS.green[3], RAMPS.violet[4]]
const SHAPES = 4
const MIN_GAP = 0.13

function far(objs: { x: number; y: number }[], x: number, y: number, skip = -1): boolean {
  return objs.every((o, i) => i === skip || Math.hypot(o.x - x, o.y - y) >= MIN_GAP)
}

function spot(rng: RNG, objs: { x: number; y: number }[], skip = -1): { x: number; y: number } | null {
  for (let k = 0; k < 60; k++) {
    const x = rng.range(0.08, 0.92)
    const y = rng.range(0.08, 0.92)
    if (far(objs, x, y, skip)) return { x, y }
  }
  return null
}

function generate(rng: RNG, d: number): L {
  const scenes: Scene[] = []
  for (let s = 0; s < COUNT; s++) {
    const k = Math.round(6 + d * 6 + (s / (COUNT - 1)) * 3)
    const objs: Obj[] = []
    for (let i = 0; i < k; i++) {
      const p = spot(rng, objs)
      if (!p) break
      objs.push({ ...p, shape: rng.int(0, SHAPES - 1), col: rng.int(0, COLS.length - 1) })
    }
    const kind = rng.pick(['colour', 'shape', 'move', 'add'] as const)
    const idx = rng.int(0, objs.length - 1)
    let change: Change
    if (kind === 'colour') change = { kind, idx, to: (objs[idx].col + rng.int(1, COLS.length - 1)) % COLS.length }
    else if (kind === 'shape') change = { kind, idx, to: (objs[idx].shape + rng.int(1, SHAPES - 1)) % SHAPES }
    else if (kind === 'move') {
      const p = spot(rng, objs, idx) ?? { x: objs[idx].x, y: objs[idx].y }
      change = { kind, idx, x: p.x, y: p.y }
    } else {
      const p = spot(rng, objs) ?? { x: -1, y: -1 }
      change = { kind, obj: { ...p, shape: rng.int(0, SHAPES - 1), col: rng.int(0, COLS.length - 1) } }
    }
    scenes.push({ objs, change })
  }
  return { scenes, look: Math.round((3.2 - d * 1.4) * 10) / 10 }
}

/** The scene after the change, and the index of the changed object in it. */
export function after(s: Scene): { objs: Obj[]; target: number } {
  const objs = s.objs.map((o) => ({ ...o }))
  const c = s.change
  if (c.kind === 'add') {
    objs.push({ ...c.obj })
    return { objs, target: objs.length - 1 }
  }
  if (c.kind === 'colour') objs[c.idx].col = c.to
  if (c.kind === 'shape') objs[c.idx].shape = c.to
  if (c.kind === 'move') objs[c.idx] = { ...objs[c.idx], x: c.x, y: c.y }
  return { objs, target: c.idx }
}

function verify(l: L): boolean {
  return (
    l.scenes.length === COUNT &&
    l.scenes.every((s) => {
      if (s.objs.length < 6) return false
      const c = s.change
      if (c.kind === 'add') return c.obj.x >= 0 && far(s.objs, c.obj.x, c.obj.y)
      const o = s.objs[c.idx]
      if (c.kind === 'colour') return c.to !== o.col
      if (c.kind === 'shape') return c.to !== o.shape
      return Math.hypot(c.x - o.x, c.y - o.y) >= MIN_GAP && far(s.objs, c.x, c.y, c.idx)
    })
  )
}

function drawObj(g: CanvasRenderingContext2D, o: Obj, x: number, y: number, r: number): void {
  const col = COLS[o.col]
  if (o.shape === 0) disc(g, x, y, r, col)
  else if (o.shape === 1) polygon(g, [[x, y - r * 1.1], [x + r, y + r * 0.8], [x - r, y + r * 0.8]], col)
  else if (o.shape === 2) roundRect(g, x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7, 2, col)
  else ring(g, x, y, r * 0.8, col, false, r * 0.4)
}

const NAMES = ['circle', 'triangle', 'square', 'ring']
const COLNAMES = ['cyan', 'amber', 'pink', 'green', 'violet']

const mod: GameModule<L> = {
  id: 'spot-change',
  category: 'memory',
  title: 'Spot the Change',
  rules: {
    goal: 'Tap the one object that changed.',
    steps: [
      'A field of shapes shows for a few seconds. Take it in.',
      'It blanks for a moment, then comes back with exactly one change.',
      'The change is a new colour, a new shape, a moved object, or one extra object.',
      'Tap the changed object. 8 scenes, each a little busier.',
    ],
  },
  howTo: 'Study the field. After the blank, one object has changed colour, shape, place, or is new. Tap it.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 220, 220)
    const { pc } = st
    const L = ctx.level
    let s = 0
    let t = 0
    let phase: 'look' | 'blank' | 'find' | 'fb' = 'look'
    let found = 0
    let fbOk = true
    const missed: string[] = []

    const box = () => {
      const pad = 16
      return { x0: pad, y0: pad + 10, w: pc.w - pad * 2, h: pc.h - pad * 2 - 10 }
    }
    const hud = () => (st.hud.textContent = `Scene ${s + 1} / ${COUNT} · ${phase === 'look' ? 'memorise' : phase === 'find' ? 'tap what changed' : phase === 'blank' ? 'wait' : 'result'}`)
    hud()

    const describe = (sc: Scene) => {
      const c = sc.change
      if (c.kind === 'add') return 'a new object appeared'
      const o = sc.objs[c.idx]
      if (c.kind === 'colour') return `${/^[aeiou]/.test(COLNAMES[o.col]) ? 'an' : 'a'} ${COLNAMES[o.col]} ${NAMES[o.shape]} turned ${COLNAMES[c.to]}`
      if (c.kind === 'shape') return `a ${NAMES[o.shape]} became a ${NAMES[c.to]}`
      return `a ${NAMES[o.shape]} moved`
    }

    pc.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      if (phase !== 'find') return
      const p = pc.toNative(e.clientX, e.clientY)
      const { x0, y0, w, h } = box()
      const { objs, target } = after(L.scenes[s])
      let best = -1
      let bd = Infinity
      objs.forEach((o, i) => {
        const dd = Math.hypot(x0 + o.x * w - p.x, y0 + o.y * h - p.y)
        if (dd < bd) {
          bd = dd
          best = i
        }
      })
      fbOk = best === target && bd < Math.min(w, h) * 0.12
      if (fbOk) found++
      else missed.push(describe(L.scenes[s]))
      ctx.fx.sfx(fbOk ? 'correct' : 'wrong')
      ctx.fx.haptic(fbOk ? 'correct' : 'wrong')
      phase = 'fb'
      t = 0
      hud()
    })

    const finish = () => {
      loop.stop()
      ctx.finish({
        score: found / COUNT,
        correct: found,
        total: COUNT,
        answer: `${found} of ${COUNT} changes spotted.`,
        explanation: `${missed.length ? `You missed: ${missed.slice(0, 3).join(', ')}. ` : ''}Without the blank, a change jumps out as motion. The blank hides that, so you can only spot it if you stored the object in memory. Most people hold about four objects at once, so pick a few and fix them.`,
      })
    }

    const loop = new Loop((dt) => {
      t += dt
      const go = (p: typeof phase) => {
        phase = p
        t = 0
        hud()
      }
      if (phase === 'look' && t >= L.look) go('blank')
      else if (phase === 'blank' && t >= 0.9) go('find')
      else if (phase === 'fb' && t >= (fbOk ? 0.8 : 1.6)) {
        s++
        if (s >= COUNT) return finish()
        phase = 'look'
        t = 0
        hud()
      }
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const { x0, y0, w, h } = box()
      const r = Math.max(5, Math.min(w, h) * 0.035)
      const sc = L.scenes[s]
      if (phase === 'look') {
        sc.objs.forEach((o) => drawObj(g, o, x0 + o.x * w, y0 + o.y * h, r))
        roundRect(g, x0, 4, w * Math.max(0, 1 - t / L.look), 4, 2, RAMPS.indigo[4])
      } else if (phase === 'blank') {
        drawText(g, '·  ·  ·', pc.w / 2, pc.h / 2 - 6, RAMPS.star[0], 1.6, 'center')
      } else {
        const { objs, target } = after(sc)
        objs.forEach((o) => drawObj(g, o, x0 + o.x * w, y0 + o.y * h, r))
        if (phase === 'fb') {
          const o = objs[target]
          halo(g, x0 + o.x * w, y0 + o.y * h, r * 1.6, r * 1.4, fbOk ? C.good : C.bad)
          ring(g, x0 + o.x * w, y0 + o.y * h, r * 2, fbOk ? C.good : C.bad, false, 2)
          const c = sc.change
          if (c.kind === 'move') {
            const was = sc.objs[c.idx]
            ring(g, x0 + was.x * w, y0 + was.y * h, r * 1.4, RAMPS.star[1], true, 1.2)
          }
          drawText(g, describe(sc).toUpperCase(), pc.w / 2, pc.h - 14, fbOk ? C.good : C.bad, 1.1, 'center')
        }
      }
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
  score: defaultScore('memory'),
}

export default mod

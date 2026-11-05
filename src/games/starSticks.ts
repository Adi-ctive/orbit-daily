// Star-Stick Equations: move exactly one stick to make the equation true.
// Generated from a true equation by one reverse move, then brute-forced to make
// sure exactly one fix exists.
import { halo, rect } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import type { RNG } from '../lib/rng'
import { button, Loop, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

// Segments: a top, b top-right, c bottom-right, d bottom, e bottom-left, f top-left, g middle.
export const DIGIT: number[] = [0b0111111, 0b0000110, 0b1011011, 0b1001111, 0b1100110, 0b1101101, 0b1111101, 0b0000111, 0b1111111, 0b1101111]
const MASK_TO_DIGIT = new Map(DIGIT.map((m, d) => [m, d]))

/** A configuration: digits of A, the op (bit 0 = horizontal, bit 1 = vertical), digits of B, digits of C. */
export interface Eq {
  a: number[]
  op: number
  b: number[]
  c: number[]
}

const toNum = (ms: number[]): number | null => {
  let v = 0
  for (const m of ms) {
    const d = MASK_TO_DIGIT.get(m)
    if (d === undefined) return null
    v = v * 10 + d
  }
  return v
}

export function isTrue(e: Eq): boolean {
  const a = toNum(e.a)
  const b = toNum(e.b)
  const c = toNum(e.c)
  if (a === null || b === null || c === null) return false
  if (e.op === 0b11) return a + b === c
  if (e.op === 0b01) return a - b === c
  return false
}

export function eqText(e: Eq): string {
  const s = (ms: number[]) => ms.map((m) => MASK_TO_DIGIT.get(m) ?? '?').join('')
  return `${s(e.a)} ${e.op === 0b11 ? '+' : e.op === 0b01 ? '−' : '?'} ${s(e.b)} = ${s(e.c)}`
}

/** Flatten to slots: [group, index, bit]. group 0 = a, 1 = op, 2 = b, 3 = c. */
type Slot = [number, number, number]
function slots(e: Eq): Slot[] {
  const out: Slot[] = []
  const dig = (g: number, arr: number[]) => arr.forEach((_, i) => {
    for (let s = 0; s < 7; s++) out.push([g, i, s])
  })
  dig(0, e.a)
  out.push([1, 0, 1]) // only the vertical stick of the operator can move
  dig(2, e.b)
  dig(3, e.c)
  return out
}
const groups = (e: Eq) => [e.a, [e.op], e.b, e.c]
const has = (e: Eq, [g, i, s]: Slot) => !!(groups(e)[g][i] & (1 << s))
function flip(e: Eq, [g, i, s]: Slot): Eq {
  const n: Eq = { a: [...e.a], op: e.op, b: [...e.b], c: [...e.c] }
  if (g === 1) n.op ^= 1 << s
  else [n.a, null, n.b, n.c][g]![i] ^= 1 << s
  return n
}

export function oneMoveResults(e: Eq): { eq: Eq; from: Slot; to: Slot }[] {
  const sl = slots(e)
  const out: { eq: Eq; from: Slot; to: Slot }[] = []
  for (const from of sl) {
    if (!has(e, from)) continue
    for (const to of sl) {
      if (to === from || has(e, to)) continue
      out.push({ eq: flip(flip(e, from), to), from, to })
    }
  }
  return out
}

interface L {
  eq: Eq
  fix: string
}

const digits = (n: number) => String(n).split('').map((ch) => DIGIT[Number(ch)])

function generate(rng: RNG, d: number): L {
  const max = d > 0.3 ? 49 : 19
  for (let g = 0; g < 200; g++) {
    const plus = rng.bool()
    const a = rng.int(0, max)
    const b = rng.int(0, max)
    const c = plus ? a + b : a - b
    if (c < 0 || c > 99) continue
    const truth: Eq = { a: digits(a), op: plus ? 0b11 : 0b01, b: digits(b), c: digits(c) }
    const breaks = oneMoveResults(truth).filter((r) => !isTrue(r.eq) && valid(r.eq))
    if (!breaks.length) continue
    const broken = rng.pick(breaks).eq
    const fixes = new Set(oneMoveResults(broken).filter((r) => isTrue(r.eq)).map((r) => eqText(r.eq)))
    if (fixes.size === 1) return { eq: broken, fix: [...fixes][0] }
  }
  return { eq: { a: [DIGIT[1]], op: 0b11, b: [DIGIT[1]], c: [DIGIT[3]] }, fix: '' }
}

function valid(e: Eq): boolean {
  return [...e.a, ...e.b, ...e.c].every((m) => MASK_TO_DIGIT.has(m)) && (e.op === 0b11 || e.op === 0b01)
}

function verify(l: L): boolean {
  if (!valid(l.eq) || isTrue(l.eq)) return false
  const fixes = new Set(oneMoveResults(l.eq).filter((r) => isTrue(r.eq)).map((r) => eqText(r.eq)))
  return fixes.size === 1 && fixes.has(l.fix)
}

const mod: GameModule<L> = {
  id: 'star-sticks',
  category: 'riddle',
  title: 'Star-Stick Equations',
  rules: {
    goal: "Fix the equation by moving one stick.",
    steps: ["The equation shown is false.","Tap one glowing stick to pick it up.","Tap an empty dashed slot to put it down.","The result must be a true equation. 3 tries."],
  },
  howTo: 'The equation is wrong. Move exactly one glowing stick to make it true. Tap a stick to lift it, then tap an empty slot.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 200, 90)
    const { pc } = st
    const L = ctx.level
    let eq = L.eq
    let held: Slot | null = null
    let tries = 0
    let done = false
    let flashBad = 0

    // Layout: each digit is a 7-segment cell; op and '=' are cells too.
    const layout = () => {
      const cells = eq.a.length + 1 + eq.b.length + 1 + eq.c.length
      const cw = Math.min(36, Math.floor((pc.w - 8) / cells))
      const ch = Math.round(cw * 1.7)
      const ox = Math.floor((pc.w - cw * cells) / 2)
      const oy = Math.floor((pc.h - ch) / 2)
      return { cw, ch, ox, oy }
    }

    type Seg = { slot: Slot; x: number; y: number; w: number; h: number }
    const segs = (): Seg[] => {
      const { cw, ch, ox, oy } = layout()
      const t = Math.max(2, Math.round(cw / 7))
      const out: Seg[] = []
      let col = 0
      const digitSegs = (g: number, arr: number[]) =>
        arr.forEach((_, i) => {
          const x = ox + col * cw + t
          const w = cw - t * 3
          const y = oy
          const hh = Math.floor((ch - t) / 2)
          const rects = [
            [x + t, y, w - t, t],
            [x + w, y + t, t, hh - t],
            [x + w, y + hh + t, t, hh - t],
            [x + t, y + 2 * hh, w - t, t],
            [x, y + hh + t, t, hh - t],
            [x, y + t, t, hh - t],
            [x + t, y + hh, w - t, t],
          ]
          rects.forEach((r, s) => out.push({ slot: [g, i, s], x: r[0], y: r[1], w: r[2], h: r[3] }))
          col++
        })
      digitSegs(0, eq.a)
      const opx = ox + col * cw + Math.floor(cw / 2)
      const my = oy + Math.floor(ch / 2)
      out.push({ slot: [1, 0, 0], x: opx - Math.floor(cw / 3), y: my - 1, w: Math.floor((cw * 2) / 3), h: t })
      out.push({ slot: [1, 0, 1], x: opx - 1, y: my - Math.floor(cw / 3), w: t, h: Math.floor((cw * 2) / 3) })
      col++
      digitSegs(2, eq.b)
      col++
      digitSegs(3, eq.c)
      return out
    }
    const eqX = () => {
      const { cw, ox } = layout()
      return ox + (eq.a.length + 1 + eq.b.length) * cw + Math.floor(cw / 2)
    }

    const same = (a: Slot | null, b: Slot) => !!a && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]

    pc.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      if (done) return
      const p = pc.toNative(e.clientX, e.clientY)
      let best: Seg | null = null
      let bd = 7
      for (const s of segs()) {
        if (s.slot[0] === 1 && s.slot[2] === 0) continue // horizontal op stick stays put
        const dx = Math.max(s.x - p.x, 0, p.x - (s.x + s.w))
        const dy = Math.max(s.y - p.y, 0, p.y - (s.y + s.h))
        const d = Math.hypot(dx, dy)
        if (d < bd) {
          bd = d
          best = s
        }
      }
      if (!best) return
      const lit = has(eq, best.slot)
      if (!held) {
        if (!lit) return
        held = best.slot
        ctx.fx.sfx('flip')
        ctx.fx.haptic('tap')
        return
      }
      if (same(held, best.slot)) {
        held = null
        return
      }
      if (lit) {
        held = best.slot
        return
      }
      const next = flip(flip(eq, held), best.slot)
      held = null
      tries++
      if (isTrue(next)) {
        eq = next
        done = true
        ctx.fx.sfx('levelup')
        ctx.fx.haptic('combo')
        setTimeout(() => {
          loop.stop()
          ctx.finish({ score: tries === 1 ? 1 : tries === 2 ? 0.7 : 0.4, correct: 1, total: 1, answer: `Fixed: ${eqText(eq)}`, explanation: `It took ${tries} attempt${tries > 1 ? 's' : ''}. Only one single-stick move makes this equation true; a solver tried every possible move to be sure.` })
        }, 900)
      } else {
        eq = next
        flashBad = 0.8
        ctx.fx.sfx('wrong')
        ctx.fx.haptic('wrong')
        st.hud.textContent = `${eqText(next)} is not true · attempt ${tries}`
        setTimeout(() => {
          eq = L.eq
        }, 800)
        if (tries >= 3) {
          done = true
          setTimeout(() => {
            loop.stop()
            ctx.finish({ score: 0, correct: 0, total: 1, answer: `The fix: ${L.fix}`, explanation: 'Look for digits one stick away from another digit (like 6 and 5, 9 and 3, 0 and 8), and remember the + can lose its upright stick to become a −.' })
          }, 900)
        }
      }
    })
    st.controls.append(
      button('Reset', () => {
        if (done) return
        eq = L.eq
        held = null
      }),
    )
    st.hud.textContent = 'Move one stick'

    const loop = new Loop((dt, t) => {
      flashBad = Math.max(0, flashBad - dt)
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const { cw, ch, oy } = layout()
      for (const s of segs()) {
        const on = has(eq, s.slot)
        const isHeld = same(held, s.slot)
        if (on) {
          const col = isHeld ? (Math.floor(t * 6) % 2 ? RAMPS.amber[5] : RAMPS.amber[3]) : done ? C.good : flashBad > 0 ? C.bad : RAMPS.cyan[1]
          if (!isHeld) halo(g, s.x + s.w / 2, s.y + s.h / 2, 1, 2, RAMPS.teal[2])
          rect(g, s.x, s.y, s.w, s.h, col)
          // A star tip at one end.
          rect(g, s.x, s.y, Math.min(2, s.w), Math.min(2, s.h), RAMPS.star[4])
        } else if (held) {
          g.strokeStyle = RAMPS.indigo[3]
          g.lineWidth = 0.6
          g.setLineDash([1.5, 1.5])
          g.strokeRect(s.x + 0.3, s.y + 0.3, s.w - 0.6, s.h - 0.6)
          g.setLineDash([])
        }
      }
      // Fixed '=' sign.
      const ex = eqX()
      const my = oy + Math.floor(ch / 2)
      const w = Math.floor((cw * 2) / 3)
      const th = Math.max(2, Math.round(cw / 7))
      rect(g, ex - Math.floor(w / 2), my - th - 1, w, th, RAMPS.star[2])
      rect(g, ex - Math.floor(w / 2), my + 2, w, th, RAMPS.star[2])
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
  score: defaultScore('riddle'),
}

export default mod

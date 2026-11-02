// Fuel Mix: the 24 game. Combine four numbers with + − × ÷ to make 24.
// Every set is checked by a brute-force solver before it ships.
import type { RNG } from '../lib/rng'
import { button, el, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

type Frac = [number, number]
interface L {
  sets: number[][]
  target: number
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
const norm = ([n, d]: Frac): Frac => {
  if (d < 0) {
    n = -n
    d = -d
  }
  const g = gcd(n, d) || 1
  return [n / g, d / g]
}
const OPS: { s: string; f: (a: Frac, b: Frac) => Frac | null }[] = [
  { s: '+', f: (a, b) => norm([a[0] * b[1] + b[0] * a[1], a[1] * b[1]]) },
  { s: '−', f: (a, b) => norm([a[0] * b[1] - b[0] * a[1], a[1] * b[1]]) },
  { s: '×', f: (a, b) => norm([a[0] * b[0], a[1] * b[1]]) },
  { s: '÷', f: (a, b) => (b[0] === 0 ? null : norm([a[0] * b[1], a[1] * b[0]])) },
]

/**
 * Counts solution paths with plain numerator/denominator arrays and no
 * allocation per branch. Used by the generator, where speed matters.
 */
export function count24(nums: number[], target = 24): number {
  const n = new Float64Array(nums)
  const d = new Float64Array(nums.length).fill(1)
  const rec = (len: number): number => {
    if (len === 1) return n[0] === target * d[0] && d[0] !== 0 ? 1 : 0
    let c = 0
    for (let i = 0; i < len; i++)
      for (let j = 0; j < len; j++) {
        if (i === j) continue
        const an = n[i]
        const ad = d[i]
        const bn = n[j]
        const bd = d[j]
        // Move the last item into slot j, put the result in slot i, recurse on len - 1.
        const lo = Math.min(i, j)
        const hi = Math.max(i, j)
        const ln = n[len - 1]
        const ld = d[len - 1]
        for (let op = 0; op < 4; op++) {
          if ((op === 0 || op === 2) && j < i) continue
          let rn: number
          let rd: number
          if (op === 0) {
            rn = an * bd + bn * ad
            rd = ad * bd
          } else if (op === 1) {
            rn = an * bd - bn * ad
            rd = ad * bd
          } else if (op === 2) {
            rn = an * bn
            rd = ad * bd
          } else {
            if (bn === 0) continue
            rn = an * bd
            rd = ad * bn
          }
          n[lo] = rn
          d[lo] = rd
          n[hi] = ln
          d[hi] = ld
          c += rec(len - 1)
          n[i] = an
          d[i] = ad
          n[j] = bn
          d[j] = bd
          n[len - 1] = ln
          d[len - 1] = ld
        }
      }
    return c
  }
  return rec(nums.length)
}

/** Returns the number of solution paths and one expression. */
export function solve24(nums: number[], target = 24): { count: number; expr: string | null } {
  const count = count24(nums, target)
  if (!count) return { count, expr: null }
  let expr: string | null = null
  const rec = (vals: Frac[], exprs: string[]) => {
    if (expr) return
    if (vals.length === 1) {
      if (vals[0][0] === target * vals[0][1]) expr = exprs[0]
      return
    }
    for (let i = 0; i < vals.length; i++)
      for (let j = 0; j < vals.length; j++) {
        if (i === j) continue
        const rest = vals.filter((_, k) => k !== i && k !== j)
        const restE = exprs.filter((_, k) => k !== i && k !== j)
        for (const op of OPS) {
          // + and × are commutative; skip the mirrored pair.
          if ((op.s === '+' || op.s === '×') && j < i) continue
          const r = op.f(vals[i], vals[j])
          if (!r) continue
          rec([...rest, r], [...restE, `(${exprs[i]} ${op.s} ${exprs[j]})`])
        }
      }
  }
  rec(
    nums.map((n) => [n, 1] as Frac),
    nums.map(String),
  )
  return { count, expr: expr ? (expr as string).slice(1, -1) : null }
}

function generate(rng: RNG, d: number): L {
  const sets: number[][] = []
  const max = d > 0.6 ? 13 : 9
  // Fewer solution paths = harder.
  const band = d < 0.3 ? [20, 999] : d < 0.65 ? [6, 40] : [1, 12]
  let guard = 0
  while (sets.length < 3 && guard++ < 400) {
    const s = [rng.int(1, max), rng.int(1, max), rng.int(1, max), rng.int(1, max)].sort((a, b) => a - b)
    if (sets.some((o) => o.join() === s.join())) continue
    const count = count24(s)
    if (count >= band[0] && count <= band[1]) sets.push(s)
  }
  return { sets, target: 24 }
}

function verify(l: L): boolean {
  return l.sets.length === 3 && l.sets.every((s) => s.length === 4 && count24(s, l.target) > 0)
}

const fmt = ([n, d]: Frac) => (d === 1 ? String(n) : `${n}/${d}`)

const mod: GameModule<L> = {
  id: 'fuel-mix',
  category: 'math',
  title: 'Fuel Mix',
  howTo: 'Mix all four fuel cells to make exactly 24. Tap a number, an operator, then another number. Every set can be solved.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 40, 40)
    st.canvasBox.remove()
    const L = ctx.level
    let si = 0
    let solved = 0
    const solutions: string[] = []
    let tiles: { v: Frac; label: string }[] = []
    let hist: (typeof tiles)[] = []
    let sel: number | null = null
    let op: number | null = null

    const board = el('div', { class: 'fm-board' })
    const ops = el('div', { class: 'g-controls' })
    const tools = el('div', { class: 'g-controls' })
    st.root.insertBefore(board, st.controls)
    st.controls.append(ops, tools)

    const opBtns = OPS.map((o, k) => {
      const b = button(o.s, () => {
        if (sel === null) return
        op = k
        ctx.fx.sfx('tap')
        render()
      })
      b.setAttribute('aria-label', ['plus', 'minus', 'times', 'divide'][k])
      ops.append(b)
      return b
    })
    tools.append(
      button('Undo', () => {
        const h = hist.pop()
        if (h) tiles = h
        sel = op = null
        render()
      }),
      button('Reset', () => {
        load()
      }),
      button('Skip', () => {
        solutions.push(`${L.sets[si].join(', ')}: ${solve24(L.sets[si]).expr} = 24`)
        nextSet()
      }),
    )

    const load = () => {
      tiles = L.sets[si].map((n) => ({ v: [n, 1] as Frac, label: String(n) }))
      hist = []
      sel = op = null
      st.hud.textContent = `Make ${L.target} · set ${si + 1} / ${L.sets.length}`
      render()
    }

    const nextSet = () => {
      si++
      if (si >= L.sets.length) {
        ctx.finish({
          score: solved / L.sets.length,
          correct: solved,
          total: L.sets.length,
          answer: `Mixed ${solved} of ${L.sets.length} fuel sets.`,
          explanation: solutions.join(' · '),
        })
        return
      }
      load()
    }

    const pick = (i: number) => {
      ctx.fx.sfx('tap')
      ctx.fx.haptic('tap')
      if (sel === null || op === null) {
        sel = sel === i ? null : i
        op = null
        render()
        return
      }
      if (i === sel) return
      const r = OPS[op].f(tiles[sel].v, tiles[i].v)
      if (!r) {
        ctx.fx.sfx('wrong')
        return
      }
      hist.push(tiles.map((t) => ({ ...t })))
      const label = `(${tiles[sel].label} ${OPS[op].s} ${tiles[i].label})`
      const nt = tiles.filter((_, k) => k !== sel && k !== i)
      nt.splice(Math.min(i, nt.length), 0, { v: r, label })
      tiles = nt
      sel = op = null
      if (tiles.length === 1) {
        if (tiles[0].v[0] === L.target * tiles[0].v[1]) {
          solved++
          ctx.fx.sfx('combo', solved)
          ctx.fx.haptic('combo')
          solutions.push(`${tiles[0].label.slice(1, -1)} = 24 ✓`)
          render()
          setTimeout(nextSet, 700)
          return
        }
        ctx.fx.sfx('wrong')
        ctx.fx.haptic('wrong')
        ctx.fx.shake(2)
      }
      render()
    }

    const render = () => {
      board.replaceChildren(
        ...tiles.map((t, i) => {
          const b = button(fmt(t.v), () => pick(i), 'fm-tile big' + (sel === i ? ' sel' : ''))
          b.setAttribute('aria-pressed', String(sel === i))
          return b
        }),
      )
      opBtns.forEach((b, k) => b.classList.toggle('sel', op === k))
      if (tiles.length === 1 && tiles[0].v[0] !== L.target * tiles[0].v[1]) board.append(el('p', { class: 'g-text', text: `That makes ${fmt(tiles[0].v)}. Undo or reset.` }))
    }
    load()
    return { destroy: () => st.destroy() }
  },
  score: defaultScore('math'),
}

export default mod

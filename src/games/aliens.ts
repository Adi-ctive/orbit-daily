// Truthful & Lying Aliens: Knights and Knaves. Truth-tellers only say true
// things; liars only say false things. A solver checks there is exactly one answer.
import { ball } from '../art/draw'
import { RAMPS } from '../art/palette'
import type { RNG } from '../lib/rng'
import { button, el, makeStage, dInt } from './kit'
import { defaultScore, type GameModule } from './types'

export type Stmt =
  | { k: 'is'; s: number; t: number; truthful: boolean }
  | { k: 'same'; s: number; a: number; b: number }
  | { k: 'diff'; s: number; a: number; b: number }
  | { k: 'someLiar'; s: number }
  | { k: 'count'; s: number; n: number }

interface L {
  names: string[]
  stmts: Stmt[]
  solution: boolean[]
}

const NAMES = ['Zib', 'Quor', 'Vex', 'Ylla', 'Murk', 'Talo', 'Pism', 'Orra', 'Kevv', 'Nim']

export function evalStmt(st: Stmt, a: boolean[]): boolean {
  switch (st.k) {
    case 'is':
      return a[st.t] === st.truthful
    case 'same':
      return a[st.a] === a[st.b]
    case 'diff':
      return a[st.a] !== a[st.b]
    case 'someLiar':
      return a.some((x) => !x)
    case 'count':
      return a.filter((x) => x).length === st.n
  }
}

export function solutions(n: number, stmts: Stmt[]): boolean[][] {
  const out: boolean[][] = []
  for (let mask = 0; mask < 1 << n; mask++) {
    const a = Array.from({ length: n }, (_, i) => !!(mask & (1 << i)))
    if (stmts.every((s) => evalStmt(s, a) === a[s.s])) out.push(a)
  }
  return out
}

export function stmtText(st: Stmt, names: string[]): string {
  const N = (i: number) => (i === st.s ? 'I' : names[i])
  switch (st.k) {
    case 'is':
      return `“${names[st.t]} is a ${st.truthful ? 'truth-teller' : 'liar'}.”`
    case 'same':
      return st.a === st.s || st.b === st.s
        ? `“${names[st.a === st.s ? st.b : st.a]} and I are the same kind.”`
        : `“${N(st.a)} and ${N(st.b)} are the same kind.”`
    case 'diff':
      return st.a === st.s || st.b === st.s
        ? `“${names[st.a === st.s ? st.b : st.a]} and I are different kinds.”`
        : `“${N(st.a)} and ${N(st.b)} are different kinds.”`
    case 'someLiar':
      return '“At least one of us is a liar.”'
    case 'count':
      return `“Exactly ${st.n} of us ${st.n === 1 ? 'is a truth-teller' : 'are truth-tellers'}.”`
  }
}

function randomStmt(rng: RNG, s: number, n: number): Stmt {
  const others = Array.from({ length: n }, (_, i) => i).filter((i) => i !== s)
  const kind = rng.weighted([5, 3, 3, 1, n > 2 ? 2 : 0])
  if (kind === 0) return { k: 'is', s, t: rng.pick(others), truthful: rng.bool() }
  if (kind === 1 || kind === 2) {
    const pair = n > 2 && rng.bool(0.5) ? rng.shuffle(others).slice(0, 2) : [s, rng.pick(others)]
    return kind === 1 ? { k: 'same', s, a: pair[0], b: pair[1] } : { k: 'diff', s, a: pair[0], b: pair[1] }
  }
  if (kind === 3) return { k: 'someLiar', s }
  return { k: 'count', s, n: rng.int(0, n) }
}

function generate(rng: RNG, d: number): L {
  const n = dInt(d, 2, 4)
  const names = rng.shuffle(NAMES).slice(0, n)
  const solution = Array.from({ length: n }, () => rng.bool())
  const stmts: Stmt[] = []
  const said = new Array(n).fill(0)
  const add = (s: number) => {
    for (let g = 0; g < 40; g++) {
      const st = randomStmt(rng, s, n)
      // A statement must match its speaker's nature under the hidden solution.
      if (evalStmt(st, solution) === solution[s] && !stmts.some((o) => JSON.stringify(o) === JSON.stringify(st))) {
        stmts.push(st)
        said[s]++
        return
      }
    }
  }
  for (let s = 0; s < n; s++) add(s)
  for (let g = 0; g < 8 && solutions(n, stmts).length > 1; g++) {
    const open = Array.from({ length: n }, (_, i) => i).filter((i) => said[i] < 2)
    if (!open.length) break
    add(rng.pick(open))
  }
  return { names, stmts, solution }
}

function verify(l: L): boolean {
  const sols = solutions(l.names.length, l.stmts)
  return sols.length === 1 && sols[0].every((v, i) => v === l.solution[i]) && l.stmts.length <= l.names.length * 2
}

function portrait(i: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 24
  c.height = 24
  c.className = 'pixel-canvas ka-face'
  const g = c.getContext('2d')!
  const ramps = [RAMPS.green, RAMPS.magenta, RAMPS.cyan, RAMPS.amber, RAMPS.violet]
  const r = ramps[i % ramps.length]
  ball(g, 12, 13, 9, r[0], r[1], r[2], r[r.length - 1])
  g.fillStyle = RAMPS.void[1]
  g.fillRect(8, 11, 3, 3)
  g.fillRect(14, 11, 3, 3)
  g.fillStyle = RAMPS.star[4]
  g.fillRect(8, 11, 1, 1)
  g.fillRect(14, 11, 1, 1)
  g.fillStyle = r[1]
  g.fillRect(11, 1, 2, 4)
  g.fillRect(10, 1, 4, 1)
  return c
}

const mod: GameModule<L> = {
  id: 'aliens',
  category: 'logic',
  title: 'Truthful & Lying Aliens',
  howTo: 'Each alien either always tells the truth or always lies. Work out which is which. There is exactly one answer.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 40, 40)
    st.canvasBox.remove()
    const L = ctx.level
    const n = L.names.length
    const guess: (boolean | null)[] = new Array(n).fill(null)
    const list = el('div', { class: 'ka-list' })
    st.root.insertBefore(list, st.controls)
    st.hud.textContent = `${n} aliens · find the liars`
    const submit = button('Submit', () => check(), 'big')
    submit.disabled = true
    st.controls.append(submit)

    const rows = L.names.map((name, i) => {
      const toggle = button('?', () => {
        guess[i] = guess[i] === null ? true : guess[i] ? false : null
        toggle.textContent = guess[i] === null ? '?' : guess[i] ? '○ Truthful' : '✕ Liar'
        toggle.classList.toggle('ok', guess[i] === true)
        toggle.classList.toggle('no', guess[i] === false)
        toggle.setAttribute('aria-label', `${name}: ${guess[i] === null ? 'undecided' : guess[i] ? 'truth-teller' : 'liar'}`)
        submit.disabled = guess.some((g) => g === null)
        ctx.fx.sfx('tap')
      })
      toggle.setAttribute('aria-label', `${name}: undecided`)
      const says = L.stmts.filter((s) => s.s === i).map((s) => el('p', { class: 'ka-say', text: stmtText(s, L.names) }))
      const row = el('div', { class: 'ka-row panel' }, portrait(i), el('div', { class: 'ka-text' }, el('p', { class: 'label', text: name }), ...says), toggle)
      list.append(row)
      return toggle
    })

    const check = () => {
      rows.forEach((b) => (b.disabled = true))
      submit.disabled = true
      const right = guess.filter((g, i) => g === L.solution[i]).length
      const reasons = L.stmts.map((s) => {
        const truth = evalStmt(s, L.solution)
        return `${L.names[s.s]} says ${stmtText(s, L.names)} That is ${truth ? 'true' : 'false'}, so ${L.names[s.s]} is a ${L.solution[s.s] ? 'truth-teller' : 'liar'}.`
      })
      ctx.finish({
        score: right === n ? 1 : right / n / 2,
        correct: right,
        total: n,
        answer: L.names.map((nm, i) => `${nm}: ${L.solution[i] ? 'truth-teller' : 'liar'}`).join(', '),
        explanation: reasons.join(' ') + ' No other assignment fits every statement.',
      })
    }
    return { destroy: () => st.destroy() }
  },
  score: defaultScore('logic'),
}

export default mod

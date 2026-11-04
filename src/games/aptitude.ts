// Aptitude Sprint: six timed quantitative questions, each drawn as a picture
// (charts, series, trains, workers, price tags, jars). Generated in code, so the
// supply never runs out, and every answer is recomputed by verify().
import { ball, disc, line, polygon, roundRect } from '../art/draw'
import { RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { button, el, Loop, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

type Kind = 'bars' | 'pie' | 'series' | 'trains' | 'work' | 'price' | 'balls'

interface Q {
  kind: Kind
  /** Numbers the picture and the answer are built from. */
  p: Record<string, number | number[] | string[]>
  text: string
  choices: string[]
  answer: number
  why: string
}
interface L {
  qs: Q[]
  limit: number
}

const fmt = (n: number) => n.toLocaleString('en-IN')
/** Minutes as "45 min" or "1 h 30 min". */
const hm = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return h ? `${h} h ${m} min` : `${m} min`
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
const frac = (n: number, d: number) => {
  const g = gcd(n, d) || 1
  return `${n / g}/${d / g}`
}

/** Shuffle the answer in with distinct distractors. */
function choices(rng: RNG, answer: string, wrong: string[]): { choices: string[]; answer: number } {
  const pool = [...new Set(wrong.filter((w) => w !== answer))].slice(0, 3)
  const all = rng.shuffle([answer, ...pool])
  return { choices: all, answer: all.indexOf(answer) }
}

// ---- Expected answers, recomputed from the stored numbers (used by verify).
const SOLVE: Record<Kind, (p: Q['p']) => string> = {
  bars: (p) => {
    const v = p.v as number[]
    const [i, j] = p.ij as number[]
    return p.mode === 0 ? `${Math.round(((v[j] - v[i]) / v[i]) * 100)}%` : fmt(v.reduce((a, b) => a + b, 0) / v.length)
  },
  pie: (p) => {
    const s = p.s as number[]
    const [i, j] = p.ij as number[]
    const T = p.T as number
    return '₹' + fmt(p.mode === 0 ? (T * s[i]) / 100 : (T * (s[i] - s[j])) / 100)
  },
  series: (p) => fmt((p.t as number[])[(p.t as number[]).length - 1]),
  trains: (p) => {
    const mins = ((p.D as number) / ((p.v1 as number) + (p.v2 as number))) * 60
    return hm(mins)
  },
  work: (p) => {
    const a = p.a as number
    const b = p.b as number
    return `${(a * b) / (a + b)} days`
  },
  price: (p) => {
    const f = (1 + (p.m as number) / 100) * (1 - (p.k as number) / 100)
    const pct = Math.round((f - 1) * 100)
    return pct === 0 ? 'No profit, no loss' : pct > 0 ? `${pct}% profit` : `${-pct}% loss`
  },
  balls: (p) => {
    const r = p.r as number
    const n = (p.r as number) + (p.b as number)
    return frac(r * (r - 1), n * (n - 1))
  },
}

const CATS = [
  ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  ['Pune', 'Agra', 'Kochi', 'Surat', 'Ranchi'],
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
]

function genBars(rng: RNG, d: number): Q {
  const labels = rng.pick(CATS)
  const step = d > 0.5 ? 5 : 10
  const v = Array.from({ length: 5 }, () => rng.int(4, 40) * step)
  const mode = rng.int(0, 1)
  let i = 0
  let j = 0
  if (mode === 0) {
    i = rng.int(0, 3)
    j = rng.int(i + 1, 4)
    const pct = rng.pick([10, 20, 25, 40, 50, 60, 75, 80, 125, 150])
    v[i] = rng.int(2, 8) * 20
    v[j] = (v[i] * (100 + pct)) / 100
  } else {
    // Make the total divisible by 5 so the average is a whole number.
    v[4] += (5 - (v.reduce((a, b) => a + b, 0) % 5)) % 5
  }
  const p = { v, ij: [i, j], mode, labels }
  const ans = SOLVE.bars(p)
  const n = parseFloat(ans.replace(/,/g, ''))
  const text = mode === 0 ? `By what percent did the value rise from ${labels[i]} to ${labels[j]}?` : 'What is the average of the five bars?'
  const wrong = mode === 0 ? [`${n - 10}%`, `${n + 10}%`, `${Math.round(((v[j] - v[i]) / v[j]) * 100)}%`, `${n + 5}%`] : [fmt(n + 5), fmt(n - 5), fmt(n + 10), fmt(Math.max(...v) / 2)]
  const why =
    mode === 0
      ? `Change ÷ starting value: (${v[j]} − ${v[i]}) ÷ ${v[i]} = ${ans}. A common slip is dividing by the new value instead.`
      : `Add them (${v.join(' + ')} = ${v.reduce((a, b) => a + b, 0)}) and divide by 5: ${ans}.`
  return { kind: 'bars', p, text, ...choices(rng, ans, wrong), why }
}

function genPie(rng: RNG, d: number): Q {
  const labels = ['Rent', 'Food', 'Travel', 'Savings', 'Other']
  const s = [rng.int(5, 8) * 5, rng.int(3, 5) * 5, rng.int(1, 3) * 5, rng.int(2, 4) * 5]
  s.push(100 - s.reduce((a, b) => a + b, 0))
  if (s[4] < 5) s[0] -= 5 - s[4]
  s[4] = 100 - s.slice(0, 4).reduce((a, b) => a + b, 0)
  const T = rng.pick(d > 0.5 ? [64000, 72000, 84000, 96000, 125000] : [40000, 50000, 60000, 80000, 100000])
  const mode = d > 0.4 ? rng.int(0, 1) : 0
  const min = Math.min(...s)
  const i = mode === 1 ? rng.pick([0, 1, 2, 3, 4].filter((k) => s[k] > min)) : rng.int(0, 4)
  const j = mode === 1 ? rng.pick([0, 1, 2, 3, 4].filter((k) => s[k] < s[i])) : i
  const p = { s, T, ij: [i, j], mode, labels }
  const ans = SOLVE.pie(p)
  const n = parseInt(ans.replace(/[₹,]/g, ''))
  const text = mode === 0 ? `A monthly budget of ₹${fmt(T)} is split as shown. How much goes to ${labels[i]}?` : `A budget of ₹${fmt(T)} is split as shown. How much more goes to ${labels[i]} than to ${labels[j]}?`
  const wrong = [n + T / 20, n - T / 20, n + T / 10, Math.round(n * 1.2)].filter((x) => x > 0).map((x) => '₹' + fmt(Math.round(x)))
  const why = mode === 0 ? `${s[i]}% of ₹${fmt(T)} = ₹${fmt(T)} × ${s[i]} ÷ 100 = ${ans}.` : `The gap is ${s[i]}% − ${s[j]}% = ${s[i] - s[j]}% of ₹${fmt(T)}, which is ${ans}.`
  return { kind: 'pie', p, text, ...choices(rng, ans, wrong), why }
}

function genSeries(rng: RNG, d: number): Q {
  const kinds = d > 0.5 ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3]
  const k = rng.pick(kinds)
  const t: number[] = []
  let rule: string
  if (k === 0) {
    const a = rng.int(3, 30)
    const s = rng.int(4, 17)
    for (let i = 0; i < 6; i++) t.push(a + s * i)
    rule = `add ${s} each time`
  } else if (k === 1) {
    const a = rng.int(2, 6)
    const r = rng.int(2, 3)
    for (let i = 0; i < 6; i++) t.push(a * r ** i)
    rule = `multiply by ${r} each time`
  } else if (k === 2) {
    const c = rng.int(-3, 5)
    const o = rng.int(1, 4)
    for (let i = 0; i < 6; i++) t.push((i + o) ** 2 + c)
    rule = `squares (${o}², ${o + 1}², …) ${c >= 0 ? 'plus' : 'minus'} ${Math.abs(c)}`
  } else if (k === 3) {
    let v = rng.int(5, 20)
    const s = rng.int(1, 4)
    for (let i = 0; i < 6; i++) {
      t.push(v)
      v += s * (i + 1)
    }
    rule = `the gap grows by ${s} each step`
  } else if (k === 4) {
    const a = rng.int(10, 30)
    const up = rng.int(5, 12)
    const down = rng.int(2, up - 1)
    let v = a
    for (let i = 0; i < 6; i++) {
      t.push(v)
      v += i % 2 === 0 ? up : -down
    }
    rule = `alternately add ${up} and subtract ${down}`
  } else {
    let x = rng.int(1, 4)
    let y = rng.int(2, 6)
    t.push(x, y)
    for (let i = 2; i < 6; i++) {
      ;[x, y] = [y, x + y]
      t.push(y)
    }
    rule = 'each term is the sum of the two before it'
  }
  const p = { t, rule: [rule] }
  const ans = SOLVE.series(p)
  const last = t[5]
  const diff = t[5] - t[4]
  const wrong = [last + 1, last - 1, t[4] + (t[4] - t[3]), last + diff].map(fmt)
  return { kind: 'series', p, text: 'What comes next?', ...choices(rng, ans, wrong), why: `The rule: ${rule}. So the next term is ${ans}.` }
}

function genTrains(rng: RNG, d: number): Q {
  // Pick a time that comes out clean, then build the distance from it.
  const mins = rng.pick(d > 0.5 ? [36, 45, 48, 72, 84, 96, 105] : [30, 60, 90, 120, 150])
  // Multiples of 20 keep the distance a whole number for every listed time.
  const v1 = rng.int(2, 6) * 20
  const v2 = rng.int(2, 6) * 20
  const D = ((v1 + v2) * mins) / 60
  const p = { D, v1, v2 }
  const ans = SOLVE.trains(p)
  const t = hm
  const wrong = [t(mins + 15), t(Math.max(10, mins - 15)), t((D / Math.max(v1, v2)) * 60), t((D / Math.abs(v1 - v2 || 10)) * 60)]
  return {
    kind: 'trains',
    p,
    text: `Two trains ${fmt(D)} km apart head toward each other at ${v1} and ${v2} km/h. When do they meet?`,
    ...choices(rng, ans, wrong),
    why: `Approaching each other, the speeds add: ${v1} + ${v2} = ${v1 + v2} km/h. ${fmt(D)} ÷ ${v1 + v2} gives ${ans}.`,
  }
}

const WORK_PAIRS = [
  [6, 3], [12, 6], [10, 15], [20, 30], [12, 24], [18, 9], [4, 12], [15, 10], [24, 8], [30, 20], [36, 12], [40, 10], [14, 35], [21, 28],
]

function genWork(rng: RNG): Q {
  const [a, b] = rng.pick(WORK_PAIRS)
  const p = { a, b }
  const ans = SOLVE.work(p)
  const n = (a * b) / (a + b)
  const wrong = [`${(a + b) / 2} days`, `${n + 1} days`, `${Math.max(1, n - 1)} days`, `${Math.min(a, b) / 2} days`]
  return {
    kind: 'work',
    p,
    text: `Asha can finish a job in ${a} days. Ravi can finish it in ${b} days. Working together, how long do they take?`,
    ...choices(rng, ans, wrong),
    why: `Add the rates, not the times: 1/${a} + 1/${b} = ${frac(a + b, a * b)} of the job per day, so the job takes ${ans}. Averaging the times is the classic trap.`,
  }
}

const PRICE = [
  [25, 20], [50, 20], [40, 25], [60, 25], [20, 10], [50, 10], [25, 12], [80, 25], [100, 40], [30, 30], [20, 25], [10, 10], [40, 30], [60, 50],
]

function genPrice(rng: RNG): Q {
  const [m, k] = rng.pick(PRICE)
  const C = rng.pick([400, 800, 1200, 2000, 2500])
  const p = { m, k, C }
  const ans = SOLVE.price(p)
  const naive = m - k
  const f = (x: number) => (x === 0 ? 'No profit, no loss' : x > 0 ? `${x}% profit` : `${-x}% loss`)
  const real = Math.round(((1 + m / 100) * (1 - k / 100) - 1) * 100)
  const wrong = [f(naive), f(real + 5), f(real - 5), f(naive + 5)]
  return {
    kind: 'price',
    p,
    text: `A shop buys an item for ₹${fmt(C)}, marks it up ${m}%, then gives a ${k}% discount. What is the result?`,
    ...choices(rng, ans, wrong),
    why: `₹${fmt(C)} × ${1 + m / 100} × ${1 - k / 100} = ₹${fmt(Math.round(C * (1 + m / 100) * (1 - k / 100)))}. Percentages multiply, so you cannot just subtract ${k} from ${m}.`,
  }
}

function genBalls(rng: RNG, d: number): Q {
  const r = rng.int(2, d > 0.5 ? 6 : 4)
  const b = rng.int(2, d > 0.5 ? 6 : 4)
  const p = { r, b }
  const ans = SOLVE.balls(p)
  const n = r + b
  const wrong = [frac(r * r, n * n), frac(r, n), frac(r - 1, n - 1), frac(r * (r - 1), n * n)]
  return {
    kind: 'balls',
    p,
    text: `A jar holds ${r} orange and ${b} blue balls. You take out two without looking. What is the chance both are orange?`,
    ...choices(rng, ans, wrong),
    why: `First pick: ${r}/${n}. Second pick, with one orange gone: ${r - 1}/${n - 1}. Multiply: ${ans}.`,
  }
}

function generate(rng: RNG, d: number): L {
  const kinds = rng.shuffle<Kind>(['bars', 'pie', 'series', 'trains', 'work', 'price', 'balls']).slice(0, 6)
  const qs = kinds.map((k) => {
    switch (k) {
      case 'bars':
        return genBars(rng, d)
      case 'pie':
        return genPie(rng, d)
      case 'series':
        return genSeries(rng, d)
      case 'trains':
        return genTrains(rng, d)
      case 'work':
        return genWork(rng)
      case 'price':
        return genPrice(rng)
      case 'balls':
        return genBalls(rng, d)
    }
  })
  return { qs, limit: Math.round(60 - d * 25) }
}

function verify(l: L): boolean {
  return (
    l.qs.length === 6 &&
    l.qs.every(
      (q) =>
        q.choices.length === 4 &&
        new Set(q.choices).size === 4 &&
        q.choices[q.answer] === SOLVE[q.kind](q.p) &&
        (q.kind !== 'pie' || ((q.p.s as number[]).every((x) => x >= 5) && (q.p.s as number[]).reduce((a, b) => a + b, 0) === 100)),
    )
  )
}

// ---- Pictures.
const PAL = [RAMPS.indigo[3], RAMPS.teal[4], RAMPS.amber[3], RAMPS.magenta[3], RAMPS.violet[3]]

function draw(g: CanvasRenderingContext2D, q: Q, w: number, h: number): void {
  g.clearRect(0, 0, w, h)
  const ink = RAMPS.star[2]
  const dim = RAMPS.star[0]
  if (q.kind === 'bars') {
    const v = q.p.v as number[]
    const labels = q.p.labels as string[]
    const max = Math.max(...v) * 1.15
    const x0 = 16
    const y0 = h - 16
    const bw = (w - x0 - 8) / 5
    line(g, x0, y0, w - 6, y0, dim)
    v.forEach((val, i) => {
      const bh = (val / max) * (h - 40)
      const x = x0 + i * bw + bw * 0.18
      const grad = g.createLinearGradient(0, y0 - bh, 0, y0)
      grad.addColorStop(0, RAMPS.indigo[4])
      grad.addColorStop(1, RAMPS.indigo[1])
      g.fillStyle = grad
      g.beginPath()
      g.roundRect(x, y0 - bh, bw * 0.64, bh, [3, 3, 0, 0])
      g.fill()
      drawText(g, String(val), x + bw * 0.32, y0 - bh - 9, RAMPS.star[4], 0.95, 'center')
      drawText(g, labels[i], x + bw * 0.32, y0 + 4, ink, 0.9, 'center')
    })
  } else if (q.kind === 'pie') {
    const s = q.p.s as number[]
    const labels = q.p.labels as string[]
    const cx = w * 0.32
    const cy = h / 2
    const R = Math.min(w * 0.26, h * 0.4)
    let a = -Math.PI / 2
    s.forEach((pct, i) => {
      const b = a + (pct / 100) * Math.PI * 2
      g.fillStyle = PAL[i]
      g.beginPath()
      g.moveTo(cx, cy)
      g.arc(cx, cy, R, a, b)
      g.closePath()
      g.fill()
      a = b
    })
    disc(g, cx, cy, R * 0.45, RAMPS.void[1])
    labels.forEach((lb, i) => {
      const y = cy - 32 + i * 15
      roundRect(g, w * 0.62, y, 7, 7, 2, PAL[i])
      drawText(g, `${lb} ${s[i]}%`, w * 0.62 + 11, y - 0.5, ink, 1, 'left')
    })
  } else if (q.kind === 'series') {
    const t = q.p.t as number[]
    const n = 6
    const tw = Math.min(34, (w - 16) / n - 4)
    const x0 = (w - n * (tw + 4)) / 2
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (tw + 4)
      const last = i === n - 1
      roundRect(g, x, h / 2 - 16, tw, 32, 5, last ? RAMPS.amber[1] : RAMPS.void[4])
      drawText(g, last ? '?' : fmt(t[i]), x + tw / 2, h / 2 - 5, last ? RAMPS.amber[5] : RAMPS.star[4], t[i] > 999 ? 0.95 : 1.4, 'center')
    }
  } else if (q.kind === 'trains') {
    const y = h * 0.55
    line(g, 12, y + 7, w - 12, y + 7, dim, 0, 1)
    for (let x = 14; x < w - 12; x += 8) line(g, x, y + 5, x, y + 9, RAMPS.void[4])
    const train = (x: number, dir: number, col: string) => {
      roundRect(g, x - 18, y - 7, 36, 12, 4, col)
      polygon(g, dir > 0 ? [[x + 18, y - 7], [x + 26, y + 5], [x + 18, y + 5]] : [[x - 18, y - 7], [x - 26, y + 5], [x - 18, y + 5]], col)
      for (let k = -12; k <= 8; k += 10) roundRect(g, x + k, y - 4, 6, 4, 1, RAMPS.star[4])
    }
    train(34, 1, RAMPS.indigo[3])
    train(w - 34, -1, RAMPS.amber[3])
    drawText(g, `${q.p.v1} km/h →`, 22, y - 22, ink, 1, 'left')
    drawText(g, `← ${q.p.v2} km/h`, w - 22, y - 22, ink, 1, 'right')
    line(g, 60, y + 22, w - 60, y + 22, RAMPS.cyan[0])
    drawText(g, `${fmt(q.p.D as number)} km`, w / 2, y + 26, RAMPS.cyan[1], 1.1, 'center')
  } else if (q.kind === 'work') {
    const rows: [string, number, string][] = [
      ['Asha', q.p.a as number, RAMPS.indigo[3]],
      ['Ravi', q.p.b as number, RAMPS.teal[4]],
    ]
    const max = Math.max(q.p.a as number, q.p.b as number)
    rows.forEach(([name, days, col], i) => {
      const y = 22 + i * 30
      drawText(g, name, 12, y + 2, ink, 1, 'left')
      roundRect(g, 46, y, w - 58, 12, 4, RAMPS.void[3])
      roundRect(g, 46, y, ((w - 58) * days) / max, 12, 4, col)
      drawText(g, `${days} days`, 50, y + 2.5, RAMPS.void[0], 0.95, 'left')
    })
    const y = 22 + 2 * 30 + 6
    drawText(g, 'Both', 12, y + 2, RAMPS.amber[4], 1, 'left')
    roundRect(g, 46, y, w - 58, 12, 4, RAMPS.void[3])
    g.strokeStyle = RAMPS.amber[3]
    g.setLineDash([3, 3])
    g.strokeRect(46, y, (w - 58) * 0.4, 12)
    g.setLineDash([])
    drawText(g, '? days', 50, y + 2.5, RAMPS.amber[5], 0.95, 'left')
  } else if (q.kind === 'price') {
    const tag = (x: number, y: number, label: string, col: string) => {
      polygon(g, [[x, y + 12], [x + 12, y], [x + 62, y], [x + 62, y + 24], [x + 12, y + 24]], col)
      disc(g, x + 11, y + 12, 2.5, RAMPS.void[1])
      drawText(g, label, x + 38, y + 7, RAMPS.void[0], 1.15, 'center')
    }
    const cy = h / 2 - 12
    tag(6, cy, '₹' + fmt(q.p.C as number), RAMPS.star[3])
    drawText(g, `+${q.p.m}%`, w * 0.43, cy - 4, RAMPS.green[3], 1.2, 'center')
    line(g, 72, cy + 12, w * 0.55, cy + 12, RAMPS.green[3], 0, 1.4)
    drawText(g, `−${q.p.k}%`, w * 0.78, cy - 4, RAMPS.lava[3], 1.2, 'center')
    line(g, w * 0.6, cy + 12, w - 8, cy + 12, RAMPS.lava[3], 0, 1.4)
    drawText(g, 'cost', 40, cy + 30, dim, 1, 'center')
    drawText(g, 'mark up', w * 0.43, cy + 18, dim, 0.9, 'center')
    drawText(g, 'discount', w * 0.78, cy + 18, dim, 0.9, 'center')
  } else {
    const r = q.p.r as number
    const b = q.p.b as number
    const jx = w / 2 - 40
    const jy = 14
    const jw = 80
    const jh = h - 28
    g.strokeStyle = RAMPS.star[1]
    g.lineWidth = 1.2
    g.beginPath()
    g.roundRect(jx, jy, jw, jh, 10)
    g.stroke()
    const balls = [...Array(r).fill(0), ...Array(b).fill(1)]
    balls.forEach((c, i) => {
      const x = jx + 13 + (i % 4) * 18
      const y = jy + jh - 12 - Math.floor(i / 4) * 17
      if (c === 0) ball(g, x, y, 7, RAMPS.amber[1], RAMPS.amber[3], RAMPS.amber[4], RAMPS.amber[5])
      else ball(g, x, y, 7, RAMPS.indigo[0], RAMPS.indigo[2], RAMPS.indigo[4], RAMPS.star[4])
    })
    drawText(g, 'take 2', jx + jw + 10, jy + 6, ink, 1, 'left')
  }
}

const mod: GameModule<L> = {
  id: 'aptitude',
  category: 'math',
  title: 'Aptitude Sprint',
  howTo: 'Six quick quantitative questions: charts, series, speed, work, prices and chance. Each has a countdown, so read the picture fast and think before you tap.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 220, 140)
    st.root.classList.add('apt')
    const { pc } = st
    const L = ctx.level
    let i = 0
    let correct = 0
    let left = L.limit
    let locked = false
    const notes: string[] = []
    const text = el('p', { class: 'g-text apt-q' })
    const bar = el('div', { class: 'apt-bar' }, el('span'))
    st.root.insertBefore(bar, st.canvasBox)
    st.root.insertBefore(text, st.controls)

    const show = () => {
      const q = L.qs[i]
      locked = false
      left = L.limit
      text.textContent = q.text
      draw(pc.ctx, q, pc.w, pc.h)
      const grid = el('div', { class: 'apt-choices' })
      q.choices.forEach((c, k) => grid.append(button(c, () => pick(k, grid))))
      st.controls.replaceChildren(grid)
    }

    const pick = (k: number, grid: HTMLElement) => {
      if (locked) return
      locked = true
      const q = L.qs[i]
      const ok = k === q.answer
      if (ok) correct++
      ctx.fx.sfx(ok ? 'correct' : 'wrong')
      ctx.fx.haptic(ok ? 'correct' : 'wrong')
      ;[...grid.children].forEach((b, n) => {
        if (n === q.answer) b.classList.add('ok')
        else if (n === k) b.classList.add('no')
        ;(b as HTMLButtonElement).disabled = true
      })
      notes.push(q.why)
      st.controls.append(
        el('p', { class: 'g-text muted', text: (k < 0 ? 'Time up. ' : '') + q.why }),
        button(i + 1 < L.qs.length ? 'Next' : 'Finish', () => {
          i++
          if (i < L.qs.length) show()
          else {
            loop.stop()
            ctx.finish({ score: correct / L.qs.length, correct, total: L.qs.length, answer: `${correct} of ${L.qs.length} right.`, explanation: 'Aptitude questions reward setting the problem up before calculating: add rates, multiply percentages, and divide by the starting value.' })
          }
        }, 'big'),
      )
    }

    const loop = new Loop((dt) => {
      if (locked) return
      left -= dt
      ;(bar.firstChild as HTMLElement).style.width = `${Math.max(0, (left / L.limit) * 100)}%`
      st.hud.textContent = `Question ${i + 1} / ${L.qs.length} · ${Math.ceil(Math.max(0, left))} s`
      if (left <= 0) {
        const grid = st.controls.querySelector('.apt-choices') as HTMLElement
        if (grid) pick(-1, grid)
      }
    })
    const ro = new ResizeObserver(() => draw(pc.ctx, L.qs[i] ?? L.qs[0], pc.w, pc.h))
    ro.observe(st.canvasBox)
    show()
    return {
      destroy() {
        loop.stop()
        ro.disconnect()
        st.destroy()
      },
      pause: () => loop.pause(),
      resume: () => loop.resume(),
    }
  },
  score: defaultScore('math'),
}

export default mod

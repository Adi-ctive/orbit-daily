// Running Tally: working memory plus arithmetic. Two docking bays, A and B.
// Ships arrive, leave and transfer one event at a time. At the end you are asked
// for one bay's count, and you do not know which in advance.
import { halo, line, ring } from '../art/draw'
import { RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { button, el, Loop, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

type Ev = { kind: 'in'; bay: 0 | 1; n: number } | { kind: 'out'; bay: 0 | 1; n: number } | { kind: 'move'; from: 0 | 1; n: number }
interface Stream {
  start: [number, number]
  events: Ev[]
  ask: 0 | 1
  options: number[]
}
interface L {
  streams: Stream[]
  interval: number
}

const COUNT = 4
const BAY = ['A', 'B']

export function totals(s: Stream): [number, number][] {
  const out: [number, number][] = []
  let [a, b] = s.start
  for (const e of s.events) {
    const sign = e.kind === 'out' ? -1 : 1
    if (e.kind !== 'move') {
      if (e.bay === 0) a += sign * e.n
      else b += sign * e.n
    } else {
      const dA = e.from === 0 ? -e.n : e.n
      a += dA
      b -= dA
    }
    out.push([a, b])
  }
  return out
}

function generate(rng: RNG, d: number): L {
  const streams: Stream[] = []
  for (let k = 0; k < COUNT; k++) {
    const len = Math.round(6 + d * 5 + k)
    const start: [number, number] = [rng.int(2, 9), rng.int(2, 9)]
    let cur: [number, number] = [...start]
    const events: Ev[] = []
    for (let i = 0; i < len; i++) {
      const r = rng.float()
      const bay = rng.int(0, 1) as 0 | 1
      const n = rng.int(1, 4 + Math.round(d * 4))
      let e: Ev
      if (r < 0.38) e = { kind: 'in', bay, n }
      else if (r < 0.72 && cur[bay] - n >= 0) e = { kind: 'out', bay, n }
      else if (cur[bay] - n >= 0) e = { kind: 'move', from: bay, n }
      else e = { kind: 'in', bay, n }
      events.push(e)
      cur = totals({ start, events, ask: 0, options: [] })[i]
    }
    const ask = rng.int(0, 1) as 0 | 1
    const ans = cur[ask]
    const wrong = new Set<number>()
    // Distractors: the other bay, and near misses a slip would give.
    for (const c of rng.shuffle([cur[1 - ask], ans + 1, ans - 1, ans + 2, ans - 2, ans + 3])) {
      if (c !== ans && c >= 0 && wrong.size < 3) wrong.add(c)
    }
    streams.push({ start, events, ask, options: rng.shuffle([ans, ...wrong]) })
  }
  return { streams, interval: Math.round((2.3 - d * 0.9) * 100) / 100 }
}

function verify(l: L): boolean {
  return (
    l.streams.length === COUNT &&
    l.streams.every((s) => {
      const t = totals(s)
      if (t.some(([a, b]) => a < 0 || b < 0)) return false
      const ans = t[t.length - 1][s.ask]
      return s.options.length === 4 && new Set(s.options).size === 4 && s.options.filter((o) => o === ans).length === 1
    })
  )
}

function evText(e: Ev): string {
  if (e.kind === 'in') return `+${e.n} INTO ${BAY[e.bay]}`
  if (e.kind === 'out') return `−${e.n} OUT OF ${BAY[e.bay]}`
  return `${e.n} MOVE ${BAY[e.from]} → ${BAY[1 - e.from]}`
}

const mod: GameModule<L> = {
  id: 'running-tally',
  category: 'math',
  title: 'Running Tally',
  rules: {
    goal: 'Keep count of the ships in two bays at once.',
    steps: [
      'You see how many ships start in bay A and bay B.',
      'Events flash one by one: ships come in, leave, or move from one bay to the other.',
      'Keep both counts in your head. Nothing is written down.',
      'At the end you are asked for one bay. 4 streams, each a little longer.',
    ],
  },
  howTo: 'Track both bay counts through every arrival, departure and transfer. You will be asked for one of them.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 220, 180)
    const { pc } = st
    const L = ctx.level
    let s = 0
    let i = -1
    let t = 0
    let phase: 'start' | 'run' | 'ask' | 'fb' = 'start'
    let right = 0
    const slips: string[] = []
    const prompt = el('p', { class: 'g-text sm-prompt' })

    const hud = () => (st.hud.textContent = `Stream ${s + 1} / ${COUNT} · ${right} right`)
    hud()

    const ask = () => {
      phase = 'ask'
      const S = L.streams[s]
      const end = totals(S)[S.events.length - 1]
      prompt.textContent = `How many ships are in bay ${BAY[S.ask]} now?`
      st.controls.replaceChildren(
        prompt,
        ...S.options.map((o) =>
          button(String(o), () => {
            if (phase !== 'ask') return
            const ok = o === end[S.ask]
            if (ok) right++
            else slips.push(`stream ${s + 1}: bay ${BAY[S.ask]} had ${end[S.ask]}, you said ${o}`)
            ctx.fx.sfx(ok ? 'correct' : 'wrong')
            ctx.fx.haptic(ok ? 'correct' : 'wrong')
            prompt.textContent = ok ? `Right. A ${end[0]}, B ${end[1]}.` : `It was ${end[S.ask]}. Final counts: A ${end[0]}, B ${end[1]}.`
            st.controls.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = true))
            phase = 'fb'
            t = 0
          }),
        ),
      )
    }

    const loop = new Loop((dt) => {
      t += dt
      const S = L.streams[s]
      if (phase === 'start' && t >= 2.4) {
        phase = 'run'
        t = 0
        i = 0
      } else if (phase === 'run' && t >= L.interval) {
        t = 0
        i++
        if (i >= S.events.length) ask()
      } else if (phase === 'fb' && t >= 1.8) {
        s++
        if (s >= COUNT) {
          loop.stop()
          ctx.finish({
            score: right / COUNT,
            correct: right,
            total: COUNT,
            answer: `${right} of ${COUNT} counts right.`,
            explanation: `${slips.length ? slips[0] + '. ' : ''}Holding two numbers while updating them is a classic working memory load. Transfers are the trap: one bay goes down and the other goes up by the same amount, so update both at once.`,
          })
          return
        }
        phase = 'start'
        t = 0
        i = -1
        st.controls.replaceChildren()
        hud()
      }
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const cy = pc.h * 0.5
      const xs = [pc.w * 0.25, pc.w * 0.75]
      const r = Math.min(pc.w * 0.17, pc.h * 0.28)
      line(g, xs[0] + r, cy, xs[1] - r, cy, RAMPS.indigo[1], 3)
      xs.forEach((x, k) => {
        halo(g, x, cy, r, 6, RAMPS.indigo[3])
        ring(g, x, cy, r, RAMPS.indigo[4], false, 2)
        drawText(g, 'BAY ' + BAY[k], x, cy - r - 14, RAMPS.star[2], 1.2, 'center')
        if (phase === 'start') drawText(g, String(S.start[k]), x, cy - r * 0.38, RAMPS.star[4], r / 9, 'center')
        else if (phase === 'run' || phase === 'ask') drawText(g, '?', x, cy - r * 0.38, RAMPS.star[0], r / 9, 'center')
        else drawText(g, String(totals(S)[S.events.length - 1][k]), x, cy - r * 0.38, RAMPS.star[4], r / 9, 'center')
      })
      if (phase === 'start') drawText(g, 'STARTING COUNTS', pc.w / 2, 8, RAMPS.amber[4], 1.3, 'center')
      if (phase === 'run' && i >= 0 && i < S.events.length) {
        const e = S.events[i]
        const fade = Math.min(1, t / 0.15)
        g.globalAlpha = fade
        const col = e.kind === 'in' ? RAMPS.green[3] : e.kind === 'out' ? RAMPS.lava[3] : RAMPS.amber[4]
        drawText(g, evText(e), pc.w / 2, 8, col, 1.8, 'center')
        g.globalAlpha = 1
        drawText(g, `${i + 1} / ${S.events.length}`, pc.w / 2, pc.h - 14, RAMPS.star[0], 1, 'center')
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
  score: defaultScore('math'),
}

export default mod

// Rule Flip: task switching. A number appears on a coloured card. Amber card:
// is it odd or even? Cyan card: is it below or above 5? The rule can flip on
// any card, and each card has a short time limit.
import { halo, roundRect } from '../art/draw'
import { C, RAMPS } from '../art/palette'
import { drawText } from '../art/pixelFont'
import type { RNG } from '../lib/rng'
import { button, Loop, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

type Rule = 'parity' | 'size'
interface Item {
  n: number
  rule: Rule
}
interface L {
  items: Item[]
  window: number
}

const LEN = 26
const DIGITS = [1, 2, 3, 4, 6, 7, 8, 9]

/** True when the correct answer is the left button (ODD or LOW). */
export const leftIsRight = (it: Item): boolean => (it.rule === 'parity' ? it.n % 2 === 1 : it.n < 5)

function generate(rng: RNG, d: number): L {
  const items: Item[] = []
  const pSwitch = 0.3 + d * 0.2
  let rule: Rule = rng.bool() ? 'parity' : 'size'
  for (let i = 0; i < LEN; i++) {
    if (i > 0 && rng.bool(pSwitch)) rule = rule === 'parity' ? 'size' : 'parity'
    let n: number
    do n = rng.pick(DIGITS)
    while (i > 0 && n === items[i - 1].n)
    items.push({ n, rule })
  }
  return { items, window: Math.round((2.4 - d * 1.2) * 100) / 100 }
}

function verify(l: L): boolean {
  if (l.items.length !== LEN || l.window < 1) return false
  let sw = 0
  for (let i = 1; i < LEN; i++) if (l.items[i].rule !== l.items[i - 1].rule) sw++
  const lefts = l.items.filter(leftIsRight).length
  return sw >= 5 && sw <= 15 && lefts >= 8 && lefts <= 18 && l.items.every((x) => DIGITS.includes(x.n))
}

const mod: GameModule<L> = {
  id: 'rule-flip',
  category: 'reflex',
  title: 'Rule Flip',
  rules: {
    goal: 'Sort each number by the rule its card colour shows.',
    steps: [
      'Amber card: is the number ODD or EVEN?',
      'Cyan card: is the number LOW (1 to 4) or HIGH (6 to 9)?',
      'Left button means ODD or LOW. Right button means EVEN or HIGH. Arrow keys work too.',
      'The colour can flip on any card. Each card times out fast, and a timeout counts as wrong.',
    ],
  },
  howTo: 'Amber: odd or even. Cyan: low or high. Left is ODD or LOW, right is EVEN or HIGH.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 200, 200)
    const { pc } = st
    const L = ctx.level
    ctx.fx.duck(true)
    let i = -1
    let t = 0
    let gap = 0
    let answered = false
    let right = 0
    let flash = 0
    let flashOk = true
    let ended = false
    const rtSwitch: number[] = []
    const rtStay: number[] = []
    let switchErr = 0
    let stayErr = 0

    const left = button('ODD · LOW', () => answer(true), 'big')
    const rightB = button('EVEN · HIGH', () => answer(false), 'big')
    st.controls.append(left, rightB)

    const isSwitch = (k: number) => k > 0 && L.items[k].rule !== L.items[k - 1].rule

    const answer = (sayLeft: boolean) => {
      if (ended || answered || i < 0 || gap > 0) return
      answered = true
      const ok = sayLeft === leftIsRight(L.items[i])
      if (ok) {
        right++
        ;(isSwitch(i) ? rtSwitch : rtStay).push(t)
      } else if (isSwitch(i)) switchErr++
      else stayErr++
      flashOk = ok
      flash = 0.3
      ctx.fx.sfx(ok ? 'correct' : 'wrong')
      ctx.fx.haptic(ok ? 'tap' : 'wrong')
      gap = 0.28
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') answer(true)
      if (e.code === 'ArrowRight') answer(false)
    }
    addEventListener('keydown', onKey)

    const next = () => {
      i++
      t = 0
      answered = false
      if (i >= L.items.length) return finish()
      st.hud.textContent = `Card ${i + 1} / ${L.items.length} · ${right} right`
    }

    const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

    const finish = () => {
      ended = true
      loop.stop()
      const cost = Math.round((avg(rtSwitch) - avg(rtStay)) * 1000)
      ctx.finish({
        score: right / L.items.length,
        correct: right,
        total: L.items.length,
        answer: `${right} of ${L.items.length} cards sorted. ${switchErr} mistakes right after a flip, ${stayErr} on repeat cards.`,
        explanation:
          rtSwitch.length && rtStay.length
            ? `Flipping rule cost you about ${Math.max(0, cost)} ms per card. That pause is your brain unloading one rule and loading the other. It shrinks with practice but never reaches zero.`
            : 'Switching rules has a built-in cost: the brain has to drop one rule and load the other before it can answer.',
      })
    }

    const loop = new Loop((dt) => {
      if (ended) return
      flash = Math.max(0, flash - dt)
      if (gap > 0) {
        gap -= dt
        if (gap <= 0) next()
      } else if (i < 0) next()
      else {
        t += dt
        if (!answered && t >= L.window) {
          answered = true
          if (isSwitch(i)) switchErr++
          else stayErr++
          flashOk = false
          flash = 0.3
          ctx.fx.sfx('wrong')
          gap = 0.28
        }
      }
      if (ended) return
      const g = pc.ctx
      g.clearRect(0, 0, pc.w, pc.h)
      const it = L.items[Math.max(0, i)]
      const cx = pc.w / 2
      const cy = pc.h * 0.46
      const s = Math.min(pc.w * 0.5, pc.h * 0.5, 110)
      const col = it.rule === 'parity' ? RAMPS.amber[3] : RAMPS.cyan[0]
      if (gap <= 0 || answered) {
        halo(g, cx, cy, s * 0.4, s * 0.35, col)
        roundRect(g, cx - s / 2, cy - s / 2, s, s, 14, RAMPS.void[3])
        g.strokeStyle = flash > 0 ? (flashOk ? C.good : C.bad) : col
        g.lineWidth = 4
        g.beginPath()
        g.roundRect(cx - s / 2, cy - s / 2, s, s, 14)
        g.stroke()
        drawText(g, String(it.n), cx, cy - s * 0.3, RAMPS.star[4], s / 12, 'center')
        drawText(g, it.rule === 'parity' ? 'ODD OR EVEN?' : 'LOW OR HIGH?', cx, cy - s / 2 - 18, col, 1.4, 'center')
      }
      // Time left on this card.
      if (i >= 0 && !answered) {
        const f = Math.max(0, 1 - t / L.window)
        roundRect(g, cx - s / 2, cy + s / 2 + 12, s * f, 4, 2, col)
      }
      drawText(g, 'AMBER  ODD / EVEN', 10, pc.h - 26, RAMPS.amber[4], 1, 'left')
      drawText(g, 'CYAN  LOW / HIGH', 10, pc.h - 13, RAMPS.cyan[1], 1, 'left')
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

// Doomsday Sprint: name the weekday of a date between 1800 and 2199.
// Answers are checked against both the Doomsday rule and the JS Date engine.
import type { RNG } from '../lib/rng'
import { button, el, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

interface D {
  y: number
  m: number
  d: number
}
interface L {
  dates: D[]
}

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
const daysIn = (y: number, m: number) => [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]

/** Conway's Doomsday rule. Returns 0 = Sunday. */
export function doomsdayOf(y: number): number {
  const anchor = [2, 0, 5, 3][Math.floor(y / 100) % 4]
  const yy = y % 100
  return (anchor + Math.floor(yy / 12) + (yy % 12) + Math.floor((yy % 12) / 4)) % 7
}

/** A memorable date in each month that always falls on the doomsday. */
export function anchorDay(y: number, m: number): number {
  return [leap(y) ? 4 : 3, leap(y) ? 29 : 28, 14, 4, 9, 6, 11, 8, 5, 10, 7, 12][m - 1]
}

export function weekdayByRule(y: number, m: number, d: number): number {
  return (((doomsdayOf(y) + d - anchorDay(y, m)) % 7) + 7) % 7
}

export function weekdayByDate(y: number, m: number, d: number): number {
  const dt = new Date(Date.UTC(2000, 0, 1))
  dt.setUTCFullYear(y, m - 1, d)
  return dt.getUTCDay()
}

function generate(rng: RNG, d: number): L {
  const span = Math.round(60 + d * 140)
  const dates: D[] = []
  for (let i = 0; i < 10; i++) {
    const y = Math.max(1800, Math.min(2199, 2026 + rng.int(-span, span)))
    const m = rng.int(1, 12)
    dates.push({ y, m, d: rng.int(1, daysIn(y, m)) })
  }
  return { dates }
}

function verify(l: L): boolean {
  return (
    l.dates.length === 10 &&
    l.dates.every((x) => x.y >= 1800 && x.y <= 2199 && x.d >= 1 && x.d <= daysIn(x.y, x.m) && weekdayByRule(x.y, x.m, x.d) === weekdayByDate(x.y, x.m, x.d))
  )
}

const mod: GameModule<L> = {
  id: 'doomsday',
  category: 'math',
  title: 'Doomsday Sprint',
  rules: {
    goal: "Name the weekday of each date.",
    steps: ["A date appears, anywhere from 1800 to 2199.","Tap the day of the week it falls on.","Shortcut: 4/4, 6/6, 8/8, 10/10 and 12/12 always share a weekday in any year.","10 dates."],
  },
  howTo: 'Name the day of the week for each date. Tip: 4/4, 6/6, 8/8, 10/10 and 12/12 always share a weekday in any year.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 40, 40)
    st.canvasBox.remove()
    const L = ctx.level
    let i = 0
    let correct = 0
    const t0 = performance.now()
    const body = el('div', { class: 'dd-body' })
    st.root.insertBefore(body, st.controls)
    const notes: string[] = []

    const show = () => {
      const x = L.dates[i]
      st.hud.textContent = `Date ${i + 1} / ${L.dates.length} · ${correct} right`
      body.replaceChildren(el('p', { class: 'dd-date label', text: `${x.d} ${MONTHS[x.m - 1]} ${x.y}` }))
      let done = false
      st.controls.replaceChildren(
        ...DAYS.map((name, k) =>
          button(name.slice(0, 3), () => {
            if (done) return
            done = true
            const ans = weekdayByDate(x.y, x.m, x.d)
            const ok = k === ans
            if (ok) correct++
            ctx.fx.sfx(ok ? 'correct' : 'wrong')
            ctx.fx.haptic(ok ? 'correct' : 'wrong')
            const dd = doomsdayOf(x.y)
            const hint = `${x.y}'s doomsday is ${DAYS[dd]}; ${anchorDay(x.y, x.m)} ${MONTHS[x.m - 1]} is one, so ${x.d} ${MONTHS[x.m - 1]} is ${DAYS[ans]}.`
            notes.push(hint)
            body.append(el('p', { class: 'g-text' }, el('strong', { text: ok ? '✓ ' : `✗ ${DAYS[ans]}. ` }), hint))
            setTimeout(
              () => {
                i++
                if (i < L.dates.length) show()
                else
                  ctx.finish({
                    score: correct / L.dates.length,
                    correct,
                    total: L.dates.length,
                    answer: `${correct} of ${L.dates.length} weekdays in ${Math.round((performance.now() - t0) / 1000)} s.`,
                    explanation: `Conway's Doomsday rule: every year has one weekday shared by 4/4, 6/6, 8/8, 10/10, 12/12, 9/5, 5/9, 7/11, 11/7 and the last day of February. ${notes[notes.length - 1]}`,
                  })
              },
              ok ? 700 : 1800,
            )
          }),
        ),
      )
      st.controls.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-label', DAYS[k]))
    }
    show()
    return { destroy: () => st.destroy() }
  },
  score: defaultScore('math'),
}

export default mod

// Fermi Line: estimate a quantity on a log slider. Scored by orders of magnitude.
import type { RNG } from '../lib/rng'
import { FERMI, templated, type FermiItem } from './fermiData'
import { button, el, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

interface L {
  items: FermiItem[]
}

function generate(rng: RNG, _d: number): L {
  const bank = rng.shuffle(FERMI).slice(0, 3)
  const t = templated(rng.int(2, 40), rng.int(0, 3))
  return { items: rng.shuffle([...bank, t]) }
}

function verify(l: L): boolean {
  return (
    l.items.length === 4 &&
    l.items.every((it) => it.a > 0 && Math.log10(it.a) > it.lo && Math.log10(it.a) < it.hi && it.hi - it.lo >= 3)
  )
}

export function fermiScore(guess: number, answer: number): number {
  return Math.max(0, 1 - Math.abs(Math.log10(guess / answer)) / 1.5)
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
export const sup = (n: number): string =>
  (n < 0 ? '⁻' : '') +
  String(Math.abs(n))
    .split('')
    .map((d) => SUP[Number(d)])
    .join('')

export function pretty(v: number): string {
  if (v >= 1e6 || v < 0.01) {
    const e = Math.floor(Math.log10(v))
    const m = v / Math.pow(10, e)
    return `${m.toFixed(m < 10 ? 1 : 0)} × 10${sup(e)}`
  }
  return v >= 100 ? Math.round(v).toLocaleString('en-US') : String(Math.round(v * 100) / 100)
}

const mod: GameModule<L> = {
  id: 'fermi-line',
  category: 'math',
  title: 'Fermi Line',
  howTo: 'Estimate each quantity on a log scale. You score by how many powers of ten you are off, so a good guess beats a perfect one.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 40, 40)
    st.canvasBox.remove()
    const L = ctx.level
    let i = 0
    const scores: number[] = []
    const notes: string[] = []
    const body = el('div', { class: 'fl-body' })
    st.root.insertBefore(body, st.controls)

    const show = () => {
      const it = L.items[i]
      st.hud.textContent = `Estimate ${i + 1} / ${L.items.length}`
      const mid = (it.lo + it.hi) / 2
      const val = el('p', { class: 'fl-val label' })
      const slider = el('input', { type: 'range', min: it.lo, max: it.hi, step: 0.01, value: mid, class: 'fl-slider', 'aria-label': `Estimate in ${it.unit}` }) as HTMLInputElement
      const upd = () => (val.textContent = `${pretty(Math.pow(10, Number(slider.value)))} ${it.unit}`)
      slider.addEventListener('input', upd)
      upd()
      const ticks = el('div', { class: 'fl-ticks' }, ...[it.lo, Math.round(mid), it.hi].map((e) => el('span', { text: `10${sup(e)}` })))
      body.replaceChildren(el('p', { class: 'g-text', text: it.q }), val, slider, ticks)
      st.controls.replaceChildren(
        button('Lock in', () => {
          const g = Math.pow(10, Number(slider.value))
          const s = fermiScore(g, it.a)
          scores.push(s)
          const off = Math.abs(Math.log10(g / it.a))
          notes.push(`${it.q}: ${pretty(it.a)} ${it.unit}.`)
          ctx.fx.sfx(s > 0.6 ? 'correct' : 'wrong')
          ctx.fx.haptic(s > 0.6 ? 'correct' : 'wrong')
          body.append(
            el('p', { class: 'g-text' }, el('strong', { text: `Answer: ${pretty(it.a)} ${it.unit}` }), ` · you were ${off < 0.05 ? 'spot on' : off.toFixed(1) + ' powers of ten off'}.`),
            el('p', { class: 'g-text muted', text: it.why }),
          )
          slider.disabled = true
          st.controls.replaceChildren(
            button(i + 1 < L.items.length ? 'Next' : 'Finish', () => {
              i++
              if (i < L.items.length) show()
              else {
                const total = scores.reduce((a, b) => a + b, 0)
                ctx.finish({
                  score: total / scores.length,
                  correct: scores.filter((s) => s > 0.6).length,
                  total: scores.length,
                  answer: `Estimation score ${Math.round((total / scores.length) * 100)}%.`,
                  explanation: notes.join(' '),
                })
              }
            }, 'big'),
          )
        }, 'big'),
      )
    }
    show()
    return { destroy: () => st.destroy() }
  },
  score: defaultScore('math'),
}

export default mod

// Signal from Deep Space: three original riddles from the curated bank.
import riddles from '../../content/riddles/riddles.json'
import type { RNG } from '../lib/rng'
import { button, el, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

export interface Riddle {
  id: string
  q: string
  answer: string
  choices: string[]
  explanation: string
  difficulty: number
  tags: string[]
}

export const RIDDLES = riddles as Riddle[]

interface L {
  picks: { id: string; order: string[] }[]
}

function generate(rng: RNG, d: number): L {
  // Only the harder riddles: this is for adults, not a school quiz.
  const want = d > 0.6 ? 3 : 2
  const near = RIDDLES.filter((r) => r.difficulty >= want)
  const picked = rng.shuffle(near.length >= 3 ? near : RIDDLES).slice(0, 3)
  return { picks: picked.map((r) => ({ id: r.id, order: rng.shuffle([r.answer, ...r.choices]) })) }
}

function verify(l: L): boolean {
  return (
    l.picks.length === 3 &&
    new Set(l.picks.map((p) => p.id)).size === 3 &&
    l.picks.every((p) => {
      const r = RIDDLES.find((x) => x.id === p.id)
      return !!r && p.order.length === 4 && p.order.includes(r.answer) && new Set(p.order).size === 4
    })
  )
}

const mod: GameModule<L> = {
  id: 'riddle-bank',
  category: 'riddle',
  title: 'Signal from Deep Space',
  howTo: 'Three riddles have arrived. Read each one carefully and pick the answer that fits every clue.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 40, 40)
    st.canvasBox.remove()
    const L = ctx.level
    let i = 0
    let correct = 0
    const notes: string[] = []
    const body = el('div', { class: 'rb-body' })
    st.root.insertBefore(body, st.controls)

    const show = () => {
      const p = L.picks[i]
      const r = RIDDLES.find((x) => x.id === p.id)!
      st.hud.textContent = `Signal ${i + 1} / ${L.picks.length}`
      body.replaceChildren(el('p', { class: 'g-text rb-q', text: r.q }))
      const box = el('div', { class: 'g-choices' })
      let answered = false
      p.order.forEach((c) => {
        const b = button(c, () => {
          if (answered) return
          answered = true
          const ok = c === r.answer
          if (ok) correct++
          b.classList.add(ok ? 'ok' : 'no')
          if (!ok) [...box.children].find((x) => x.textContent === r.answer)?.classList.add('ok')
          ctx.fx.sfx(ok ? 'correct' : 'wrong')
          ctx.fx.haptic(ok ? 'correct' : 'wrong')
          notes.push(`${r.answer}: ${r.explanation}`)
          body.append(el('p', { class: 'g-text muted', text: r.explanation }))
          st.controls.replaceChildren(
            button(i + 1 < L.picks.length ? 'Next signal' : 'Finish', () => {
              i++
              st.controls.replaceChildren()
              if (i < L.picks.length) show()
              else ctx.finish({ score: correct / L.picks.length, correct, total: L.picks.length, answer: `${correct} of ${L.picks.length} riddles solved.`, explanation: notes.join(' ') })
            }, 'big'),
          )
        })
        box.append(b)
      })
      body.append(box)
    }
    show()
    return { destroy: () => st.destroy() }
  },
  score: defaultScore('riddle'),
}

export default mod

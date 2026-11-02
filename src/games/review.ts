// Review round: 3-5 quick questions on earlier Star Chart cards (spaced repetition),
// topped up with quiz-bank items on the first days.
import { el, button } from './kit'
import type { GameModule } from './types'

type L = { ok: true }

const mod: GameModule<L> = {
  id: 'review',
  category: 'stem',
  title: 'Review Transmission',
  howTo: 'Quick questions on what you charted before. Pick the right answer.',
  generate: () => ({ ok: true }),
  verify: () => true,
  mount(ctx) {
    const items = (ctx.items ?? []).filter((i) => i.quiz && i.quiz.choices.length > 1)
    const root = el('div', { class: 'review' })
    ctx.host.append(root)
    const outcomes: { id: string; correct: boolean; ms: number }[] = []
    const notes: string[] = []
    let i = 0
    let t0 = performance.now()

    const done = () => {
      const correct = outcomes.filter((o) => o.correct).length
      ctx.finish({
        score: items.length ? correct / items.length : 1,
        correct,
        total: items.length,
        answer: `${correct} of ${items.length} recalled`,
        explanation: notes.join(' ') || 'Nothing to review yet.',
        reviews: outcomes.filter((o) => o.id.startsWith('card:')),
      })
    }

    const show = () => {
      root.replaceChildren()
      if (i >= items.length) return done()
      const it = items[i]
      const q = it.quiz!
      root.append(el('p', { class: 'g-hud', text: `Question ${i + 1} of ${items.length}` }), el('p', { class: 'g-text', text: q.q }))
      const box = el('div', { class: 'g-choices', role: 'group', 'aria-label': 'Answers' })
      let answered = false
      q.choices.forEach((c, k) => {
        const b = button(c, () => {
          if (answered) return
          answered = true
          const ok = k === q.answer
          outcomes.push({ id: it.id, correct: ok, ms: performance.now() - t0 })
          notes.push(`${ok ? '✓' : '✗'} ${q.choices[q.answer]}.`)
          b.classList.add(ok ? 'ok' : 'no')
          if (!ok) box.children[q.answer]?.classList.add('ok')
          ctx.fx.sfx(ok ? 'correct' : 'wrong')
          ctx.fx.haptic(ok ? 'correct' : 'wrong')
          const exp = el('p', { class: 'g-text muted', text: q.explanation })
          root.append(exp, button(i + 1 < items.length ? 'Next question' : 'Finish', () => {
            i++
            t0 = performance.now()
            show()
          }))
        })
        box.append(b)
      })
      root.append(box)
      const src = el('p', { class: 'muted', style: 'font-size:.8rem' }, `Source: ${it.source.name} (${it.license})`)
      root.append(src)
    }
    show()
    return { destroy: () => root.remove() }
  },
  score: () => ({ skill: null, outcome: 1 }),
}

export default mod

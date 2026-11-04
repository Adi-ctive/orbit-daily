// Today's explainer: one idea, read at your own pace. No quiz.
import { getExplainer } from '../content/explainers'
import { button, el } from './kit'
import type { GameModule } from './types'

type L = { ok: true }

const mod: GameModule<L> = {
  id: 'explainer',
  category: 'stem',
  title: "Today's explainer",
  howTo: 'One idea worth knowing, in about three minutes. Read at your own pace.',
  generate: () => ({ ok: true }),
  verify: () => true,
  mount(ctx) {
    const ex = ctx.items?.[0] ? getExplainer(ctx.items[0]) : undefined
    const root = el('article', { class: 'ex' })
    ctx.host.append(root)
    if (!ex) {
      root.append(el('p', { class: 'g-text', text: 'You have read every explainer so far. New ones arrive with updates.' }))
      root.append(button('Continue', () => ctx.finish({ score: 1, correct: 0, total: 0, answer: 'Nothing new today', explanation: '' }), 'big'))
      return { destroy: () => root.remove() }
    }
    const t0 = performance.now()
    root.append(
      el('p', { class: 'label ex-cat', text: ex.category }),
      el('h2', { class: 'ex-title', text: ex.title }),
      el('p', { class: 'ex-hook', text: ex.hook }),
      ...ex.paras.map((p) => el('p', { class: 'ex-p', text: p })),
      el('div', { class: 'ex-take' }, el('span', { class: 'label', text: 'The idea' }), el('p', { text: ex.takeaway })),
      el('p', { class: 'ex-read' }, 'Further reading: ', ...ex.read.flatMap((r, i) => [i ? ', ' : '', el('a', { href: r.url, target: '_blank', rel: 'noopener', text: r.name })])),
    )
    const done = button(
      'Done reading',
      () => {
        ctx.fx.sfx('flip')
        const secs = Math.round((performance.now() - t0) / 1000)
        ctx.finish({
          score: 1,
          correct: 1,
          total: 1,
          answer: ex.title,
          explanation: `${ex.takeaway} Read in ${Math.max(1, Math.round(secs / 60))} min. Saved to your logbook.`,
          learned: { id: ex.id, title: ex.title, category: ex.category },
        })
      },
      'big ex-done',
    )
    root.append(done)
    root.scrollTop = 0
    return { destroy: () => root.remove() }
  },
  score: () => ({ skill: null, outcome: 1 }),
}

export default mod

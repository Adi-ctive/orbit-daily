// Star Chart: one new sourced STEM card, with a matched pixel illustration.
import { drawIllustration } from '../art/illustrations'
import { makeOffscreen } from '../art/pixelCanvas'
import { el, button } from './kit'
import type { GameModule } from './types'

type L = { ok: true }

const mod: GameModule<L> = {
  id: 'star-chart',
  category: 'stem',
  title: 'Star Chart',
  howTo: "Today's learning card. Read it at your own pace. You'll see a question about it tomorrow.",
  generate: () => ({ ok: true }),
  verify: () => true,
  mount(ctx) {
    const card = ctx.items?.[0]
    const root = el('div', { class: 'starchart' })
    ctx.host.append(root)
    if (!card) {
      root.append(el('p', { class: 'g-text', text: 'No card could be loaded today. The sky is quiet.' }))
      root.append(button('Continue', () => ctx.finish({ score: 1, correct: 0, total: 0, answer: 'No card today', explanation: 'Check your connection once to download more star charts.' }), 'big'))
      return { destroy: () => root.remove() }
    }
    const { canvas } = makeOffscreen(120, 64)
    drawIllustration(canvas.getContext('2d')!, card.category, card.id, 120, 64)
    canvas.className = 'pixel-canvas sc-illus'
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', `Illustration for ${card.title}`)
    const frame = el('div', { class: 'sc-frame panel' })
    frame.append(
      canvas,
      el('p', { class: 'label sc-cat', text: card.category.toUpperCase() }),
      el('h2', { class: 'sc-title', text: card.title }),
    )
    if (card.hook) frame.append(el('p', { class: 'sc-hook', text: card.hook }))
    frame.append(el('p', { class: 'sc-body', text: card.body }))
    if (card.whyItMatters) frame.append(el('p', { class: 'sc-why' }, el('strong', { text: 'Why it matters: ' }), card.whyItMatters))
    const src = el('p', { class: 'sc-src' }, 'Source: ', el('a', { href: card.source.url, target: '_blank', rel: 'noopener', text: `${card.source.name}: ${card.title}` }), ` (${card.license})`)
    frame.append(src)
    root.append(frame)
    const t0 = performance.now()
    root.append(
      button(
        'Chart it',
        () => {
          ctx.fx.sfx('flip')
          ctx.finish({
            score: 1,
            correct: 1,
            total: 1,
            answer: `Charted: ${card.title}`,
            explanation: `Added to your logbook. Read time ${Math.round((performance.now() - t0) / 1000)} s. It comes back as a review question tomorrow.`,
            learned: { id: card.id, title: card.title, category: card.category },
          })
        },
        'big',
      ),
    )
    return { destroy: () => root.remove() }
  },
  score: () => ({ skill: null, outcome: 1 }),
}

export default mod

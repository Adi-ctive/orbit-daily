// Star Chart cards from Wikipedia REST page summaries (CC BY-SA 4.0).
// Each card gets a "which topic is this?" quiz built from its own text and the
// titles of three other cards in the same category, so the answer is right by construction.
import { getJson, mcq, pool } from './lib.mjs'

const REST = 'https://en.wikipedia.org/api/rest_v1/page/summary/'

function firstSentences(text, max = 320) {
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [text]
  let out = ''
  for (const p of parts) {
    if ((out + p).length > max && out) break
    out += p
  }
  return out.trim()
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Hide the subject of the first sentence so the question does not give the answer away. */
export function clozeFor(title, extract) {
  const s = firstSentences(extract, 260)
  const base = title.replace(/\s*\(.*\)$/, '')
  const words = [base, ...base.split(/\s+/).filter((w) => w.length > 4)]
  let q = s
  const m = s.match(/^(.{0,120}?)\b(is|are|was|were|refers to|describes)\b/)
  if (m) q = '____ ' + s.slice(m[1].length)
  for (const w of words) q = q.replace(new RegExp(esc(w), 'gi'), '____')
  // Reject if the subject still leaks through, or nothing was hidden.
  if (!q.includes('____')) return null
  if (q.toLowerCase().includes(base.toLowerCase())) return null
  return q
}

export async function fetchCards(topics) {
  const raw = await pool(
    topics,
    16,
    async (t) => {
      try {
        const j = await getJson(REST + encodeURIComponent(t.title.replace(/ /g, '_')))
        if (!j || j.type !== 'standard' || !j.extract || j.extract.length < 160) return null
        return {
          title: j.title,
          extract: j.extract,
          url: j.content_urls?.desktop?.page ?? 'https://en.wikipedia.org/wiki/' + encodeURIComponent(j.title),
          revisionId: Number(j.revision) || 0,
          category: t.category,
        }
      } catch (e) {
        console.warn('  skip', t.title, String(e).slice(0, 80))
        return null
      }
    },
    (d, n) => console.log(`  summaries ${d}/${n}`),
  )
  const ok = raw.filter(Boolean)
  // Drop duplicates that redirected to the same article.
  const byTitle = new Map()
  for (const c of ok) if (!byTitle.has(c.title)) byTitle.set(c.title, c)
  const cards = [...byTitle.values()]

  const byCat = new Map()
  for (const c of cards) byCat.set(c.category, [...(byCat.get(c.category) ?? []), c])
  const items = []
  for (const [cat, list] of byCat) {
    list.forEach((c, i) => {
      const id = `card:${cat}:${String(i).padStart(4, '0')}`
      const q = clozeFor(c.title, c.extract)
      let quiz
      if (q && list.length >= 4) {
        // Three distractor titles from the same category, chosen by seed.
        const others = []
        for (let k = 1; others.length < 3 && k < list.length; k++) {
          const o = list[(i + k * 37) % list.length]
          if (o.title !== c.title && !others.includes(o.title)) others.push(o.title)
        }
        const { choices, answer } = mcq(id, c.title, others)
        quiz = { q: `Which topic is this? “${q}”`, choices, answer, explanation: `That was ${c.title}, from your Star Chart.` }
      }
      items.push({
        id,
        type: 'card',
        category: cat,
        title: c.title,
        body: c.extract,
        ...(quiz ? { quiz } : {}),
        difficulty: 2,
        tags: [cat],
        source: { name: 'Wikipedia', url: c.url, revisionId: c.revisionId },
        license: 'CC BY-SA 4.0',
        attribution: `Wikipedia contributors, “${c.title}”`,
        modified: false,
        reviewed: false,
      })
    })
  }
  return items
}

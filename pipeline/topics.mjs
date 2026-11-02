// Topic list from Wikipedia Vital Articles (Level 5, which contains Level 4).
import { getJson } from './lib.mjs'

const API = 'https://en.wikipedia.org/w/api.php'

/** [page, default category, heading → category overrides] */
const PAGES = [
  ['Physical sciences/Astronomy', 'astronomy'],
  ['Physical sciences/Physics', 'physics'],
  ['Physical sciences/Basics and measurement', 'physics'],
  ['Physical sciences/Chemistry', 'chemistry'],
  ['Physical sciences/Earth science', 'earth', /^(air|atmosphere|meteorology|climatology|seasons)/i, 'meteorology'],
  ['Geography/Physical', 'geography'],
  ['Geography/Regions and countries', 'geography'],
  ['Biology and health sciences/Biology', 'biology'],
  ['Biology and health sciences/Animals', 'biology'],
  ['Biology and health sciences/Plants', 'biology'],
  ['Mathematics', 'math'],
]

export async function fetchTopics() {
  const seen = new Set()
  const topics = []
  for (const [page, cat, re, alt] of PAGES) {
    const url = `${API}?action=parse&page=${encodeURIComponent('Wikipedia:Vital articles/Level 5/' + page)}&prop=wikitext&format=json&formatversion=2&redirects=1`
    const j = await getJson(url)
    const text = j?.parse?.wikitext ?? ''
    // Track the level-2 and level-3 headings so sub-sections can be re-categorised.
    const heads = []
    let n = 0
    for (const line of text.split('\n')) {
      const h = line.match(/^(=+)\s*(.*?)\s*=+\s*$/)
      if (h) {
        heads[h[1].length] = h[2]
        heads.length = h[1].length + 1
        continue
      }
      if (!/^#/.test(line)) continue
      const m = line.match(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/)
      if (!m) continue
      const title = m[1].trim()
      if (/^(Wikipedia|Category|File|Template|Portal|Help):/i.test(title)) continue
      if (seen.has(title)) continue
      seen.add(title)
      let category = cat
      if (re && heads.some((x) => x && re.test(x))) category = alt
      topics.push({ title, category, section: heads.filter(Boolean).slice(-1)[0] ?? '' })
      n++
    }
    console.log(`  ${page}: ${n} topics`)
  }
  return topics
}

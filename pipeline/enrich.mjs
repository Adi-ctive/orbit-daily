// Optional: rewrite Star Chart cards as hook → why it matters with a LOCAL model
// through Ollama. Free, runs on the developer's GPU, never in the app.
//
//   node pipeline/enrich.mjs [limit] [model]
//
// Rules: the model must quote the source sentence behind each line; the quote
// is string-checked against the Wikipedia extract; failures keep the raw text.
// Output goes to pipeline/.cache/enriched.json and is merged on the next
// `npm run content:build`, marked modified: true, reviewed: false.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

const LIMIT = Number(process.argv[2] ?? 20)
const MODEL = process.argv[3] ?? 'qwen2.5:7b-instruct'
const OUT = 'pipeline/.cache/enriched.json'
const norm = (s) => s.replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim().toLowerCase()

async function ask(card) {
  const prompt = `You write short learning cards. Use ONLY the source text below.
Return JSON: {"hook": string, "hook_quote": string, "why": string, "why_quote": string}
- hook: one curious sentence (max 25 words) that makes a reader want to learn the topic.
- why: one sentence (max 30 words) on why this topic matters in the real world.
- hook_quote and why_quote: copy EXACTLY one sentence from the source that supports each line.
Do not add facts that are not in the source.

Title: ${card.title}
Source: ${card.body}`
  const r = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({ model: MODEL, prompt, format: 'json', stream: false, options: { temperature: 0.2 } }),
  })
  if (!r.ok) throw new Error('Ollama ' + r.status)
  return JSON.parse((await r.json()).response)
}

async function main() {
  const done = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
  const files = readdirSync('public/data').filter((f) => f.startsWith('card-'))
  const cards = files.flatMap((f) => JSON.parse(readFileSync('public/data/' + f, 'utf8')))
  let n = 0
  let kept = 0
  for (const c of cards) {
    if (n >= LIMIT) break
    if (done[c.id]) continue
    n++
    try {
      const out = await ask(c)
      const src = norm(c.body)
      const ok = out.hook && out.why && src.includes(norm(out.hook_quote ?? '')) && src.includes(norm(out.why_quote ?? '')) && (out.hook_quote ?? '').length > 20
      if (!ok) {
        console.log('  reject (quote not in source):', c.title)
        continue
      }
      done[c.id] = { title: c.title, fields: { hook: out.hook.trim(), whyItMatters: out.why.trim() } }
      kept++
      console.log('  ok:', c.title)
    } catch (e) {
      console.log('  error:', c.title, String(e).slice(0, 80))
      break
    }
  }
  writeFileSync(OUT, JSON.stringify(done, null, 1))
  console.log(`enriched ${kept}/${n} this run, ${Object.keys(done).length} total`)
}

main()

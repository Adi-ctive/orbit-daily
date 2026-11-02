// Arithmetic word problems from GSM8K (MIT). Kept only when every calculator
// step in the worked solution re-computes in code and the final answer matches.
import { getText, mcq } from './lib.mjs'

const BASE = 'https://raw.githubusercontent.com/openai/grade-school-math/master/grade_school_math/data/'

/** Evaluate a plain arithmetic expression (digits, + - * / ( ) . only). */
export function evalArith(expr) {
  const s = expr.replace(/,/g, '').replace(/\s+/g, '')
  if (!/^[\d+\-*/().]+$/.test(s)) return null
  let i = 0
  const num = () => {
    const m = s.slice(i).match(/^\d+(\.\d+)?/)
    if (!m) return null
    i += m[0].length
    return Number(m[0])
  }
  const factor = () => {
    if (s[i] === '-') {
      i++
      const f = factor()
      return f === null ? null : -f
    }
    if (s[i] === '(') {
      i++
      const v = sum()
      if (s[i] !== ')') return null
      i++
      return v
    }
    return num()
  }
  const term = () => {
    let v = factor()
    while (v !== null && (s[i] === '*' || s[i] === '/')) {
      const op = s[i++]
      const f = factor()
      if (f === null) return null
      v = op === '*' ? v * f : v / f
    }
    return v
  }
  const sum = () => {
    let v = term()
    while (v !== null && (s[i] === '+' || s[i] === '-')) {
      const op = s[i++]
      const t = term()
      if (t === null) return null
      v = op === '+' ? v + t : v - t
    }
    return v
  }
  const v = sum()
  return i === s.length ? v : null
}

const close = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b))

function distractors(ans) {
  const set = new Set()
  const cands = [ans + 1, ans - 1, ans * 2, Math.round(ans / 2), ans + 10, ans - 10, Math.round(ans * 1.1), Math.round(ans * 0.9), ans + 5, ans * 10]
  for (const c of cands) if (c > 0 && c !== ans && Number.isInteger(c)) set.add(c)
  return [...set].slice(0, 3)
}

export async function fetchAptitude() {
  const items = []
  let kept = 0
  let dropped = 0
  for (const split of ['train', 'test']) {
    const text = await getText(BASE + split + '.jsonl')
    for (const line of text.split('\n')) {
      if (!line.trim()) continue
      const { question, answer } = JSON.parse(line)
      const final = answer.match(/####\s*([-\d,.]+)/)
      if (!final) continue
      const ans = Number(final[1].replace(/,/g, ''))
      const steps = [...answer.matchAll(/<<([^=<>]+)=([^<>]+)>>/g)]
      let ok = steps.length > 0 && Number.isInteger(ans) && ans > 0
      let last = null
      for (const st of steps) {
        const v = evalArith(st[1])
        const claimed = Number(st[2].replace(/,/g, ''))
        if (v === null || !Number.isFinite(claimed) || !close(v, claimed)) {
          ok = false
          break
        }
        last = v
      }
      if (ok && last !== null && !close(last, ans)) ok = false
      const ds = ok ? distractors(ans) : []
      if (!ok || ds.length < 3) {
        dropped++
        continue
      }
      const id = `aptitude:math:${String(kept).padStart(5, '0')}`
      const worked = answer
        .replace(/<<[^>]*>>/g, '')
        .replace(/####.*$/s, '')
        .trim()
        .replace(/\n+/g, ' ')
      items.push({
        id,
        type: 'aptitude',
        category: 'math',
        title: '',
        body: '',
        quiz: { q: question, ...mcq(id, String(ans), ds.map(String)), explanation: worked.slice(0, 400) },
        difficulty: steps.length <= 2 ? 1 : steps.length <= 4 ? 2 : 3,
        tags: ['gsm8k', split],
        source: { name: 'GSM8K (OpenAI)', url: 'https://github.com/openai/grade-school-math' },
        license: 'MIT',
        attribution: 'GSM8K, Cobbe et al. 2021, MIT licence',
        modified: true,
        reviewed: false,
      })
      kept++
    }
  }
  console.log(`  gsm8k: kept ${kept}, dropped ${dropped} that did not re-compute`)
  return items
}

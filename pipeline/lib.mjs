// Shared pipeline helpers: polite cached fetching and a seeded RNG.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const UA = 'ORBIT-content-pipeline/1.0 (non-commercial study app; https://github.com/Adi-ctive/orbit-daily)'
export const CACHE = 'pipeline/.cache'
mkdirSync(CACHE, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function cachePath(url) {
  return join(CACHE, createHash('sha1').update(url).digest('hex') + '.json')
}

/** GET JSON with a User-Agent, retries with backoff, and an on-disk cache. */
export async function getJson(url, { cache = true, headers = {} } = {}) {
  const p = cachePath(url)
  if (cache && existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'))
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA, Accept: 'application/json', ...headers } })
      if (r.status === 404) {
        if (cache) writeFileSync(p, 'null')
        return null
      }
      if (r.status === 429 || r.status >= 500) {
        await sleep(2000 * (attempt + 1))
        continue
      }
      if (!r.ok) throw new Error(`${r.status} ${url}`)
      const j = await r.json()
      if (cache) writeFileSync(p, JSON.stringify(j))
      return j
    } catch (e) {
      if (attempt === 4) throw e
      await sleep(1500 * (attempt + 1))
    }
  }
  return null
}

export async function getText(url) {
  const p = cachePath(url).replace(/\.json$/, '.txt')
  if (existsSync(p)) return readFileSync(p, 'utf8')
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  const t = await r.text()
  writeFileSync(p, t)
  return t
}

/** Run `fn` over items with limited concurrency. */
export async function pool(items, limit, fn, onProgress) {
  const out = new Array(items.length)
  let next = 0
  let done = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
      done++
      if (onProgress && done % 250 === 0) onProgress(done, items.length)
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
  return out
}

// Same xmur3 + sfc32 as the app, so pipeline output is reproducible.
function xmur3(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

export function rng(seed) {
  const h = xmur3(seed)
  let a = h()
  let b = h()
  let c = h()
  let d = h()
  const next = () => {
    a >>>= 0
    b >>>= 0
    c >>>= 0
    d >>>= 0
    let t = (a + b) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    d = (d + 1) | 0
    t = (t + d) | 0
    c = (c + t) | 0
    return (t >>> 0) / 4294967296
  }
  return {
    float: next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const o = arr.slice()
      for (let i = o.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[o[i], o[j]] = [o[j], o[i]]
      }
      return o
    },
  }
}

/** Put the answer at a seeded position among the distractors. */
export function mcq(seed, answer, distractors) {
  const r = rng(seed)
  const choices = r.shuffle([answer, ...distractors])
  return { choices, answer: choices.indexOf(answer) }
}

export function hash(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 16)
}

// Loads the static content chunks. Chunk 0 of each category is precached by the
// service worker; later chunks load on demand and are cached at runtime.
import { RNG } from '../lib/rng'
import type { ChunkInfo, ContentItem, ContentManifest } from './types'

let manifest: ContentManifest | null = null

/** Fetch with a time limit, so a crawling network never blocks launching a mission. */
export function timedFetch(ms = 4000): typeof fetch {
  return (input, init) => {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), ms)
    return fetch(input, { ...init, signal: ac.signal }).finally(() => clearTimeout(t))
  }
}
const chunks = new Map<string, ContentItem[]>()
const byId = new Map<string, ContentItem>()

export async function loadManifest(fetcher: typeof fetch = timedFetch()): Promise<ContentManifest | null> {
  if (manifest) return manifest
  try {
    const r = await fetcher('/data/manifest.json')
    if (!r.ok) return null
    manifest = (await r.json()) as ContentManifest
    return manifest
  } catch {
    return null
  }
}

export async function loadChunk(info: ChunkInfo, fetcher: typeof fetch = timedFetch()): Promise<ContentItem[] | null> {
  const hit = chunks.get(info.file)
  if (hit) return hit
  try {
    const r = await fetcher('/data/' + info.file)
    if (!r.ok) return null
    const items = (await r.json()) as ContentItem[]
    chunks.set(info.file, items)
    for (const it of items) byId.set(it.id, it)
    return items
  } catch {
    return null
  }
}

export function getItem(id: string): ContentItem | undefined {
  return byId.get(id)
}

export function chunksOf(m: ContentManifest, type: ChunkInfo['type'], category?: string): ChunkInfo[] {
  return m.chunks.filter((c) => c.type === type && (!category || c.category === category)).sort((a, b) => a.n - b.n)
}

/** Load the chunk that holds an item id, from the manifest index. */
export async function ensureItem(id: string): Promise<ContentItem | undefined> {
  const hit = byId.get(id)
  if (hit) return hit
  const m = await loadManifest()
  if (!m) return undefined
  const [type, category, num] = id.split(':')
  const n = Math.floor(Number(num) / m.chunkSize)
  const info = m.chunks.find((c) => c.type === type && c.category === category && c.n === n)
  if (!info) return undefined
  await loadChunk(info)
  return byId.get(id)
}

/**
 * Pick today's new Star Chart card: a seeded category, then the first unseen card
 * in a seeded order. Tries later chunks only when earlier ones are used up.
 */
export async function pickCard(seed: string, seen: ReadonlySet<string>): Promise<ContentItem | null> {
  const m = await loadManifest()
  if (!m) return null
  const rng = new RNG(seed + '/card')
  const cats = rng.shuffle([...new Set(chunksOf(m, 'card').map((c) => c.category))].sort())
  for (const cat of cats) {
    for (const info of chunksOf(m, 'card', cat)) {
      const items = await loadChunk(info)
      if (!items) break
      const order = rng.fork(info.file).shuffle(items)
      const fresh = order.find((it) => !seen.has(it.id))
      if (fresh) return fresh
    }
  }
  return null
}

/** Global filler quiz ids for the review round (same for everyone that day). */
export async function pickFillers(seed: string, count: number): Promise<string[]> {
  const m = await loadManifest()
  if (!m) return []
  const rng = new RNG(seed + '/filler')
  const pool = [...chunksOf(m, 'quiz').filter((c) => c.n === 0), ...chunksOf(m, 'aptitude').filter((c) => c.n === 0)]
  const out: string[] = []
  for (let i = 0; i < count * 3 && out.length < count && pool.length; i++) {
    const info = rng.pick(pool)
    const items = await loadChunk(info)
    if (!items?.length) continue
    const it = rng.pick(items)
    if (it.quiz && !out.includes(it.id)) out.push(it.id)
  }
  return out
}

/** Background prefetch of the next chunk per category (only on unmetered networks). */
export async function prefetchAhead(): Promise<void> {
  const m = await loadManifest()
  if (!m) return
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; type?: string } }).connection
  if (conn?.saveData || (conn?.type && conn.type !== 'wifi' && conn.type !== 'ethernet')) return
  for (const c of m.chunks.filter((c) => c.n === 1)) await loadChunk(c)
}

export function _resetContentForTests(): void {
  manifest = null
  chunks.clear()
  byId.clear()
}

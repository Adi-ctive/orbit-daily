// Validates every shipped content chunk against the item schema.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ContentItem } from '../src/content/types'

const DIR = 'public/data'
const has = existsSync(`${DIR}/manifest.json`)

describe.skipIf(!has)('content chunks', { timeout: 120_000 }, () => {
  const manifest = has ? JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8')) : { chunks: [] }

  it('manifest lists chunks with matching hashes and counts', () => {
    expect(manifest.chunks.length).toBeGreaterThan(0)
    for (const c of manifest.chunks) {
      const raw = readFileSync(`${DIR}/${c.file}`, 'utf8')
      expect(createHash('sha256').update(raw).digest('hex').slice(0, 16), c.file).toBe(c.hash)
      expect(JSON.parse(raw).length, c.file).toBe(c.count)
    }
  })

  it('every item matches the schema, has a source and a licence', () => {
    const ids = new Set<string>()
    for (const c of manifest.chunks) {
      const items = JSON.parse(readFileSync(`${DIR}/${c.file}`, 'utf8'))
      items.forEach((it: ContentItem, i: number) => {
        const where = `${c.file}#${i}`
        expect(['card', 'quiz', 'riddle', 'aptitude'], where).toContain(it.type)
        expect(it.type, where).toBe(c.type)
        expect(it.category, where).toBe(c.category)
        expect(typeof it.id, where).toBe('string')
        expect(ids.has(it.id), `duplicate ${it.id}`).toBe(false)
        ids.add(it.id)
        // The id encodes the chunk, so the loader can find any item.
        const n = Number(it.id.split(':')[2])
        expect(Math.floor(n / manifest.chunkSize), where).toBe(c.n)
        expect(it.license, where).toBeTruthy()
        expect(it.source?.name, where).toBeTruthy()
        expect(it.source?.url, where).toMatch(/^https:\/\//)
        expect(it.attribution, where).toBeTruthy()
        if (it.type === 'card') {
          expect(it.title.length, where).toBeGreaterThan(0)
          expect(it.body.length, where).toBeGreaterThan(100)
        }
        if (it.type !== 'card' || it.quiz) {
          const q = it.quiz!
          expect(q?.q?.length, where).toBeGreaterThan(5)
          expect(Array.isArray(q.choices) && q.choices.length >= 2, where).toBe(true)
          expect(new Set(q.choices).size, `${where} duplicate choices`).toBe(q.choices.length)
          expect(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length, where).toBe(true)
        }
        if (it.type === 'card' && it.quiz) {
          // The cloze must not leak the answer.
          // Whole-word match, the same rule the pipeline uses (so "Pi" is not found in "topic").
          const esc = it.title.replace(/\s*\(.*\)$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          expect(new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, 'iu').test(it.quiz.q), where).toBe(false)
          expect(it.quiz.choices[it.quiz.answer], where).toBe(it.title)
        }
      })
    }
  })

  it('meets the v1 scale targets', () => {
    expect(manifest.counts.cards).toBeGreaterThanOrEqual(10_000)
    expect(manifest.counts.quiz + manifest.counts.aptitude).toBeGreaterThanOrEqual(20_000)
  })

  it('first chunk of each card category exists for offline precache', () => {
    const cats = new Set(manifest.chunks.filter((c: { type: string }) => c.type === 'card').map((c: { category: string }) => c.category))
    for (const cat of cats) expect(manifest.chunks.some((c: { type: string; category: string; n: number }) => c.type === 'card' && c.category === cat && c.n === 0)).toBe(true)
  })
})

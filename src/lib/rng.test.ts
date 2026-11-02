import { describe, expect, it } from 'vitest'
import { RNG } from './rng'

describe('RNG', () => {
  it('is deterministic for the same seed', () => {
    const a = new RNG('orbit-v1|2026-11-02')
    const b = new RNG('orbit-v1|2026-11-02')
    for (let i = 0; i < 1000; i++) expect(a.float()).toBe(b.float())
  })

  it('differs across seeds', () => {
    const a = new RNG('x').float()
    const b = new RNG('y').float()
    expect(a).not.toBe(b)
  })

  it('stays in range', () => {
    const r = new RNG('range')
    for (let i = 0; i < 10_000; i++) {
      const f = r.float()
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThan(1)
      const n = r.int(3, 7)
      expect(n).toBeGreaterThanOrEqual(3)
      expect(n).toBeLessThanOrEqual(7)
    }
  })

  it('int covers every value', () => {
    const r = new RNG('cover')
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) seen.add(r.int(0, 9))
    expect(seen.size).toBe(10)
  })

  it('shuffle keeps elements', () => {
    const r = new RNG('shuf')
    const arr = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(r.shuffle(arr).sort()).toEqual(arr)
  })

  it('weighted never picks zero weight', () => {
    const r = new RNG('w')
    for (let i = 0; i < 1000; i++) expect(r.weighted([0, 1, 0, 2])).not.toBe(0)
  })

  it('fork is stable', () => {
    expect(new RNG('s').fork('a').float()).toBe(new RNG('s').fork('a').float())
  })
})

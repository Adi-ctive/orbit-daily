import { describe, expect, it } from 'vitest'
import { EXPLAINERS, pickExplainer } from './index'

describe('explainers', () => {
  it('has a full year of well-formed entries', () => {
    expect(EXPLAINERS.length).toBeGreaterThanOrEqual(365)
    expect(new Set(EXPLAINERS.map((e) => e.id)).size).toBe(EXPLAINERS.length)
    for (const e of EXPLAINERS) {
      expect(e.paras.length, e.id).toBeGreaterThanOrEqual(3)
      const words = [e.hook, ...e.paras, e.takeaway].join(' ').split(/\s+/).length
      expect(words, e.id).toBeGreaterThan(110)
      expect(words, e.id).toBeLessThan(600)
      for (const r of e.read) expect(r.url, e.id).toMatch(/^https:\/\//)
    }
  })

  it('uses plain punctuation (no em dashes or semicolons)', () => {
    for (const e of EXPLAINERS) {
      const text = [e.title, e.hook, ...e.paras, e.takeaway].join(' ')
      expect(text, e.id).not.toMatch(/[—;]/)
    }
  })

  it('everyone gets the same one on a day, and seen ones are skipped', () => {
    const a = pickExplainer(20_400, new Set())!
    expect(pickExplainer(20_400, new Set())!.id).toBe(a.id)
    const b = pickExplainer(20_400, new Set([a.id]))!
    expect(b.id).not.toBe(a.id)
    expect(pickExplainer(1, new Set(EXPLAINERS.map((e) => e.id)))).toBeNull()
  })
})

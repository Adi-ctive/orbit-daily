import { describe, expect, it } from 'vitest'
import { RNG } from '../lib/rng'
import { CATALOG } from './catalog'
import { loadGame } from './registry'
import { generateVerified } from './types'
import { solve24 } from './fuelMix'
import { doomsdayOf, weekdayByDate, weekdayByRule } from './doomsday'
import { evalStmt, solutions, type Stmt } from './aliens'
import { DIGIT, eqText, isTrue, oneMoveResults } from './starSticks'
import { sector, windAngle } from './isobarWind'
import { RIDDLES } from './riddleBank'
import { FERMI } from './fermiData'

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const SEEDS = Number(env.GEN_SEEDS ?? 1000)

describe('every game generator', () => {
  for (const g of [...CATALOG, { id: 'aptitude' }]) {
    it(`${g.id}: ${SEEDS} seeds are deterministic, verified and fast`, async () => {
      const m = await loadGame(g.id)
      // Warm the JIT so the timing measures the generator, not first-call compile.
      for (let w = 0; w < 5; w++) generateVerified(m, new RNG('warm' + w), 0.5)
      let worst = 0
      for (let i = 0; i < SEEDS; i++) {
        const d = (i % 11) / 10
        const seed = `orbit-v1|test-${i}|${g.id}`
        const t0 = performance.now()
        const a = generateVerified(m, new RNG(seed), d)
        const dt = performance.now() - t0
        worst = Math.max(worst, dt)
        expect(m.verify(a), `${g.id} seed ${i}`).toBe(true)
        if (i % 50 === 0) expect(generateVerified(m, new RNG(seed), d)).toEqual(a)
      }
      expect(worst, `${g.id} slowest generation ${worst.toFixed(1)} ms`).toBeLessThan(50)
    }, 120_000)
  }
})

describe('solvers', () => {
  it('24 solver', () => {
    expect(solve24([4, 7, 8, 8]).count).toBeGreaterThan(0)
    expect(solve24([1, 1, 1, 1]).count).toBe(0)
    // 3,3,8,8 needs fractions: 8 / (3 - 8/3) = 24.
    expect(solve24([3, 3, 8, 8]).count).toBeGreaterThan(0)
  })

  it('doomsday rule matches the calendar for every day 1800-2199', () => {
    for (let y = 1800; y <= 2199; y++) {
      for (let m = 1; m <= 12; m++) {
        const days = new Date(Date.UTC(2000, m, 0)).getUTCDate() + (m === 2 && ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 0 : 0)
        for (let d = 1; d <= Math.min(days, 28); d += 9) expect(weekdayByRule(y, m, d)).toBe(weekdayByDate(y, m, d))
      }
    }
    expect(doomsdayOf(2026)).toBe(6) // 2026's doomsday is a Saturday
  })

  it('knights and knaves', () => {
    // A says "B is a liar", B says "A and I are the same kind": A truthful, B liar.
    const st: Stmt[] = [
      { k: 'is', s: 0, t: 1, truthful: false },
      { k: 'same', s: 1, a: 0, b: 1 },
    ]
    expect(solutions(2, st)).toEqual([[true, false]])
    expect(evalStmt({ k: 'count', s: 0, n: 1 }, [true, false])).toBe(true)
  })

  it('matchsticks', () => {
    const e = { a: [DIGIT[6]], op: 0b11, b: [DIGIT[4]], c: [DIGIT[4]] } // 6 + 4 = 4 (false)
    expect(isTrue(e)).toBe(false)
    const fixes = oneMoveResults(e).filter((r) => isTrue(r.eq)).map((r) => eqText(r.eq))
    expect(fixes.length).toBeGreaterThan(0)
    expect(isTrue({ a: [DIGIT[1]], op: 0b11, b: [DIGIT[2]], c: [DIGIT[3]] })).toBe(true)
  })

  it('isobar wind follows Buys Ballot', () => {
    // A low to the west of the point. NH: geostrophic wind toward north, friction turns it toward the low (west): NW-ish → N sector.
    const low = [{ x: 0.3, y: 0.5, amp: -20, sigma: 0.2 }]
    const n = sector(windAngle(low, 0.5, 0.5, true)).s
    expect([0, 7]).toContain(n)
    // Same map in the south: toward south, turned toward the low → S or SW.
    const s = sector(windAngle(low, 0.5, 0.5, false)).s
    expect([4, 5]).toContain(s)
  })
})

describe('content banks', () => {
  it('has 150+ original riddles with valid choices', () => {
    expect(RIDDLES.length).toBeGreaterThanOrEqual(150)
    expect(new Set(RIDDLES.map((r) => r.id)).size).toBe(RIDDLES.length)
    for (const r of RIDDLES) {
      expect(r.choices.length).toBe(3)
      expect(r.choices).not.toContain(r.answer)
      expect(r.explanation.length).toBeGreaterThan(10)
      expect([1, 2, 3]).toContain(r.difficulty)
    }
  })

  it('fermi items sit inside their slider range', () => {
    for (const f of FERMI) {
      const e = Math.log10(f.a)
      expect(e, f.q).toBeGreaterThan(f.lo)
      expect(e, f.q).toBeLessThan(f.hi)
    }
  })
})

describe('24 fast counter', () => {
  it('matches the reference solver on 300 random sets', async () => {
    const { count24, solve24 } = await import('./fuelMix')
    const r = new RNG('count24')
    for (let i = 0; i < 300; i++) {
      const s = [r.int(1, 13), r.int(1, 13), r.int(1, 13), r.int(1, 13)]
      expect(count24(s) > 0, s.join()).toBe(solve24(s).expr !== null)
    }
  })
})

describe('new game solvers', () => {
  it('code lock feedback counts exact and near once each', async () => {
    const { score } = await import('./codeLock')
    expect(score([0, 1, 2, 3], [0, 1, 2, 3])).toEqual({ exact: 4, near: 0 })
    expect(score([0, 1, 2, 3], [3, 2, 1, 0])).toEqual({ exact: 0, near: 4 })
    expect(score([0, 0, 1, 1], [0, 1, 0, 2])).toEqual({ exact: 1, near: 2 })
    expect(score([1, 2, 3, 4], [1, 1, 1, 1])).toEqual({ exact: 1, near: 0 })
  })

  it('ice drift slides to the wall and BFS finds par', async () => {
    const { slide, solve } = await import('./iceDrift')
    const p = { w: 3, h: 3, rocks: [], start: 0, goal: 8, par: 0 }
    expect(slide(p, 0, 1)).toBe(2)
    expect(solve(p)).toBe(2)
    expect(solve({ ...p, goal: 4 })).toBe(-1)
  })

  it('turn or mirror only uses shapes whose mirror is a different shape', async () => {
    const { chiral } = await import('./turnMirror')
    expect(chiral([[0, 0], [1, 0], [2, 0], [2, 1]])).toBe(true) // L tetromino
    expect(chiral([[0, 0], [1, 0], [2, 0], [1, 1]])).toBe(false) // T tetromino
  })

  it('rule flip maps each rule to the right button', async () => {
    const { leftIsRight } = await import('./ruleFlip')
    expect(leftIsRight({ n: 3, rule: 'parity' })).toBe(true)
    expect(leftIsRight({ n: 8, rule: 'parity' })).toBe(false)
    expect(leftIsRight({ n: 3, rule: 'size' })).toBe(true)
    expect(leftIsRight({ n: 7, rule: 'size' })).toBe(false)
  })
})

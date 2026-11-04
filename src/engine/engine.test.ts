import { describe, expect, it } from 'vitest'
import { SESSION_HARD_CAP_MS } from '../config'
import { CATALOG, catalogEntry } from '../games/catalog'
import { addDays } from '../lib/clock'
import { bonusRound, compose, coreIdsOf, recentCore, weakestRound } from './composer'
import { RNG } from '../lib/rng'
import { addActive, applyFreezes, effectiveNow, endMission, finishRound, isLocked, markCompleted, streakLength, timeLeftMs } from './lock'
import { Staircase, defaultRatings, expected, targetDifficulty, updateRating } from './ratings'
import { dueItems, newSrs, review } from './srs'
import { defaultSettings, type DayRecord, type Profile } from './types'

const base = { ratings: defaultRatings(), coreHistory: {}, explainerId: 'duverger' }

function profile(): Profile {
  return {
    version: 1,
    highWater: 0,
    ratings: defaultRatings(),
    roundsPlayed: {},
    ratingHistory: [],
    srs: {},
    seenCards: [],
    logbook: [],
    completedDates: [],
    freezes: 0,
    frozenDates: [],
    coreHistory: {},
    settings: defaultSettings(),
    installHintSeen: false,
  }
}

describe('composer', () => {
  it('same date gives the same session', () => {
    expect(compose({ ...base, date: '2026-11-02' })).toEqual(compose({ ...base, date: '2026-11-02' }))
  })

  it('has the right shape and no duplicate core categories', () => {
    for (let i = 0; i < 400; i++) {
      const date = addDays('2026-01-01', i)
      const plan = compose({ ...base, date })
      const phases = plan.map((r) => r.phase)
      expect(phases[0]).toBe('warmup')
      expect(phases.at(-1)).toBe('boss')
      const core = plan.filter((r) => r.phase === 'core')
      expect(core.length).toBe(4)
      expect(new Set(core.map((r) => r.category)).size).toBe(4)
      const ids = plan.filter((r) => catalogEntry(r.gameId)).map((r) => r.gameId)
      expect(new Set(ids).size).toBe(ids.length)
      expect(catalogEntry(plan[0].gameId)!.category).toBe('reflex')
      expect(catalogEntry(plan.at(-1)!.gameId)!.boss).toBe(true)
    }
  })

  it('holds the 2-day no-repeat rule over 2 years, with skewed ratings', () => {
    const history: Record<string, string[]> = {}
    const ratings = { ...defaultRatings(), logic: 700, stem: 760, riddle: 820 }
    for (let i = 0; i < 730; i++) {
      const date = addDays('2026-12-20', i)
      const plan = compose({ ...base, ratings, coreHistory: history, date })
      const core = coreIdsOf(plan)
      const recent = recentCore(date, history)
      for (const id of core) expect(recent.has(id), `${date} ${id}`).toBe(false)
      expect(core.length).toBe(4)
      history[date] = core
    }
  })

  it('works across month and year boundaries', () => {
    for (const d of ['2026-12-31', '2027-01-01', '2028-02-29', '2028-03-01']) {
      expect(compose({ ...base, date: d }).length).toBeGreaterThan(5)
    }
  })

  it('puts the explainer before the boss, and drops it when none is left', () => {
    const plan = compose({ ...base, date: '2026-11-02' })
    expect(plan.at(-2)!.phase).toBe('explainer')
    expect(plan.at(-2)!.items).toEqual(['duverger'])
    expect(compose({ ...base, date: '2026-11-02', explainerId: null }).some((r) => r.phase === 'explainer')).toBe(false)
  })

  it('different players get different mixes on the same day', () => {
    const a = compose({ ...base, date: '2026-11-02', salt: 'p1' }).map((r) => r.gameId)
    const sets = new Set([a.join(), ...['p2', 'p3', 'p4', 'p5'].map((s) => compose({ ...base, date: '2026-11-02', salt: s }).map((r) => r.gameId).join())])
    expect(sets.size).toBeGreaterThan(1)
  })

  it('brings back the weakest game from yesterday as a rematch', () => {
    const res = [
      { gameId: 'aliens', phase: 'core', score: 0.4 },
      { gameId: 'fuel-mix', phase: 'core', score: 0.9 },
      { gameId: 'void-beast', phase: 'boss', score: 0.6 },
    ]
    const w = weakestRound(res)!
    expect(w.gameId).toBe('aliens')
    const plan = compose({ ...base, date: '2026-11-03', rematch: w, coreHistory: { '2026-11-02': ['aliens'] } })
    const core = plan.filter((r) => r.phase === 'core')
    expect(core[0].gameId).toBe('aliens')
    expect(core[0].note).toMatch(/Rematch/)
    expect(new Set(core.map((r) => r.category)).size).toBe(core.length)
    expect(weakestRound([{ gameId: 'aliens', phase: 'core', score: 0.9 }])).toBeNull()
  })

  it('bonus rounds never repeat the last game', () => {
    const r = new RNG('bonus')
    for (let i = 0; i < 200; i++) expect(bonusRound(defaultRatings(), 'aliens', r).gameId).not.toBe('aliens')
  })

  it('a new player starts at a real challenge', () => {
    const plan = compose({ ...base, date: '2026-11-02' })
    const core = plan.filter((r) => r.phase === 'core')
    for (const r of core) expect(r.difficulty).toBeGreaterThan(0.45)
    expect(plan.at(-1)!.difficulty).toBeGreaterThan(0.7)
  })

  it('every catalog game can appear', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 300; i++) for (const r of compose({ ...base, date: addDays('2026-01-01', i) })) seen.add(r.gameId)
    for (const g of CATALOG) expect(seen.has(g.id), g.id).toBe(true)
  })
})

function day(date: string, rounds = 3): DayRecord {
  return {
    date,
    seed: 's',
    plan: Array.from({ length: rounds }, () => ({ phase: 'core' as const, gameId: 'x', category: 'logic' as const, difficulty: 0.5, seed: 's' })),
    index: 0,
    results: [],
    activeMs: 0,
    completed: false,
    capped: false,
    startedAt: 0,
    inRound: false,
  }
}
const rec = { gameId: 'x', phase: 'core' as const, category: 'logic' as const, score: 1, correct: 1, total: 1, ms: 1 }

describe('lock', () => {
  it('counts active time and ignores suspended gaps', () => {
    const d = day('2026-11-02')
    addActive(d, 1000)
    addActive(d, 60_000)
    addActive(d, -5)
    addActive(d, NaN)
    expect(d.activeMs).toBe(6000)
  })

  it('finishing the planned rounds allows extra play; the player or the cap ends it', () => {
    const d = day('2026-11-02', 2)
    finishRound(d, rec, '2026-11-02')
    finishRound(d, rec, '2026-11-02')
    expect(d.planDone).toBe(true)
    expect(isLocked(d, '2026-11-02')).toBe(false)
    endMission(d)
    expect(isLocked(d, '2026-11-02')).toBe(true)
    expect(isLocked(d, '2026-11-03')).toBe(false)
  })

  it('the time cap ends a mission during bonus rounds', () => {
    const d = day('2026-11-02', 1)
    finishRound(d, rec, '2026-11-02')
    d.plan.push({ ...d.plan[0] })
    d.activeMs = SESSION_HARD_CAP_MS + 1
    finishRound(d, rec, '2026-11-02')
    expect(d.completed && d.capped).toBe(true)
    expect(timeLeftMs(d)).toBe(0)
  })

  it('cap mid-round finishes that round then ends', () => {
    const d = day('2026-11-02', 5)
    d.activeMs = SESSION_HARD_CAP_MS + 10
    expect(d.completed).toBe(false)
    finishRound(d, rec, '2026-11-02')
    expect(d.completed && d.capped).toBe(true)
    expect(d.results.length).toBe(1)
  })

  it('a stale tab across midnight ends the old session at the next round end', () => {
    const d = day('2026-11-02', 5)
    finishRound(d, rec, '2026-11-03')
    expect(d.completed).toBe(true)
    expect(isLocked(d, '2026-11-03')).toBe(false)
  })

  it('resume keeps the index (persisted record is the same object shape)', () => {
    const d = day('2026-11-02', 4)
    finishRound(d, rec, '2026-11-02')
    const reloaded: DayRecord = JSON.parse(JSON.stringify(d))
    expect(reloaded.index).toBe(1)
    expect(reloaded.completed).toBe(false)
  })

  it('clock moved backwards keeps the high-water time', () => {
    const p = profile()
    p.highWater = new Date(2026, 10, 3, 1).getTime()
    const n = effectiveNow({ now: () => new Date(2026, 10, 2, 23).getTime() }, p)
    expect(n.rewound).toBe(true)
    expect(n.date).toBe('2026-11-03')
  })

  it('midnight rollover changes the date', () => {
    const p = profile()
    expect(effectiveNow({ now: () => new Date(2026, 10, 2, 23, 59, 59).getTime() }, p).date).toBe('2026-11-02')
    expect(effectiveNow({ now: () => new Date(2026, 10, 3, 0, 0, 0).getTime() }, p).date).toBe('2026-11-03')
  })

  it('streaks and freezes', () => {
    const p = profile()
    for (let i = 0; i < 7; i++) markCompleted(p, addDays('2026-11-01', i))
    expect(p.freezes).toBe(1)
    expect(streakLength(p, '2026-11-07')).toBe(7)
    // Miss 11-08, return 11-09.
    applyFreezes(p, '2026-11-09')
    expect(p.frozenDates).toEqual(['2026-11-08'])
    markCompleted(p, '2026-11-09')
    expect(streakLength(p, '2026-11-09')).toBe(8)
  })
})

describe('ratings', () => {
  it('expected is 0.5 at equal ratings', () => {
    expect(expected(1000, 1000)).toBeCloseTo(0.5)
  })

  it('target difficulty predicts the target success rate', () => {
    const d = targetDifficulty(1200)
    expect(expected(1200, 250 + d * 1000)).toBeCloseTo(0.775, 2)
  })

  it('ratings move toward performance', () => {
    expect(updateRating(1000, 0.3, 1, 10)).toBeGreaterThan(1000)
    expect(updateRating(1000, 0.3, 0, 10)).toBeLessThan(1000)
  })

  it('1-up/3-down staircase', () => {
    const s = new Staircase(5, 1, 0, 10, 3)
    s.record(true)
    s.record(true)
    expect(s.level).toBe(5)
    s.record(true)
    expect(s.level).toBe(6)
    s.record(false)
    expect(s.level).toBe(5)
    expect(s.reversals).toBe(1)
  })
})

describe('srs', () => {
  it('first review is tomorrow', () => {
    expect(newSrs('2026-12-31').due).toBe('2027-01-01')
  })

  it('SM-2 intervals 1, 6, then ×EF', () => {
    let s = newSrs('2026-11-01')
    s = review(s, 5, '2026-11-02')
    expect(s.interval).toBe(1)
    s = review(s, 5, '2026-11-03')
    expect(s.interval).toBe(6)
    s = review(s, 5, '2026-11-09')
    // EF was 2.7 going into the third review: round(6 × 2.7) = 16.
    expect(s.interval).toBe(16)
    const f = review(s, 1, '2026-12-01')
    expect(f.interval).toBe(1)
    expect(f.reps).toBe(0)
    expect(f.ef).toBeGreaterThanOrEqual(1.3)
  })

  it('due items sorted and capped', () => {
    const all = { b: { ...newSrs('2026-11-01') }, a: { ...newSrs('2026-11-01') }, c: { ...newSrs('2026-11-10') } }
    expect(dueItems(all, '2026-11-02', 5)).toEqual(['a', 'b'])
  })
})

describe('migration of old saved missions', () => {
  it('turns star-chart into the explainer, drops review, keeps the position', async () => {
    const { migrateDay } = await import('./migrate')
    const old = {
      ...day('2026-11-03', 0),
      index: 3,
      plan: [
        { phase: 'warmup', gameId: 'catch-comet', category: 'reflex', difficulty: 0.3, seed: 's' },
        { phase: 'review', gameId: 'review', category: 'review', difficulty: 0.5, seed: 's' },
        { phase: 'core', gameId: 'aliens', category: 'logic', difficulty: 0.5, seed: 's' },
        { phase: 'card', gameId: 'star-chart', category: 'card', difficulty: 0.5, seed: 's' },
        { phase: 'boss', gameId: 'void-beast', category: 'maze', difficulty: 0.7, seed: 's' },
      ],
    } as unknown as DayRecord
    const known = new Set(['catch-comet', 'aliens', 'void-beast', 'explainer'])
    const { day: d, changed } = migrateDay(old, known, 'duverger')
    expect(changed).toBe(true)
    expect(d.plan.map((r) => r.gameId)).toEqual(['catch-comet', 'aliens', 'explainer', 'void-beast'])
    // Two rounds were done before index 3 (warm-up and aliens; review was dropped).
    expect(d.index).toBe(2)
    expect(d.plan[d.index].gameId).toBe('explainer')
    expect(migrateDay(d, known, 'duverger').changed).toBe(false)
  })
})

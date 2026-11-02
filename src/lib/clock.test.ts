import { describe, expect, it } from 'vitest'
import { addDays, formatCountdown, guardedNow, localDateISO, msUntilMidnight, nextLocalMidnight } from './clock'

describe('clock', () => {
  it('formats local dates', () => {
    expect(localDateISO(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05')
  })

  it('next midnight is the start of tomorrow', () => {
    const t = new Date(2026, 11, 31, 18, 30).getTime()
    expect(localDateISO(nextLocalMidnight(t))).toBe('2027-01-01')
    expect(new Date(nextLocalMidnight(t)).getHours()).toBe(0)
    expect(msUntilMidnight(t)).toBe(5.5 * 3600_000)
  })

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
    expect(addDays('2026-11-02', -2)).toBe('2026-10-31')
  })

  it('formats countdown', () => {
    expect(formatCountdown(3_723_000)).toBe('01:02:03')
    expect(formatCountdown(-5)).toBe('00:00:00')
  })

  it('holds the high-water mark when the clock rewinds', () => {
    expect(guardedNow({ now: () => 100 }, 500)).toEqual({ now: 500, rewound: true })
    expect(guardedNow({ now: () => 900 }, 500)).toEqual({ now: 900, rewound: false })
  })
})

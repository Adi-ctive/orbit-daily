import { describe, expect, it } from 'vitest'
import { PALETTE_HEX } from '../palette'
import { ICONS } from './icons'
import { mascotFrame, type Mood } from './mascot'

describe('sprites', () => {
  it('icons are 12×12 with only known chars', () => {
    for (const [name, s] of Object.entries(ICONS)) {
      expect(s.rows.length, name).toBe(12)
      for (const row of s.rows) {
        expect(row.length, `${name}: "${row}"`).toBe(12)
        for (const ch of row) expect(ch === '.' || ch in s.key, `${name} char ${ch}`).toBe(true)
      }
      for (const c of Object.values(s.key)) expect(PALETTE_HEX).toContain(c)
    }
  })

  it('mascot frames render with an outline and stay in the palette', () => {
    const moods: Mood[] = ['idle', 'blink', 'happy', 'sad', 'cheer', 'sleep']
    for (const m of moods) {
      const f = mascotFrame(m, 0)
      expect(f.data.length).toBe(48 * 48)
      expect(f.data.some((v) => v === 1)).toBe(true)
      for (const c of f.colors.slice(1)) expect(PALETTE_HEX).toContain(c)
    }
  })

  it('palette has about 48 colours', () => {
    expect(PALETTE_HEX.length).toBeGreaterThanOrEqual(44)
    expect(PALETTE_HEX.length).toBeLessThanOrEqual(52)
  })
})

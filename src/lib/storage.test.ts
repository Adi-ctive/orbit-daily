import { beforeEach, describe, expect, it } from 'vitest'
import { _resetStorageForTests, load, remove, save } from './storage'

describe('storage', () => {
  beforeEach(() => _resetStorageForTests())

  it('round-trips values', async () => {
    await save('k', { a: 1 })
    expect(await load('k', null)).toEqual({ a: 1 })
  })

  it('returns fallback for missing keys', async () => {
    expect(await load('missing', 42)).toBe(42)
  })

  it('removes values', async () => {
    await save('r', 1)
    await remove('r')
    expect(await load('r', 'gone')).toBe('gone')
  })
})

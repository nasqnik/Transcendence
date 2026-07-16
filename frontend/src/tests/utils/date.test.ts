import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { localDateStr, todayStr, dateStrFromToday } from '../../utils/date'

describe('localDateStr', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(localDateStr(new Date(2024, 5, 3))).toBe('2024-06-03')
  })

  it('zero-pads single-digit months and days', () => {
    expect(localDateStr(new Date(2024, 0, 5))).toBe('2024-01-05')
  })

  it('uses the local date, not UTC', () => {
    // 2024-01-15 at 23:30 local time. In a UTC+ timezone this moment is
    // already Jan 16 UTC, so toISOString().slice(0,10) would return '2024-01-16'.
    // Our function must return the local calendar day instead.
    const d = new Date(2024, 0, 15, 23, 30, 0)
    expect(localDateStr(d)).toBe('2024-01-15')
  })
})

describe('todayStr', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns today as YYYY-MM-DD', () => {
    vi.setSystemTime(new Date(2024, 2, 8, 12, 0, 0))
    expect(todayStr()).toBe('2024-03-08')
  })
})

describe('dateStrFromToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 2, 8, 12, 0, 0)) // Mar 8 2024
  })
  afterEach(() => vi.useRealTimers())

  it('returns today for offset 0', () => {
    expect(dateStrFromToday(0)).toBe('2024-03-08')
  })

  it('returns tomorrow for offset +1', () => {
    expect(dateStrFromToday(1)).toBe('2024-03-09')
  })

  it('returns yesterday for offset -1', () => {
    expect(dateStrFromToday(-1)).toBe('2024-03-07')
  })

  it('crosses month boundaries correctly', () => {
    expect(dateStrFromToday(23)).toBe('2024-03-31')
    expect(dateStrFromToday(24)).toBe('2024-04-01')
  })

  it('crosses year boundaries correctly', () => {
    vi.setSystemTime(new Date(2024, 11, 30, 12, 0, 0)) // Dec 30 2024
    expect(dateStrFromToday(2)).toBe('2025-01-01')
  })
})

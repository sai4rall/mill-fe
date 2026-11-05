import { describe, it, expect } from 'vitest'
import { todayISO, isFutureDate } from './dates'

describe('dates', () => {
  const now = new Date(2026, 10, 5, 23, 59) // 5 Nov 2026, local
  it('formats the local date', () => expect(todayISO(now)).toBe('2026-11-05'))
  it('flags only dates after today', () => {
    expect(isFutureDate('2026-11-06', now)).toBe(true)
    expect(isFutureDate('2026-11-05', now)).toBe(false)
    expect(isFutureDate('2025-01-01', now)).toBe(false)
    expect(isFutureDate('', now)).toBe(false)
  })
})

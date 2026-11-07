import { describe, it, expect } from 'vitest'
import { compact, date, day, daysAgo, money, num, qty, statusLabel } from './numbers'

describe('v4 number and date formatting', () => {
  it('groups digits the Indian way', () => {
    expect(num(1234567.5)).toBe('12,34,567.50')
    expect(num(99999, 0)).toBe('99,999')
    expect(qty(1240.5)).toBe('1,240.50 Qtl')
    expect(money(184300)).toBe('₹1,84,300.00')
    expect(money(-2000)).toBe('−₹2,000.00')
    expect(num(null)).toBe('—')
  })
  it('compacts with L and Cr instead of truncating', () => {
    expect(compact(167000)).toBe('1.67 L')
    expect(compact(25000000)).toBe('2.5 Cr')
    expect(compact(-16656.7)).toBe('−16.66 K')
    expect(compact(950)).toBe('950')
  })
  it('formats dates for people', () => {
    const now = new Date(2026, 10, 8, 10, 0)
    expect(date('2026-11-08')).toBe('8 Nov 2026')
    expect(day('2026-11-08', now)).toBe('Today')
    expect(day('2026-11-07', now)).toBe('Yesterday')
    expect(day('2026-10-02', now)).toBe('2 Oct')
    expect(day('2025-10-02', now)).toBe('2 Oct 2025')
    expect(daysAgo('2026-11-01', now)).toBe(7)
  })
  it('uses sentence case for statuses', () => {
    expect(statusLabel('IN_PROGRESS')).toBe('In progress')
    expect(statusLabel('PAID')).toBe('Paid')
  })
})

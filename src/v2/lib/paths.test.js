import { describe, it, expect } from 'vitest'
import { v2, v2HomeFor } from './paths'
import { today } from '../../shared/utils/format'

describe('v2 paths', () => {
  it('builds /v2 paths', () => {
    expect(v2('/farmers')).toBe('/v2/farmers')
    expect(v2('farmers')).toBe('/v2/farmers')
    expect(v2('')).toBe('/v2')
  })
  it.each([['DEV_ADMIN', '/v2/dev'], ['SUPER_ADMIN', '/v2/admin'], ['MILL_ADMIN', '/v2/dashboard'], ['MILL_OPERATOR', '/v2/dashboard']])(
    '%s lands on %s', (role, path) => expect(v2HomeFor(role)).toBe(path))
})

describe('today()', () => {
  it('uses the local date, not UTC', () => {
    // 00:30 local on 5 Nov is still 5 Nov locally even where UTC is the previous day.
    expect(today(new Date(2026, 10, 5, 0, 30))).toBe('2026-11-05')
  })
})

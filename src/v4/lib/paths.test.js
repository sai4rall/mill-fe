import { describe, it, expect } from 'vitest'
import { v4, v4HomeFor } from './paths'

describe('v4 paths', () => {
  it('prefixes paths with /v4', () => {
    expect(v4('/farmers')).toBe('/v4/farmers')
    expect(v4('farmers')).toBe('/v4/farmers')
    expect(v4('')).toBe('/v4')
  })
  it('sends each role to its home', () => {
    expect(v4HomeFor('DEV_ADMIN')).toBe('/v4/dev')
    expect(v4HomeFor('SUPER_ADMIN')).toBe('/v4/admin')
    expect(v4HomeFor('MILL_ADMIN')).toBe('/v4/dashboard')
    expect(v4HomeFor('MILL_OPERATOR')).toBe('/v4/dashboard')
  })
})

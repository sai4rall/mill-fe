import { describe, it, expect } from 'vitest'
import { v3, v3HomeFor } from './paths'

describe('v3 paths', () => {
  it('prefixes paths with /v3', () => {
    expect(v3('/farmers')).toBe('/v3/farmers')
    expect(v3('farmers')).toBe('/v3/farmers')
    expect(v3('')).toBe('/v3')
  })
  it('sends each role to its home', () => {
    expect(v3HomeFor('DEV_ADMIN')).toBe('/v3/dev')
    expect(v3HomeFor('SUPER_ADMIN')).toBe('/v3/admin')
    expect(v3HomeFor('MILL_ADMIN')).toBe('/v3/dashboard')
    expect(v3HomeFor('MILL_OPERATOR')).toBe('/v3/dashboard')
  })
})

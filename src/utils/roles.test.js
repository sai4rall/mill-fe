import { describe, it, expect } from 'vitest'
import { homePathFor } from './roles'

describe('homePathFor', () => {
  it.each([
    ['DEV_ADMIN', '/dev'],
    ['SUPER_ADMIN', '/admin'],
    ['MILL_ADMIN', '/dashboard'],
    ['MILL_OPERATOR', '/dashboard'],
  ])('%s → %s', (role, path) => expect(homePathFor(role)).toBe(path))
})

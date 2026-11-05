import { describe, it, expect } from 'vitest'
import { logoFileError, validateSuperAdmin } from './devValidation'

const file = (type, size) => ({ type, size })

describe('logoFileError', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])('accepts %s', (type) => {
    expect(logoFileError(file(type, 1000))).toBeNull()
  })
  it.each(['image/svg+xml', 'image/gif', 'application/pdf', ''])('rejects %j', (type) => {
    expect(logoFileError(file(type, 1000))).toBe('Logo must be a PNG, JPEG or WebP image')
  })
  it('accepts exactly 1 MB and rejects larger', () => {
    expect(logoFileError(file('image/png', 1024 * 1024))).toBeNull()
    expect(logoFileError(file('image/png', 1024 * 1024 + 1))).toBe('Logo must be 1 MB or smaller')
  })
})

describe('validateSuperAdmin', () => {
  it.each(['ops', 'ops_admin', 'ops.admin-2', ' ops '])('accepts username %j', (username) => {
    expect(validateSuperAdmin({ username, fullName: '' })).toEqual({})
  })
  it('requires a username', () => {
    expect(validateSuperAdmin({ username: '  ', fullName: '' }).username).toBe('Username is required')
  })
  it.each(['ab', 'ops admin', 'ops@admin', 'a'.repeat(51)])('rejects username %j', (username) => {
    expect(validateSuperAdmin({ username, fullName: '' }).username).toMatch(/3-50 characters/)
  })
  it('limits full name to 100 characters', () => {
    expect(validateSuperAdmin({ username: 'ops', fullName: 'x'.repeat(100) })).toEqual({})
    expect(validateSuperAdmin({ username: 'ops', fullName: 'x'.repeat(101) }).fullName).toMatch(/at most 100/)
  })
})

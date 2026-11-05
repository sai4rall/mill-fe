import { describe, it, expect } from 'vitest'
import { validatePasswordChange, passwordServerErrors } from './passwordPolicy'

const ok = { currentPassword: 'OldPass123', newPassword: 'NewPass456', confirmPassword: 'NewPass456' }

describe('validatePasswordChange', () => {
  it('accepts a valid change', () => {
    expect(validatePasswordChange(ok, 'ramesh')).toEqual({})
  })
  it('requires every field', () => {
    expect(validatePasswordChange({})).toEqual({
      currentPassword: 'Current password is required',
      newPassword: 'New password is required',
      confirmPassword: 'Please re-enter the new password',
    })
  })
  it.each([
    ['abc12', 'New password must be 8-64 characters'],
    ['a1'.repeat(32) + 'x', 'New password must be 8-64 characters'],
    ['onlyletters', 'New password needs at least one letter and one digit, and no spaces'],
    ['12345678', 'New password needs at least one letter and one digit, and no spaces'],
    ['has space1', 'New password needs at least one letter and one digit, and no spaces'],
    ['OldPass123', 'New password must be different from the current password'],
    ['x1RAMESHx', 'New password must not contain your username'],
  ])('rejects %s', (pw, msg) => {
    expect(validatePasswordChange({ ...ok, newPassword: pw, confirmPassword: pw }, 'ramesh').newPassword).toBe(msg)
  })
  it('accepts exactly 64 characters', () => {
    const pw = 'a1'.repeat(32)
    expect(validatePasswordChange({ ...ok, newPassword: pw, confirmPassword: pw })).toEqual({})
  })
  it('requires the confirmation to match', () => {
    expect(validatePasswordChange({ ...ok, confirmPassword: 'NewPass457' }).confirmPassword).toBe('Passwords do not match')
  })
})

describe('passwordServerErrors', () => {
  it('passes field errors through', () => {
    expect(passwordServerErrors({ response: { data: { fields: { newPassword: 'bad' } } } })).toEqual({ newPassword: 'bad' })
  })
  it('puts a wrong current password on that field', () => {
    expect(passwordServerErrors({ response: { data: { error: 'Current password is incorrect' } } }))
      .toEqual({ currentPassword: 'Current password is incorrect' })
  })
  it('puts new-password rule errors on that field', () => {
    expect(passwordServerErrors({ response: { data: { error: 'New password must not contain your username' } } }))
      .toEqual({ newPassword: 'New password must not contain your username' })
  })
  it('falls back to a form error', () => {
    expect(passwordServerErrors(new Error('Network Error'))).toEqual({ form: 'Network Error' })
  })
})

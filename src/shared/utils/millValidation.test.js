import { describe, it, expect } from 'vitest'
import { millPayload, validateMill } from './millValidation'

const valid = { name: 'Sri Lakshmi Mill', location: 'Nalgonda', contactPhone: '9876543210', contactEmail: '', adminUsername: 'lakshmi_admin', adminFullName: 'Lakshmi Rao' }

describe('validateMill', () => {
  it('accepts a complete form; email is optional', () => expect(validateMill(valid)).toEqual({}))
  it('requires every mandatory field', () => {
    expect(Object.keys(validateMill({}))).toEqual(['name', 'location', 'contactPhone', 'adminUsername', 'adminFullName'])
  })
  it('checks phone, email, username and full name formats', () => {
    const e = validateMill({ ...valid, contactPhone: '12345', contactEmail: 'nope', adminUsername: 'a b', adminFullName: 'R2' })
    expect(e).toEqual({
      contactPhone: 'Enter a valid 10-digit mobile number', contactEmail: 'Enter a valid email address',
      adminUsername: 'Admin username must be 3-50 characters: letters, digits, . _ -',
      adminFullName: "Admin full name can contain only letters, spaces and . ' -",
    })
  })
  it('trims values and sends a blank email as null', () => {
    expect(millPayload({ ...valid, name: '  Sri   Lakshmi Mill ', contactEmail: ' ' })).toMatchObject({ name: 'Sri Lakshmi Mill', contactEmail: null })
  })
})

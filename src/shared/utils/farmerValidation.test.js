import { describe, it, expect } from 'vitest'
import { validateFarmer, normalizeFarmer, serverFieldErrors, MESSAGES } from './farmerValidation'

const valid = {
  name: 'Ramesh Kumar',
  phone: '9876543210',
  address: '12-3, Main Road, Nalgonda',
  bankAccount: '123456789012',
  bankName: 'State Bank of India',
  ifscCode: 'SBIN0001234',
}
const errorsWith = (patch, opts) => validateFarmer({ ...valid, ...patch }, opts)

describe('validateFarmer', () => {
  it('accepts a fully valid farmer', () => {
    expect(validateFarmer(valid)).toEqual({})
  })

  it('accepts name + phone only (all optional fields empty)', () => {
    expect(validateFarmer({ name: 'Ramesh', phone: '9876543210', address: '', bankAccount: '', bankName: '', ifscCode: '' })).toEqual({})
  })

  describe('name', () => {
    it.each(['', '   ', undefined])('is required (%j)', (name) => {
      expect(errorsWith({ name }).name).toBe(MESSAGES.nameRequired)
    })
    it.each(['Ra', 'K. Ramesh', "D'Souza", 'Anne-Marie', 'రమేష్ కుమార్', 'रमेश', 'A'.repeat(100)])('accepts %s', (name) => {
      expect(errorsWith({ name }).name).toBeUndefined()
    })
    it('rejects a single character', () => {
      expect(errorsWith({ name: 'R' }).name).toBe(MESSAGES.nameLength)
    })
    it('rejects more than 100 characters', () => {
      expect(errorsWith({ name: 'A'.repeat(101) }).name).toBe(MESSAGES.nameLength)
    })
    it.each(['Ramesh1', 'Ramesh@', '<script>', 'Ram_esh', '.Ramesh', '-Ramesh'])('rejects %s', (name) => {
      expect(errorsWith({ name }).name).toBe(MESSAGES.nameChars)
    })
    it('counts length after trimming and collapsing spaces', () => {
      expect(errorsWith({ name: '  R  ' }).name).toBe(MESSAGES.nameLength)
    })
  })

  describe('phone', () => {
    it.each(['', '  '])('is required for a new farmer (%j)', (phone) => {
      expect(errorsWith({ phone }).phone).toBe(MESSAGES.phoneRequired)
    })
    it.each(['9876543210', '+91 98765 43210', '919876543210', '09876543210', '98765-43210'])('accepts %s', (phone) => {
      expect(errorsWith({ phone }).phone).toBeUndefined()
    })
    it.each(['12345', '5876543210', '98765432101', '98765abcde', '+1 9876543210'])('rejects %s', (phone) => {
      expect(errorsWith({ phone }).phone).toBe(MESSAGES.phoneInvalid)
    })
    it('is not checked when editing with an unchanged number', () => {
      expect(errorsWith({ phone: '12345' }, { requirePhone: false }).phone).toBeUndefined()
      expect(errorsWith({ phone: '' }, { requirePhone: false }).phone).toBeUndefined()
    })
  })

  describe('address', () => {
    it('is optional', () => {
      expect(errorsWith({ address: '' }).address).toBeUndefined()
    })
    it('accepts exactly 500 characters', () => {
      expect(errorsWith({ address: 'a'.repeat(500) }).address).toBeUndefined()
    })
    it('rejects more than 500 characters', () => {
      expect(errorsWith({ address: 'a'.repeat(501) }).address).toBe(MESSAGES.addressLength)
    })
  })

  describe('bank account', () => {
    it.each(['123456789', '123456789012345678', '0012 3456 7890'])('accepts %s', (bankAccount) => {
      expect(errorsWith({ bankAccount }).bankAccount).toBeUndefined()
    })
    it.each(['12345678', '1234567890123456789', '12345ABC90', '1234-5678-90'])('rejects %s', (bankAccount) => {
      expect(errorsWith({ bankAccount }).bankAccount).toBe(MESSAGES.bankAccount)
    })
  })

  describe('bank name', () => {
    it.each(['SBI', 'HDFC Bank Ltd.', 'Punjab & Sind Bank', 'Bank (Rural)'])('accepts %s', (bankName) => {
      expect(errorsWith({ bankName }).bankName).toBeUndefined()
    })
    it('rejects a single character', () => {
      expect(errorsWith({ bankName: 'S' }).bankName).toBe(MESSAGES.bankNameLength)
    })
    it('rejects more than 100 characters', () => {
      expect(errorsWith({ bankName: 'B'.repeat(101) }).bankName).toBe(MESSAGES.bankNameLength)
    })
    it.each(['Bank123', 'Bank@India', '&Bank'])('rejects %s', (bankName) => {
      expect(errorsWith({ bankName }).bankName).toBe(MESSAGES.bankNameChars)
    })
  })

  describe('IFSC', () => {
    it.each(['SBIN0001234', 'HDFC0ABC123', 'sbin0001234', ' SBIN 0001234 '])('accepts %j', (ifscCode) => {
      expect(errorsWith({ ifscCode }).ifscCode).toBeUndefined()
    })
    it.each(['SBIN1001234', 'SBI00001234', 'SBIN000123', 'SBIN00012345', '1BIN0001234', 'SBIN0-01234'])('rejects %s', (ifscCode) => {
      expect(errorsWith({ ifscCode }).ifscCode).toBe(MESSAGES.ifsc)
    })
  })

  describe('bank details together', () => {
    it('all empty is valid', () => {
      expect(errorsWith({ bankAccount: '', bankName: '', ifscCode: '' }).bankDetails).toBeUndefined()
    })
    it.each([
      ['account only', { bankName: '', ifscCode: '' }],
      ['IFSC missing', { ifscCode: '' }],
      ['account missing', { bankAccount: '' }],
      ['bank name only', { bankAccount: '', ifscCode: '' }],
    ])('%s is invalid', (_, patch) => {
      expect(errorsWith(patch).bankDetails).toBe(MESSAGES.bankDetails)
    })
  })
})

describe('normalizeFarmer', () => {
  it('trims, collapses spaces, strips account/IFSC spaces and upper-cases IFSC', () => {
    expect(normalizeFarmer({
      name: '  Ramesh   Kumar ', phone: ' 98765 43210 ', address: '  Village\nRoad  ',
      bankAccount: ' 1234 5678 9012 ', bankName: ' State  Bank ', ifscCode: ' sbin 0001234 ',
    })).toEqual({
      name: 'Ramesh Kumar', type: 'FARMER', phone: '98765 43210', address: 'Village\nRoad',
      bankAccount: '123456789012', bankName: 'State Bank', ifscCode: 'SBIN0001234',
    })
  })
})

describe('serverFieldErrors', () => {
  it('maps bankDetailsComplete to bankDetails and keeps other fields', () => {
    expect(serverFieldErrors({ name: 'bad', bankDetailsComplete: 'together' })).toEqual({ name: 'bad', bankDetails: 'together' })
  })
})

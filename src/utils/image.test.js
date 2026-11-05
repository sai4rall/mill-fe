import { describe, it, expect } from 'vitest'
import { normalizePhone, isValidPhone } from './image'

describe('normalizePhone', () => {
  it.each([
    ['9876543210', '9876543210'],
    ['+919876543210', '9876543210'],
    ['+91 98765 43210', '9876543210'],
    ['919876543210', '9876543210'],
    ['09876543210', '9876543210'],
    ['98765-43210', '9876543210'],
    ['(98765) 43210', '9876543210'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected)
  })
})

describe('isValidPhone', () => {
  it.each(['9876543210', '6000000000', '+91 98765 43210'])('accepts %s', (p) => expect(isValidPhone(p)).toBe(true))
  it.each(['', '12345', '5876543210', '0123456789', '98765432101', '98765abcde'])('rejects %j', (p) => expect(isValidPhone(p)).toBe(false))
})

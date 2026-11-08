import { describe, it, expect } from 'vitest'
import { phoneInput, isMobile } from './phone'

describe('phoneInput', () => {
  it('keeps at most 10 digits', () => {
    expect(phoneInput('98765432109999')).toBe('9876543210')
    expect(phoneInput('98a76-54 32')).toBe('98765432')
  })
  it('drops +91 / 91 / 0 prefixes when pasting a full number', () => {
    expect(phoneInput('+91 98765 43210')).toBe('9876543210')
    expect(phoneInput('919876543210')).toBe('9876543210')
    expect(phoneInput('09876543210')).toBe('9876543210')
  })
  it('recognises valid mobile numbers', () => {
    expect(isMobile('9876543210')).toBe(true)
    expect(isMobile('1234567890')).toBe(false)
    expect(isMobile('987654321')).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { rejectionPayload, validateRejection } from './rejection'

const future = (d) => d > '2026-11-08'
const valid = { rejectionDate: '2026-11-08', truckNumber: 'AP07CD1234', farmerId: '', approxWeightQuintals: '', moisturePct: '', reason: 'HIGH_MOISTURE', notes: '' }

describe('rejected lorry rules', () => {
  it('accepts a minimal entry', () => expect(validateRejection(valid, future)).toEqual({}))
  it('needs date (not future), truck and reason; notes for Other', () => {
    expect(validateRejection({ ...valid, rejectionDate: '' }, future).rejectionDate).toBe('Date is required')
    expect(validateRejection({ ...valid, rejectionDate: '2026-11-09' }, future).rejectionDate).toBe('Date cannot be in the future')
    expect(validateRejection({ ...valid, truckNumber: '  ' }, future).truckNumber).toBe('Truck number is required')
    expect(validateRejection({ ...valid, reason: 'OTHER' }, future).notes).toBe('Describe the reason when it is Other')
    expect(validateRejection({ ...valid, approxWeightQuintals: '0' }, future).approxWeightQuintals).toBeTruthy()
    expect(validateRejection({ ...valid, moisturePct: '101' }, future).moisturePct).toBeTruthy()
  })
  it('builds the request body', () => {
    expect(rejectionPayload({ ...valid, truckNumber: 'ap 07 cd 1234', farmerId: '5', approxWeightQuintals: '12.5', notes: ' wet ' }))
      .toEqual({ rejectionDate: '2026-11-08', truckNumber: 'AP07CD1234', farmerId: 5, approxWeightQuintals: 12.5, moisturePct: null, reason: 'HIGH_MOISTURE', notes: 'wet' })
  })
})

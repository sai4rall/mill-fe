import { describe, it, expect } from 'vitest'
import { gpsKeySummary, shipmentTotals } from './gps'

describe('gps helpers', () => {
  it('summarises the key status', () => {
    expect(gpsKeySummary({ configured: false })).toMatch(/No key yet/)
    expect(gpsKeySummary({ configured: true, createdAt: '2026-11-07T10:00:00' })).toMatch(/^Key active since/)
  })
  it('totals shipments', () => {
    expect(shipmentTotals([{ quintalsExported: 2.5 }, { quintalsExported: '1.25' }])).toEqual({ count: 2, quintals: 3.75 })
    expect(shipmentTotals()).toEqual({ count: 0, quintals: 0 })
  })
})

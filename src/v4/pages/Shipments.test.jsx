import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import Shipments from './Shipments'
import { renderV4 } from '../test/render'

vi.mock('../../shared/api/mill', () => ({
  getAllShipments: vi.fn().mockResolvedValue([
    { id: 2, shipmentDate: '2026-11-07', customerName: 'Lakshmi Traders', riceType: 'Sona', quintalsExported: 4, vehicleNumber: 'AP07CD1234' },
    { id: 1, shipmentDate: '2026-11-05', customerName: 'Gulf Foods', riceType: null, quintalsExported: 1.5, vehicleNumber: null },
  ]),
}))

describe('v4 Shipments', () => {
  it('lists every shipment with its customer', async () => {
    renderV4(<Shipments />)
    expect(await screen.findByText('Lakshmi Traders')).toBeInTheDocument()
    expect(screen.getByText('Gulf Foods')).toBeInTheDocument()
    expect(screen.getByText('AP07CD1234')).toBeInTheDocument()
  })
})

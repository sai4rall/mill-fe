import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../shared/api/mill'
import Money from './Money'
import { renderV4 } from '../test/render'

vi.mock('../../shared/api/mill', () => ({
  getPurchases: vi.fn(), getAllPayments: vi.fn(), getFarmers: vi.fn(), getPayments: vi.fn(), getBranding: vi.fn(),
  createPayment: vi.fn(), sendPaymentOtp: vi.fn(),
}))

beforeEach(() => {
  api.getPurchases.mockResolvedValue([
    { id: 19, farmerId: 11, farmerName: 'SAIKUMAR', purchaseDate: '2026-11-08', weightQuintals: 1000, pricePerQuintal: 32000, totalAmount: 32000000, amountPaid: 0, amountDue: 32000000, paymentStatus: 'PENDING' },
  ])
  api.getAllPayments.mockResolvedValue([])
  api.getFarmers.mockResolvedValue([{ id: 11, name: 'SAIKUMAR', phoneVerified: true }])
  api.getPayments.mockResolvedValue([])
  api.getBranding.mockResolvedValue(null)
})

describe('v4 Money', () => {
  it('lists dues with a Pay button that opens the payment sheet', async () => {
    const u = userEvent.setup()
    renderV4(<Money />)
    await u.click(await screen.findByRole('button', { name: 'Pay SAIKUMAR' }))
    const sheet = await screen.findByRole('dialog')
    expect(sheet).toHaveTextContent('Release payment')
    expect(sheet).toHaveTextContent('₹3,20,00,000.00')
  })
})

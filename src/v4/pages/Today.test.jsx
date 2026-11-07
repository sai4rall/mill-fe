import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import * as api from '../../shared/api/mill'
import Today from './Today'
import { renderV4 } from '../test/render'

const auth = vi.hoisted(() => ({ user: null }))
vi.mock('../../shared/context/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }))
vi.mock('../../shared/features/useFeatures', () => ({ useFeatures: () => ({ flag: () => ({ showInMenu: true, enabled: true }) }) }))
vi.mock('../../shared/api/mill', () => ({
  getStock: vi.fn(), getPurchases: vi.fn(), getAllPayments: vi.fn(), getBatches: vi.fn(), getFarmers: vi.fn(), getOrders: vi.fn(),
}))

const iso = (ago) => { const d = new Date(); d.setDate(d.getDate() - ago); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

beforeEach(() => {
  api.getStock.mockResolvedValue({ paddyOnHand: 100, paddyInMill: 20, riceOnHand: 30 })
  api.getPurchases.mockResolvedValue([
    { id: 1, farmerId: 1, farmerName: 'Ravi', purchaseDate: iso(0), weightQuintals: 10, totalAmount: 20000, amountDue: 20000, paymentStatus: 'PENDING' },
    { id: 2, farmerId: 2, farmerName: 'Sita', purchaseDate: iso(12), weightQuintals: 5, totalAmount: 10000, amountDue: 4000, paymentStatus: 'PARTIAL' },
  ])
  api.getAllPayments.mockResolvedValue([])
  api.getBatches.mockResolvedValue([{ id: 7, status: 'IN_PROGRESS', batchDate: iso(4), paddyInputQuintals: 50 }])
  api.getFarmers.mockResolvedValue([{ id: 1, name: 'Ravi', phoneVerified: false }, { id: 2, name: 'Sita', phoneVerified: true }])
  api.getOrders.mockResolvedValue([{ id: 3, status: 'PENDING', quantityQuintals: 80, shippedQuintals: 0 }])
})

describe('v4 Today', () => {
  it('greets the admin by full name and lists what needs attention', async () => {
    auth.user = { username: 'admin1', fullName: 'Ramesh Rao', role: 'MILL_ADMIN' }
    renderV4(<Today />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ramesh Rao')
    expect(await screen.findByText('1 purchase unpaid for over 7 days')).toBeInTheDocument()
    expect(await screen.findByText('1 batch running for more than 2 days')).toBeInTheDocument()
    expect(screen.getByText('1 farmer with dues has no verified mobile')).toBeInTheDocument()
    expect(screen.getByText('Open orders need more rice than is on hand')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Today' })).toHaveAttribute('aria-checked', 'true')
  })

  it('shows operators their entries for today', async () => {
    auth.user = { username: 'op1', fullName: 'Kiran', role: 'MILL_OPERATOR' }
    renderV4(<Today />)
    expect(await screen.findByText('Ravi')).toBeInTheDocument()
    expect(screen.queryByText('Sita')).toBeNull()
    expect(screen.queryByText('Needs attention')).toBeNull()
  })
})

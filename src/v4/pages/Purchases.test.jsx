import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../shared/api/mill'
import Purchases from './Purchases'
import { RecordPurchaseProvider } from '../shell/RecordPurchase'
import { asPhone, renderV4 } from '../test/render'

vi.mock('../../shared/context/AuthContext', () => ({ useAuth: () => ({ user: { username: 'a', role: 'MILL_ADMIN' } }) }))
vi.mock('../../shared/features/useFeatures', () => ({ useFeatures: () => ({ flag: (k) => ({ showInMenu: true, enabled: k !== 'moisture_deduction' }) }) }))
vi.mock('../../shared/api/mill', () => ({
  getPurchases: vi.fn(), getFarmers: vi.fn(), createPurchase: vi.fn(), getPayments: vi.fn(), getBranding: vi.fn(), createPayment: vi.fn(), sendPaymentOtp: vi.fn(),
}))

const iso = (ago) => { const d = new Date(); d.setDate(d.getDate() - ago); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  api.getFarmers.mockResolvedValue([{ id: 1, name: 'Ravi', phoneVerified: true }])
  api.getPayments.mockResolvedValue([])
  api.getBranding.mockResolvedValue({ millName: 'Sri Lakshmi Mill' })
  api.getPurchases.mockResolvedValue([
    { id: 1, farmerId: 1, farmerName: 'Ravi', purchaseDate: iso(0), weightQuintals: 10, pricePerQuintal: 2000, totalAmount: 1234567.5, amountPaid: 0, amountDue: 1234567.5, paymentStatus: 'PENDING', truckNumber: 'AP07CD1234' },
    { id: 2, farmerId: 1, farmerName: 'Sita', purchaseDate: iso(20), weightQuintals: 5, pricePerQuintal: 2000, totalAmount: 10000, amountPaid: 10000, amountDue: 0, paymentStatus: 'PAID' },
  ])
})

describe('v4 Purchases', () => {
  it('shows exact Indian-grouped amounts and Pay only where money is due', async () => {
    renderV4(<Purchases />)
    const table = await screen.findByRole('grid', { name: 'Purchases' })
    expect(within(table).getAllByText('₹12,34,567.50').length).toBeGreaterThan(0)
    expect(within(table).getByRole('button', { name: 'Pay Ravi' })).toBeInTheDocument()
    expect(within(table).queryByRole('button', { name: 'Pay Sita' })).toBeNull()
    expect(within(table).getByText('Today')).toBeInTheDocument()
  })

  it('filters by status, period and search, and remembers the view', async () => {
    const u = userEvent.setup()
    const { unmount } = renderV4(<Purchases />)
    const table = await screen.findByRole('grid', { name: 'Purchases' })
    const status = () => within(screen.getByRole('group', { name: 'Status' }))
    const period = () => within(screen.getByRole('group', { name: 'Period' }))
    await u.click(status().getByRole('button', { name: /^Paid/ }))
    expect(within(table).queryByText('Ravi')).toBeNull()
    expect(within(table).getByText('Sita')).toBeInTheDocument()
    await u.click(status().getByRole('button', { name: /^All/ }))
    await u.click(period().getByRole('button', { name: '7 days' }))
    expect(within(table).queryByText('Sita')).toBeNull()
    unmount()

    renderV4(<Purchases />)
    expect(await screen.findByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true')
    await u.type(screen.getByRole('searchbox'), 'ap07')
    expect(screen.getByText('Ravi')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: /Clear filters/ }))
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('opens the purchase sheet with a shareable receipt when a row is clicked', async () => {
    const u = userEvent.setup()
    renderV4(<Purchases />)
    const table = await screen.findByRole('grid', { name: 'Purchases' })
    await u.click(within(table).getByText('Sita'))
    const sheet = await screen.findByRole('dialog')
    expect(sheet).toHaveTextContent('This purchase is fully paid.')
    const wa = within(sheet).getByRole('link', { name: 'Send purchase receipt on WhatsApp' })
    expect(decodeURIComponent(wa.getAttribute('href'))).toContain('Sri Lakshmi Mill')
  })
})

describe('v4 Purchases — record', () => {
  it('offers Record purchase on the page for mill users', async () => {
    renderV4(<RecordPurchaseProvider><Purchases /></RecordPurchaseProvider>)
    expect(await screen.findByRole('button', { name: /Record purchase/ })).toBeInTheDocument()
  })
})

describe('v4 Purchases — pay on phones', () => {
  it('shows Pay on rows with money due and opens the payment sheet', async () => {
    const restore = asPhone()
    try {
      const u = userEvent.setup()
      renderV4(<Purchases />)
      const pay = await screen.findByRole('button', { name: 'Pay Ravi' })
      expect(screen.queryByRole('button', { name: 'Pay Sita' })).toBeNull()
      await u.click(pay)
      expect(await screen.findByRole('dialog')).toHaveTextContent('Release payment')
    } finally { restore() }
  })
})

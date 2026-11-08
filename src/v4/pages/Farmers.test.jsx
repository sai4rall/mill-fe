import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Farmers from './Farmers'
import * as api from '../../shared/api/mill'
import { renderV4 } from '../test/render'

vi.mock('../../shared/api/mill', () => ({
  getFarmers: vi.fn(), createFarmer: vi.fn(), updateFarmer: vi.fn(), deleteFarmer: vi.fn(), sendFarmerOtp: vi.fn(), verifyFarmerOtp: vi.fn(),
  uploadFarmerPhoto: vi.fn(), deleteFarmerPhoto: vi.fn(), getFarmerPhoto: vi.fn(), getPurchases: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  api.getFarmers.mockResolvedValue([])
  api.getPurchases.mockResolvedValue([])
  localStorage.clear()
})

const openRegister = async (u) => {
  await u.click(await screen.findByRole('button', { name: 'Register the first farmer' }))
  return screen.findByRole('dialog')
}

describe('v4 Farmers', () => {
  it('lists farmers with verification state, dues and last purchase, and can switch to cards', async () => {
    api.getFarmers.mockResolvedValue([
      { id: 1, name: 'Ravi Kumar', phone: '9876543210', phoneVerified: true },
      { id: 2, name: 'Sita Devi', phone: '9123456780', phoneVerified: false },
    ])
    api.getPurchases.mockResolvedValue([
      { id: 5, farmerId: 1, purchaseDate: '2025-03-02', amountDue: 150000 },
      { id: 6, farmerId: 1, purchaseDate: '2025-03-09', amountDue: 25000.5 },
    ])
    const u = userEvent.setup()
    renderV4(<Farmers />)
    const table = await screen.findByRole('grid', { name: 'Farmers' })
    const ravi = within(table).getByText('Ravi Kumar').closest('[role="row"]')
    expect(within(ravi).getByLabelText('Verified')).toBeInTheDocument()
    expect(await within(ravi).findByText('₹1,75,000.50')).toBeInTheDocument()
    expect(within(ravi).getByText('9 Mar 2025')).toBeInTheDocument()
    expect(within(table).getByText('Unverified')).toBeInTheDocument()
    expect(within(ravi).getByRole('button', { name: 'Edit Ravi Kumar' })).toBeVisible()

    await u.click(screen.getByRole('radio', { name: 'Cards' }))
    expect(screen.queryByRole('grid', { name: 'Farmers' })).toBeNull()
    expect(screen.getByText('Sita Devi').closest('article')).toHaveTextContent('Outstanding')
  })

  it('requires OTP verification before saving', async () => {
    const u = userEvent.setup()
    renderV4(<Farmers />)
    const panel = await openRegister(u)
    expect(within(panel).queryByLabelText('OTP')).toBeNull()
    await u.type(within(panel).getByLabelText(/Full name/), 'Ravi Kumar')
    await u.type(within(panel).getByLabelText(/Mobile number/), '9876543210')
    await u.click(within(panel).getByRole('button', { name: 'Save farmer' }))
    expect(await within(panel).findByText('Please verify the mobile number with OTP before saving')).toBeInTheDocument()
    expect(api.createFarmer).not.toHaveBeenCalled()
  })

  it('registers an agent when that type is chosen, and filters the list by type', async () => {
    api.sendFarmerOtp.mockResolvedValue({})
    api.verifyFarmerOtp.mockResolvedValue({ verificationToken: 'tok-2' })
    api.createFarmer.mockResolvedValue({ id: 10, name: 'Agent Anil', type: 'AGENT' })
    const u = userEvent.setup()
    renderV4(<Farmers />)
    const panel = await openRegister(u)
    expect(panel).toHaveTextContent('Farmer / agent / supplier registration')
    expect(within(panel).getByRole('radio', { name: 'Farmer' })).toHaveAttribute('aria-checked', 'true')
    await u.click(within(panel).getByRole('radio', { name: 'Agent' }))
    await u.type(within(panel).getByLabelText(/Full name/), 'Agent Anil')
    await u.type(within(panel).getByLabelText(/Mobile number/), '9123456780')
    await u.click(within(panel).getByRole('button', { name: 'Send OTP' }))
    await u.type(await within(panel).findByLabelText('OTP'), '123456')
    await within(panel).findByText('Mobile number verified')
    await u.click(within(panel).getByRole('button', { name: 'Save farmer' }))
    await waitFor(() => expect(api.createFarmer).toHaveBeenCalled())
    expect(api.createFarmer.mock.calls[0][0]).toMatchObject({ name: 'Agent Anil', type: 'AGENT' })
  })

  it('shows the type of each registration and filters by it', async () => {
    api.getFarmers.mockResolvedValue([
      { id: 1, name: 'Ravi Kumar', type: 'FARMER', phone: '9876543210', phoneVerified: true },
      { id: 2, name: 'Agent Anil', type: 'AGENT', phone: '9123456780', phoneVerified: true },
      { id: 3, name: 'Sri Traders', type: 'SUPPLIER', phone: '9000000001', phoneVerified: true },
    ])
    const u = userEvent.setup()
    renderV4(<Farmers />)
    const table = await screen.findByRole('grid', { name: 'Farmers' })
    expect(within(table).getByText('Sri Traders').closest('[role="row"]')).toHaveTextContent('Supplier')
    await u.click(screen.getByRole('button', { name: /^Agents/ }))
    const filtered = screen.getByRole('grid', { name: 'Farmers' })
    expect(within(filtered).queryByText('Ravi Kumar')).toBeNull()
    expect(within(filtered).getByText('Agent Anil')).toBeInTheDocument()
  })

  it('registers a farmer after sending and verifying the OTP', async () => {
    api.sendFarmerOtp.mockResolvedValue({})
    api.verifyFarmerOtp.mockResolvedValue({ verificationToken: 'tok-1' })
    api.createFarmer.mockResolvedValue({ id: 9, name: 'Ravi Kumar' })
    const u = userEvent.setup()
    renderV4(<Farmers />)
    const panel = await openRegister(u)
    await u.type(within(panel).getByLabelText(/Full name/), 'Ravi Kumar')
    await u.type(within(panel).getByLabelText(/Mobile number/), '9876543210')
    await u.click(within(panel).getByRole('button', { name: 'Send OTP' }))
    await u.type(await within(panel).findByLabelText('OTP'), '123456')
    expect(await within(panel).findByText('Mobile number verified')).toBeInTheDocument()
    await u.click(within(panel).getByRole('button', { name: 'Save farmer' }))
    await waitFor(() => expect(api.createFarmer).toHaveBeenCalled())
    expect(api.createFarmer.mock.calls[0][0]).toMatchObject({ name: 'Ravi Kumar', type: 'FARMER', phone: '9876543210', phoneVerificationToken: 'tok-1' })
  })
})

describe('v4 Farmers — pagination', () => {
  it('pages long lists and starts again on page 1 when the filter changes', async () => {
    api.getFarmers.mockResolvedValue(Array.from({ length: 45 }, (_, i) => ({
      id: i + 1, name: `Person ${String(i + 1).padStart(2, '0')}`, type: i < 30 ? 'FARMER' : 'AGENT', phone: `90000000${String(i).padStart(2, '0')}`, phoneVerified: true,
    })))
    const u = userEvent.setup()
    renderV4(<Farmers />)
    await screen.findByRole('grid', { name: 'Farmers' })
    expect(screen.getByText('1–20 of 45')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('21–40 of 45')).toBeInTheDocument()
    expect(screen.getByText('Person 21')).toBeInTheDocument()
    expect(screen.queryByText('Person 01')).toBeNull()
    await u.click(screen.getByRole('button', { name: 'Last page' }))
    expect(screen.getByText('41–45 of 45')).toBeInTheDocument()

    await u.click(screen.getByRole('button', { name: /^Agents/ }))
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull() // 15 agents fit on one page
    await u.click(screen.getByRole('button', { name: /^All/ }))
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()

    await u.click(screen.getByRole('radio', { name: 'Cards' }))
    expect(screen.getByText('1–24 of 45')).toBeInTheDocument()
  })
})

describe('v4 Farmers — confirm bank account', () => {
  it('shows the confirm field on a new registration', async () => {
    const u = userEvent.setup()
    renderV4(<Farmers />)
    const panel = await openRegister(u)
    expect(within(panel).getByLabelText('Bank account no.')).toHaveAttribute('type', 'password')
    expect(within(panel).getByLabelText('Confirm bank account no.')).not.toHaveAttribute('type', 'password')
  })
})

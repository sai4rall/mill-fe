import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Farmers from './Farmers'
import * as api from '../../shared/api/mill'
import { renderV3 } from '../test/render'

vi.mock('../../shared/api/mill', () => ({
  getFarmers: vi.fn(), createFarmer: vi.fn(), updateFarmer: vi.fn(), deleteFarmer: vi.fn(), sendFarmerOtp: vi.fn(), verifyFarmerOtp: vi.fn(),
  uploadFarmerPhoto: vi.fn(), deleteFarmerPhoto: vi.fn(), getFarmerPhoto: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  api.getFarmers.mockResolvedValue([])
})

const openRegister = async (u) => {
  await u.click(await screen.findByRole('button', { name: 'Register the first farmer' }))
  return screen.findByRole('dialog', { name: 'Register farmer' })
}

describe('v3 Farmers', () => {
  it('lists farmers with verification state', async () => {
    api.getFarmers.mockResolvedValue([
      { id: 1, name: 'Ravi Kumar', phone: '9876543210', phoneVerified: true },
      { id: 2, name: 'Sita Devi', phone: '9123456780', phoneVerified: false },
    ])
    renderV3(<Farmers />)
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument()
    expect(screen.getByLabelText('Verified')).toBeInTheDocument()
    expect(screen.getByText('Unverified')).toBeInTheDocument()
  })

  it('filters by search', async () => {
    api.getFarmers.mockResolvedValue([{ id: 1, name: 'Ravi Kumar', phone: '9876543210' }, { id: 2, name: 'Sita Devi', phone: '9123456780' }])
    const u = userEvent.setup()
    renderV3(<Farmers />)
    await screen.findByText('Ravi Kumar')
    await u.type(screen.getByLabelText('Search farmers'), 'sita')
    expect(screen.queryByText('Ravi Kumar')).toBeNull()
    expect(screen.getByText('Sita Devi')).toBeInTheDocument()
  })

  it('does not show OTP entry before an OTP is sent', async () => {
    const u = userEvent.setup()
    renderV3(<Farmers />)
    const sheet = await openRegister(u)
    expect(within(sheet).queryByLabelText('OTP')).toBeNull()
    expect(within(sheet).getByRole('button', { name: 'Send OTP' })).toBeInTheDocument()
  })

  it('requires OTP verification before saving', async () => {
    const u = userEvent.setup()
    renderV3(<Farmers />)
    const sheet = await openRegister(u)
    await u.type(within(sheet).getByLabelText(/Full name/), 'Ravi Kumar')
    await u.type(within(sheet).getByLabelText(/Mobile number/), '9876543210')
    await u.click(within(sheet).getByRole('button', { name: 'Save farmer' }))
    expect(await within(sheet).findByText('Please verify the mobile number with OTP before saving')).toBeInTheDocument()
    expect(api.createFarmer).not.toHaveBeenCalled()
  })

  it('registers a farmer after sending and verifying the OTP', async () => {
    api.sendFarmerOtp.mockResolvedValue({})
    api.verifyFarmerOtp.mockResolvedValue({ verificationToken: 'tok-1' })
    api.createFarmer.mockResolvedValue({ id: 9, name: 'Ravi Kumar' })
    const u = userEvent.setup()
    renderV3(<Farmers />)
    const sheet = await openRegister(u)
    await u.type(within(sheet).getByLabelText(/Full name/), 'Ravi Kumar')
    await u.type(within(sheet).getByLabelText(/Mobile number/), '9876543210')
    await u.click(within(sheet).getByRole('button', { name: 'Send OTP' }))
    await u.type(await within(sheet).findByLabelText('OTP'), '123456')
    expect(await within(sheet).findByText('Mobile number verified')).toBeInTheDocument()
    expect(api.verifyFarmerOtp).toHaveBeenCalledWith('9876543210', '123456')
    await u.click(within(sheet).getByRole('button', { name: 'Save farmer' }))
    await waitFor(() => expect(api.createFarmer).toHaveBeenCalled())
    expect(api.createFarmer.mock.calls[0][0]).toMatchObject({ name: 'Ravi Kumar', phone: '9876543210', phoneVerificationToken: 'tok-1' })
  })

  it('shows field validation errors', async () => {
    const u = userEvent.setup()
    renderV3(<Farmers />)
    const sheet = await openRegister(u)
    await u.click(within(sheet).getByRole('button', { name: 'Save farmer' }))
    expect(await within(sheet).findByText('Name is required')).toBeInTheDocument()
  })
})

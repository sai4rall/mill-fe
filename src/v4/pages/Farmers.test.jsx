import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Farmers from './Farmers'
import * as api from '../../shared/api/mill'
import { renderV4 } from '../test/render'

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
  return screen.findByRole('dialog')
}

describe('v4 Farmers', () => {
  it('shows farmers as cards with verification state', async () => {
    api.getFarmers.mockResolvedValue([
      { id: 1, name: 'Ravi Kumar', phone: '9876543210', phoneVerified: true },
      { id: 2, name: 'Sita Devi', phone: '9123456780', phoneVerified: false },
    ])
    renderV4(<Farmers />)
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument()
    expect(screen.getByLabelText('Verified')).toBeInTheDocument()
    expect(screen.getByText('Unverified')).toBeInTheDocument()
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
    expect(api.createFarmer.mock.calls[0][0]).toMatchObject({ name: 'Ravi Kumar', phone: '9876543210', phoneVerificationToken: 'tok-1' })
  })
})

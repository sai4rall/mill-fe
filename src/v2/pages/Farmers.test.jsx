import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Farmers from './Farmers'
import * as api from '../../shared/api/mill'
import { MESSAGES } from '../../shared/utils/farmerValidation'
import { renderV2 } from '../test/render'

vi.mock('../../shared/api/mill', () => ({
  getFarmers: vi.fn(), createFarmer: vi.fn(), updateFarmer: vi.fn(), deleteFarmer: vi.fn(), sendFarmerOtp: vi.fn(),
  verifyFarmerOtp: vi.fn(), uploadFarmerPhoto: vi.fn(), deleteFarmerPhoto: vi.fn(), getFarmerPhoto: vi.fn(),
}))

const farmers = [
  { id: 1, name: 'Ramesh Kumar', phone: '9876500001', phoneVerified: true, address: 'Nalgonda', bankAccount: null, bankName: null, ifscCode: null, photoUpdatedAt: null },
  { id: 2, name: 'Legacy Farmer', phone: '12345', phoneVerified: false, address: null, bankAccount: null, bankName: null, ifscCode: null, photoUpdatedAt: null },
]

beforeEach(() => {
  vi.clearAllMocks()
  api.getFarmers.mockResolvedValue(farmers)
  api.sendFarmerOtp.mockResolvedValue({})
  api.verifyFarmerOtp.mockResolvedValue({ verificationToken: 'tok-1' })
  api.createFarmer.mockImplementation(async (d) => ({ id: 9, ...d, phoneVerified: true, photoUpdatedAt: null }))
  api.updateFarmer.mockImplementation(async (id, d) => ({ id, ...d, phoneVerified: true, photoUpdatedAt: null }))
})

async function openRegister(user) {
  renderV2(<Farmers />)
  await user.click(await screen.findByRole('button', { name: /Register farmer/ }))
  return screen.findByRole('dialog')
}

describe('v2 Farmers', () => {
  it('lists farmers with verification status and filters by search', async () => {
    const user = userEvent.setup()
    renderV2(<Farmers />)
    const legacyRow = (await screen.findByText('Legacy Farmer')).closest('tr')
    expect(within(legacyRow).getByText('Unverified')).toBeInTheDocument()
    expect(within(screen.getByText('Ramesh Kumar').closest('tr')).getByLabelText('Verified')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Search farmers'), '98765')
    expect(screen.queryByText('Legacy Farmer')).not.toBeInTheDocument()
    expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument()
  })

  it('does not show OTP boxes before an OTP is sent', async () => {
    const user = userEvent.setup()
    const dialog = await openRegister(user)
    expect(within(dialog).queryByLabelText('OTP digit 1')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Send OTP/ })).toBeInTheDocument()
  })

  it('validates fields and requires OTP before saving', async () => {
    const user = userEvent.setup()
    const dialog = await openRegister(user)
    await user.type(within(dialog).getByLabelText(/Bank account no./), '12AB')
    await user.click(within(dialog).getByRole('button', { name: 'Save farmer' }))
    expect(within(dialog).getByText(MESSAGES.nameRequired)).toBeInTheDocument()
    expect(within(dialog).getByText(MESSAGES.phoneRequired)).toBeInTheDocument()
    expect(within(dialog).getByText(MESSAGES.bankAccount)).toBeInTheDocument()
    expect(within(dialog).getByText('Please verify the mobile number with OTP before saving')).toBeInTheDocument()
    expect(api.createFarmer).not.toHaveBeenCalled()
  })

  it('registers a farmer after verifying the OTP (auto-verifies on the 6th digit)', async () => {
    const user = userEvent.setup()
    const dialog = await openRegister(user)
    await user.type(within(dialog).getByLabelText(/Full name/), '  Venkat   Rao ')
    await user.type(within(dialog).getByLabelText(/Mobile number/), '+91 98765 33333')
    await user.click(within(dialog).getByRole('button', { name: /Send OTP/ }))
    await waitFor(() => expect(api.sendFarmerOtp).toHaveBeenCalledWith('9876533333'))

    await user.type(await within(dialog).findByLabelText('OTP digit 1'), '123456')
    await waitFor(() => expect(api.verifyFarmerOtp).toHaveBeenCalledWith('9876533333', '123456'))
    expect(await within(dialog).findByText('Mobile number verified')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Save farmer' }))
    await waitFor(() => expect(api.createFarmer).toHaveBeenCalledTimes(1))
    expect(api.createFarmer.mock.calls[0][0]).toEqual({
      name: 'Venkat Rao', phone: '9876533333', address: '', bankAccount: '', bankName: '', ifscCode: '', phoneVerificationToken: 'tok-1',
    })
    expect(await screen.findByText('Farmer registered')).toBeInTheDocument()
  })

  it('edits without OTP when the mobile number is unchanged (even a legacy one)', async () => {
    const user = userEvent.setup()
    renderV2(<Farmers />)
    await user.click(await screen.findByRole('button', { name: 'Edit Legacy Farmer' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Save farmer' }))
    await waitFor(() => expect(api.updateFarmer).toHaveBeenCalledTimes(1))
    expect(api.updateFarmer.mock.calls[0][1].phone).toBe('12345')
    expect(api.updateFarmer.mock.calls[0][1].phoneVerificationToken).toBeUndefined()
    expect(api.sendFarmerOtp).not.toHaveBeenCalled()
  })

  it('shows server field errors under the right field', async () => {
    api.createFarmer.mockRejectedValue({ response: { data: { error: 'x', fields: { bankDetailsComplete: 'Server bank rule' } } } })
    const user = userEvent.setup()
    const dialog = await openRegister(user)
    await user.type(within(dialog).getByLabelText(/Full name/), 'Venkat')
    await user.type(within(dialog).getByLabelText(/Mobile number/), '9876533333')
    await user.click(within(dialog).getByRole('button', { name: /Send OTP/ }))
    await user.type(await within(dialog).findByLabelText('OTP digit 1'), '123456')
    await within(dialog).findByText('Mobile number verified')
    await user.click(within(dialog).getByRole('button', { name: 'Save farmer' }))
    expect(await within(dialog).findByText('Server bank rule')).toBeInTheDocument()
  })
})

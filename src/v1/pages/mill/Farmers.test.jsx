import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Farmers from './Farmers'
import * as api from '../../../shared/api/mill'
import { MESSAGES } from '../../../shared/utils/farmerValidation'

vi.mock('../../../shared/api/mill', () => ({
  getFarmers: vi.fn(),
  createFarmer: vi.fn(),
  updateFarmer: vi.fn(),
  deleteFarmer: vi.fn(),
  sendFarmerOtp: vi.fn(),
  verifyFarmerOtp: vi.fn(),
  uploadFarmerPhoto: vi.fn(),
  deleteFarmerPhoto: vi.fn(),
  getFarmerPhoto: vi.fn(),
}))

// Canvas resizing isn't available in jsdom; keep the real phone helpers.
vi.mock('../../../shared/utils/image', async (importOriginal) => ({
  ...(await importOriginal()),
  resizeImage: vi.fn(async () => new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' })),
}))

const existingFarmers = [
  { id: 1, name: 'Verified Farmer', phone: '9876500001', phoneVerified: true, bankAccount: null, bankName: null, ifscCode: null, address: null, photoUpdatedAt: null },
  { id: 2, name: 'Legacy Farmer', phone: '12345', phoneVerified: false, bankAccount: null, bankName: null, ifscCode: null, address: null, photoUpdatedAt: null },
]

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const user = userEvent.setup()
  render(<QueryClientProvider client={qc}><Farmers /></QueryClientProvider>)
  return user
}

const field = (label) => screen.getByLabelText(label)
const saveButton = () => screen.getByRole('button', { name: 'Save' })

async function openAddDialog(user) {
  await user.click(await screen.findByRole('button', { name: /^register$/i }))
  return screen.getByRole('heading', { name: 'Farmer / Agent / Supplier Registration' })
}

async function fillValidFarmer(user, overrides = {}) {
  const values = {
    'Full Name *': 'Ramesh Kumar', 'Mobile Number *': '98765 43210', Address: 'Nalgonda',
    'Bank Account No.': '1234 5678 9012', 'Bank Name': 'State Bank of India', 'IFSC Code': 'sbin0001234',
    ...overrides,
  }
  for (const [label, value] of Object.entries(values)) {
    await user.clear(field(label))
    if (value) await user.type(field(label), value)
  }  // A new bank account number has to be typed a second time.
  if (values['Bank Account No.']) await user.type(field('Confirm Bank Account No.'), values['Bank Account No.'])
}

async function verifyPhone(user, code = '123456') {
  await user.click(screen.getByRole('button', { name: 'Send OTP' }))
  await user.type(await screen.findByLabelText('OTP'), code)
  await user.click(screen.getByRole('button', { name: 'Verify' }))
  await screen.findByText('Mobile number verified')
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getFarmers.mockResolvedValue(existingFarmers)
  api.sendFarmerOtp.mockResolvedValue({ message: 'OTP sent', expiresInSeconds: 300 })
  api.verifyFarmerOtp.mockResolvedValue({ verificationToken: 'tok-123' })
  api.createFarmer.mockImplementation(async (data) => ({ id: 99, ...data, phoneVerified: true, photoUpdatedAt: null }))
  api.updateFarmer.mockImplementation(async (id, data) => ({ id, ...data, phoneVerified: true, photoUpdatedAt: null }))
  api.uploadFarmerPhoto.mockResolvedValue({})
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview')
  globalThis.URL.revokeObjectURL = vi.fn()
})

describe('Farmers list', () => {
  it('shows farmers with their mobile verification status', async () => {
    renderPage()
    const verifiedRow = (await screen.findByText('Verified Farmer')).closest('tr')
    const legacyRow = screen.getByText('Legacy Farmer').closest('tr')
    expect(within(verifiedRow).queryByText('Unverified')).not.toBeInTheDocument()
    expect(within(legacyRow).getByText('Unverified')).toBeInTheDocument()
  })
})

describe('Farmer registration — field validation', () => {
  it('shows required errors for name and mobile when submitting an empty form', async () => {
    const user = renderPage()
    await openAddDialog(user)
    await user.click(saveButton())

    expect(screen.getByText(MESSAGES.nameRequired)).toBeInTheDocument()
    expect(screen.getByText(MESSAGES.phoneRequired)).toBeInTheDocument()
    expect(field('Full Name *')).toHaveAttribute('aria-invalid', 'true')
    expect(api.createFarmer).not.toHaveBeenCalled()
  })

  it.each([
    ['Full Name *', 'R', MESSAGES.nameLength],
    ['Full Name *', 'Ramesh1', MESSAGES.nameChars],
    ['Mobile Number *', '12345', MESSAGES.phoneInvalid],
    ['Bank Account No.', '12AB', MESSAGES.bankAccount],
    ['Bank Name', 'Bank123', MESSAGES.bankNameChars],
    ['IFSC Code', 'SBIN1001234', MESSAGES.ifsc],
  ])('%s = %j shows "%s"', async (label, value, message) => {
    const user = renderPage()
    await openAddDialog(user)
    await fillValidFarmer(user, { [label]: value })
    await user.click(saveButton())

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(api.createFarmer).not.toHaveBeenCalled()
  })

  it('limits the address to 500 characters and rejects longer values', async () => {
    const user = renderPage()
    await openAddDialog(user)
    expect(field('Address')).toHaveAttribute('maxLength', '500')
    // maxLength only limits typing; set a longer value directly (e.g. a programmatic paste) to hit the validator.
    fireEvent.change(field('Address'), { target: { value: 'a'.repeat(501) } })
    await user.click(saveButton())
    expect(screen.getByText(MESSAGES.addressLength)).toBeInTheDocument()
  })

  it('requires bank account, bank name and IFSC together', async () => {
    const user = renderPage()
    await openAddDialog(user)
    await fillValidFarmer(user, { 'Bank Name': '', 'IFSC Code': '' })
    await user.click(saveButton())
    expect(screen.getByText(MESSAGES.bankDetails)).toBeInTheDocument()
  })

  it('upper-cases the IFSC code while typing', async () => {
    const user = renderPage()
    await openAddDialog(user)
    await user.type(field('IFSC Code'), 'sbin0001234')
    expect(field('IFSC Code')).toHaveValue('SBIN0001234')
  })

  it('clears an error as soon as the field is fixed after a submit attempt', async () => {
    const user = renderPage()
    await openAddDialog(user)
    await user.click(saveButton())
    expect(screen.getByText(MESSAGES.nameRequired)).toBeInTheDocument()

    await user.type(field('Full Name *'), 'Ramesh')
    expect(screen.queryByText(MESSAGES.nameRequired)).not.toBeInTheDocument()
  })

  it('shows server-side field errors inline', async () => {
    api.createFarmer.mockRejectedValue({ response: { status: 400, data: { error: 'Server says no', fields: { bankDetailsComplete: 'Server bank rule' } } } })
    const user = renderPage()
    await openAddDialog(user)
    await fillValidFarmer(user)
    await verifyPhone(user)
    await user.click(saveButton())

    expect(await screen.findByText('Server bank rule')).toBeInTheDocument()
  })
})

describe('Farmer registration — mobile OTP', () => {
  it('does not show the OTP input before an OTP is sent', async () => {
    const user = renderPage()
    await openAddDialog(user)
    expect(screen.queryByLabelText('OTP')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send OTP' })).toBeInTheDocument()
  })

  it('does not send an OTP for an invalid number', async () => {
    const user = renderPage()
    await openAddDialog(user)
    await user.type(field('Mobile Number *'), '12345')
    await user.click(screen.getByRole('button', { name: 'Send OTP' }))

    expect(screen.getByText(MESSAGES.phoneInvalid)).toBeInTheDocument()
    expect(api.sendFarmerOtp).not.toHaveBeenCalled()
  })

  it('blocks saving until the mobile number is verified', async () => {
    const user = renderPage()
    await openAddDialog(user)
    await fillValidFarmer(user)
    await user.click(saveButton())

    expect(screen.getByText('Please verify the mobile number with OTP before saving')).toBeInTheDocument()
    expect(api.createFarmer).not.toHaveBeenCalled()
  })

  it('shows the error when the OTP is wrong', async () => {
    api.verifyFarmerOtp.mockRejectedValue({ response: { data: { error: 'Incorrect OTP. 4 attempt(s) left.' } } })
    const user = renderPage()
    await openAddDialog(user)
    await user.type(field('Mobile Number *'), '9876543210')
    await user.click(screen.getByRole('button', { name: 'Send OTP' }))
    await user.type(await screen.findByLabelText('OTP'), '000000')
    await user.click(screen.getByRole('button', { name: 'Verify' }))

    expect(await screen.findByText('Incorrect OTP. 4 attempt(s) left.')).toBeInTheDocument()
  })

  it('registers a farmer with normalised values and the verification token', async () => {
    const user = renderPage()
    await openAddDialog(user)
    await fillValidFarmer(user, { 'Full Name *': '  Ramesh   Kumar ' })
    await verifyPhone(user)

    expect(api.sendFarmerOtp).toHaveBeenCalledWith('9876543210')
    expect(api.verifyFarmerOtp).toHaveBeenCalledWith('9876543210', '123456')

    await user.click(saveButton())
    await waitFor(() => expect(api.createFarmer).toHaveBeenCalledTimes(1))
    expect(api.createFarmer).toHaveBeenCalledWith({
      name: 'Ramesh Kumar', type: 'FARMER', phone: '9876543210', address: 'Nalgonda',
      bankAccount: '123456789012', bankName: 'State Bank of India', ifscCode: 'SBIN0001234',
      phoneVerificationToken: 'tok-123',
    })
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Farmer / Agent / Supplier Registration' })).not.toBeInTheDocument())
  })

  it('registers an agent or supplier when that type is chosen', async () => {
    const user = renderPage()
    await openAddDialog(user)
    expect(screen.getByRole('radio', { name: 'Farmer' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'Agent' }))
    await fillValidFarmer(user)
    await verifyPhone(user)
    await user.click(saveButton())
    await waitFor(() => expect(api.createFarmer).toHaveBeenCalledTimes(1))
    expect(api.createFarmer.mock.calls[0][0]).toMatchObject({ type: 'AGENT' })
  })

  it('asks for a new OTP if the number is edited after verification', async () => {
    const user = renderPage()
    await openAddDialog(user)
    await user.type(field('Mobile Number *'), '9876543210')
    await verifyPhone(user)
    await user.clear(field('Mobile Number *'))
    await user.type(field('Mobile Number *'), '9876543211')

    expect(screen.queryByText('Mobile number verified')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send OTP' })).toBeInTheDocument()
  })
})

describe('Farmer registration — photo', () => {
  it('uploads the chosen photo after the farmer is created', async () => {
    const user = renderPage()
    await openAddDialog(user)
    const input = document.querySelector('input[type="file"]')
    await user.upload(input, new File(['raw'], 'me.png', { type: 'image/png' }))
    expect(await screen.findByAltText('Farmer')).toHaveAttribute('src', 'blob:preview')

    await fillValidFarmer(user)
    await verifyPhone(user)
    await user.click(saveButton())

    await waitFor(() => expect(api.uploadFarmerPhoto).toHaveBeenCalledTimes(1))
    const [id, file] = api.uploadFarmerPhoto.mock.calls[0]
    expect(id).toBe(99)
    expect(file.type).toBe('image/jpeg')
  })

  it('keeps the dialog open as an edit if the photo upload fails, so retrying does not create a duplicate', async () => {
    api.uploadFarmerPhoto.mockRejectedValueOnce({ response: { data: { error: 'Photo must be a JPEG, PNG or WebP image' } } })
    const user = renderPage()
    await openAddDialog(user)
    await user.upload(document.querySelector('input[type="file"]'), new File(['raw'], 'me.png', { type: 'image/png' }))
    await fillValidFarmer(user)
    await verifyPhone(user)
    await user.click(saveButton())

    expect(await screen.findByText(/Farmer saved, but the photo could not be updated/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Edit Farmer' })).toBeInTheDocument()

    await user.click(saveButton())
    await waitFor(() => expect(api.updateFarmer).toHaveBeenCalledTimes(1))
    expect(api.createFarmer).toHaveBeenCalledTimes(1)
  })
})

describe('Editing a farmer', () => {
  it('saves without OTP when the mobile number is unchanged', async () => {
    const user = renderPage()
    await user.click(await screen.findByRole('button', { name: 'Edit Verified Farmer' }))
    await user.clear(field('Full Name *'))
    await user.type(field('Full Name *'), 'Renamed Farmer')
    await user.click(saveButton())

    await waitFor(() => expect(api.updateFarmer).toHaveBeenCalledTimes(1))
    const [id, data] = api.updateFarmer.mock.calls[0]
    expect(id).toBe(1)
    expect(data.name).toBe('Renamed Farmer')
    expect(data.phoneVerificationToken).toBeUndefined()
    expect(api.sendFarmerOtp).not.toHaveBeenCalled()
  })

  it('keeps an unchanged legacy number that would fail validation', async () => {
    const user = renderPage()
    await user.click(await screen.findByRole('button', { name: 'Edit Legacy Farmer' }))
    await user.click(saveButton())

    await waitFor(() => expect(api.updateFarmer).toHaveBeenCalledTimes(1))
    expect(api.updateFarmer.mock.calls[0][1].phone).toBe('12345')
  })

  it('requires OTP when the mobile number is changed', async () => {
    const user = renderPage()
    await user.click(await screen.findByRole('button', { name: 'Edit Verified Farmer' }))
    await user.clear(field('Mobile Number *'))
    await user.type(field('Mobile Number *'), '9000000001')
    await user.click(saveButton())

    expect(screen.getByText('Please verify the mobile number with OTP before saving')).toBeInTheDocument()
    expect(api.updateFarmer).not.toHaveBeenCalled()
  })
})

describe('Farmers, agents and suppliers list', () => {
  it('shows each type and filters by it', async () => {
    api.getFarmers.mockResolvedValue([
      { id: 1, name: 'Ravi', type: 'FARMER', phone: '9876543210', phoneVerified: true },
      { id: 2, name: 'Agent Anil', type: 'AGENT', phone: '9123456780', phoneVerified: true },
      { id: 3, name: 'Sri Traders', type: 'SUPPLIER', phone: '9000000001', phoneVerified: false },
    ])
    const user = renderPage()
    expect((await screen.findByText('Agent Anil')).closest('tr')).toHaveTextContent('Agent')
    expect(screen.getByText('Sri Traders').closest('tr')).toHaveTextContent('Supplier')
    await user.click(screen.getByRole('button', { name: /Suppliers/ }))
    expect(screen.queryByText('Ravi')).toBeNull()
    expect(screen.getByText('Sri Traders')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Agents/ }))
    expect(screen.getByText('Agent Anil')).toBeInTheDocument()
    expect(screen.queryByText('Sri Traders')).toBeNull()
  })
})

describe('Farmers list — pagination', () => {
  it('shows 20 per page and goes back to page 1 when the type filter changes', async () => {
    api.getFarmers.mockResolvedValue(Array.from({ length: 45 }, (_, i) => ({
      id: i + 1, name: `Person ${String(i + 1).padStart(2, '0')}`, type: i < 30 ? 'FARMER' : 'AGENT', phone: `90000000${String(i).padStart(2, '0')}`, phoneVerified: true,
    })))
    const user = renderPage()
    expect(await screen.findByText('1–20 of 45')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
    expect(screen.getByText('Person 21')).toBeInTheDocument()
    expect(screen.queryByText('Person 01')).toBeNull()
    await user.click(screen.getByRole('button', { name: /Farmers/ }))
    expect(screen.getByText('1–20 of 30')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  })
})

describe('Farmer registration — confirm bank account', () => {
  it('shows the confirm field on a new registration and blocks a mismatch', async () => {
    const user = renderPage()
    await openAddDialog(user)
    expect(field('Bank Account No.')).toHaveAttribute('type', 'password')       // masked
    expect(field('Confirm Bank Account No.')).toHaveAttribute('type', 'text')   // typed again in the clear
    await fillValidFarmer(user, { 'Bank Account No.': '' })
    await user.type(field('Bank Account No.'), '123456789012')
    await user.type(field('Confirm Bank Account No.'), '123456789099')
    await verifyPhone(user)
    await user.click(saveButton())
    expect(await screen.findByText('Bank account numbers do not match')).toBeInTheDocument()
    expect(api.createFarmer).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Purchases from './Purchases'
import * as mill from '../../../shared/api/mill'
import { getMoistureTable } from '../../../shared/api/moisture'
import { renderWithProviders } from '../../test/renderWithProviders'

vi.mock('../../../shared/api/mill', () => ({
  getPurchases: vi.fn(), createPurchase: vi.fn(), getFarmers: vi.fn(), getPayments: vi.fn(),
  createPayment: vi.fn(), sendPaymentOtp: vi.fn(),
}))
vi.mock('../../../shared/api/moisture', () => ({ getMoistureTable: vi.fn() }))
const flags = vi.hoisted(() => ({ moisture: true }))
vi.mock('../../../shared/features/useFeatures', () => ({
  useFeatures: () => ({ isLoading: false, flag: (key) => ({ showInMenu: true, enabled: key === 'moisture_deduction' ? flags.moisture : true }) }),
}))

const ranges = [
  { fromPct: 0, toPct: 15, deductionPct: 0 }, { fromPct: 15, toPct: 17, deductionPct: 5 },
  { fromPct: 17, toPct: 19, deductionPct: 20 }, { fromPct: 19, toPct: null, deductionPct: 25 },
]
const purchase = {
  id: 12, farmerId: 1, farmerName: 'Ramesh', purchaseDate: '2026-11-01', truckNumber: null,
  weightQuintals: 100, pricePerQuintal: 2000, moisturePct: 16.2, deductionPct: 5, grossAmount: 200000,
  deductionAmount: 10000, totalAmount: 190000, amountPaid: 40000, amountDue: 150000, paymentStatus: 'PARTIAL',
}
const legacy = { ...purchase, id: 13, farmerId: 2, farmerName: 'Legacy Farmer', moisturePct: null, deductionPct: null,
  deductionAmount: 0, totalAmount: 20000, amountPaid: 0, amountDue: 20000, paymentStatus: 'PENDING' }

beforeEach(() => {
  vi.clearAllMocks()
  flags.moisture = true
  mill.getPurchases.mockResolvedValue([purchase, legacy])
  mill.getFarmers.mockResolvedValue([
    { id: 1, name: 'Ramesh', phoneVerified: true },
    { id: 2, name: 'Legacy Farmer', phoneVerified: false },
  ])
  mill.getPayments.mockResolvedValue([{ id: 5, amount: 40000, paymentMode: 'UPI', paymentDate: '2026-11-01', otpVerifiedAt: '2026-11-01T10:00:00' }])
  getMoistureTable.mockResolvedValue({ source: 'GLOBAL', ranges, millRanges: [], globalRanges: ranges })
  mill.createPurchase.mockResolvedValue({})
  mill.sendPaymentOtp.mockResolvedValue({ phone: '••••••3210', expiresInSeconds: 300 })
  mill.createPayment.mockResolvedValue({})
})

const setup = () => { const user = userEvent.setup(); renderWithProviders(<Purchases />); return user }
const submitPurchase = () => screen.getAllByRole('button', { name: 'Record Purchase' }).find(b => b.closest('form'))

describe('Recording a purchase with moisture', () => {
  async function openForm(user) {
    await user.click(await screen.findByRole('button', { name: /Record Purchase/ }))
    await screen.findByRole('option', { name: 'Ramesh' })
  }

  it.each([
    ['14', '0', '₹200000.00', '₹0.00', '₹200000.00'],
    ['16.2', '5', '₹200000.00', '₹10000.00', '₹190000.00'],
    ['17', '20', '₹200000.00', '₹40000.00', '₹160000.00'],
    ['22', '25', '₹200000.00', '₹50000.00', '₹150000.00'],
  ])('%s%% moisture previews a %s%% deduction', async (moisture, pct, gross, deduction, net) => {
    const user = setup()
    await openForm(user)
    await user.type(screen.getByLabelText('Weight (Quintals) *'), '100')
    await user.type(screen.getByLabelText('Price per Quintal ₹ *'), '2000')
    await user.type(screen.getByLabelText('Moisture % *'), moisture)

    const box = screen.getByTestId('price-breakdown')
    expect(box).toHaveTextContent(`Gross amount${gross}`)
    expect(box).toHaveTextContent(`Moisture deduction (${pct}%)−${deduction}`)
    expect(box).toHaveTextContent(`Net payable${net}`)
  })

  it('sends moisture % with the purchase', async () => {
    const user = setup()
    await openForm(user)
    await user.selectOptions(screen.getByLabelText('Farmer *'), '1')
    // jsdom date inputs ignore typed characters; set the value directly.
    fireEvent.change(screen.getByLabelText('Purchase Date *'), { target: { value: '2026-11-01' } })
    await user.type(screen.getByLabelText('Weight (Quintals) *'), '100')
    await user.type(screen.getByLabelText('Price per Quintal ₹ *'), '2000')
    await user.type(screen.getByLabelText('Moisture % *'), '16.2')
    await user.click(submitPurchase())

    await waitFor(() => expect(mill.createPurchase).toHaveBeenCalledTimes(1))
    expect(mill.createPurchase.mock.calls[0][0]).toMatchObject({ farmerId: 1, weightQuintals: 100, pricePerQuintal: 2000, moisturePct: 16.2 })
  })

  it('requires moisture %', async () => {
    const user = setup()
    await openForm(user)
    expect(screen.getByLabelText('Moisture % *')).toBeRequired()
  })

  it('shows the server error if the purchase is rejected', async () => {
    mill.createPurchase.mockRejectedValue({ response: { data: { error: 'Moisture % is required' } } })
    const user = setup()
    await openForm(user)
    await user.selectOptions(screen.getByLabelText('Farmer *'), '1')
    // jsdom date inputs ignore typed characters; set the value directly.
    fireEvent.change(screen.getByLabelText('Purchase Date *'), { target: { value: '2026-11-01' } })
    await user.type(screen.getByLabelText('Weight (Quintals) *'), '1')
    await user.type(screen.getByLabelText('Price per Quintal ₹ *'), '1')
    await user.type(screen.getByLabelText('Moisture % *'), '1')
    await user.click(submitPurchase())
    expect(await screen.findByText('Moisture % is required')).toBeInTheDocument()
  })

  it('lists moisture and deduction, with a dash for older purchases', async () => {
    setup()
    const row = (await screen.findByRole('cell', { name: 'Ramesh' })).closest('tr')
    expect(row).toHaveTextContent('16.2%')
    expect(row).toHaveTextContent('−5%')
    const old = screen.getByRole('cell', { name: 'Legacy Farmer' }).closest('tr')
    expect(within(old).getAllByText('—').length).toBeGreaterThan(0)
  })
})

describe('Releasing a payment with the farmer OTP', () => {
  async function openPayment(user, name = 'Ramesh') {
    await user.click(await screen.findByRole('button', { name: `Pay ${name}` }))
    await screen.findByRole('heading', { name: `Payments — ${name}` })
  }

  it('shows the deduction and marks OTP-confirmed payments', async () => {
    const user = setup()
    await openPayment(user)
    expect(screen.getByText('Moisture 16.2% deduction:')).toBeInTheDocument()
    expect(await screen.findByLabelText('Confirmed by farmer OTP')).toBeInTheDocument()
  })

  it('blocks payments to farmers without a verified mobile', async () => {
    const user = setup()
    await openPayment(user, 'Legacy Farmer')
    expect(screen.getByText(/mobile number is not verified/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send OTP to farmer' })).not.toBeInTheDocument()
  })

  it.each([
    ['', 'Enter an amount greater than 0'],
    ['0', 'Enter an amount greater than 0'],
    ['100.555', 'Amount can have at most 2 decimals'],
    ['150000.01', 'Amount exceeds the outstanding balance of ₹150000.00'],
  ])('amount %j is rejected before sending an OTP', async (amount, message) => {
    const user = setup()
    await openPayment(user)
    if (amount) await user.type(screen.getByLabelText('Amount ₹ *'), amount)
    await user.click(screen.getByRole('button', { name: 'Send OTP to farmer' }))
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(mill.sendPaymentOtp).not.toHaveBeenCalled()
  })

  it('sends an OTP for the amount, then releases the payment with it', async () => {
    const user = setup()
    await openPayment(user)
    await user.type(screen.getByLabelText('Amount ₹ *'), '50000')
    await user.selectOptions(screen.getByLabelText('Mode'), 'UPI')
    await user.click(screen.getByRole('button', { name: 'Send OTP to farmer' }))

    await waitFor(() => expect(mill.sendPaymentOtp).toHaveBeenCalledWith(12, 50000))
    expect(await screen.findByText(/sent to the farmer's mobile/)).toHaveTextContent('₹50000.00')
    expect(screen.getByText('+91 ••••••3210')).toBeInTheDocument()

    const confirm = screen.getByRole('button', { name: /Confirm OTP & release payment/ })
    expect(confirm).toBeDisabled()
    await user.type(screen.getByLabelText("Farmer's OTP"), '123456')
    await user.click(confirm)

    await waitFor(() => expect(mill.createPayment).toHaveBeenCalledTimes(1))
    expect(mill.createPayment.mock.calls[0][0]).toMatchObject({ purchaseId: 12, amount: 50000, paymentMode: 'UPI', otp: '123456' })
    expect(await screen.findByText('Payment released.')).toBeInTheDocument()
  })

  it('changing the amount after sending requires a new OTP', async () => {
    const user = setup()
    await openPayment(user)
    await user.type(screen.getByLabelText('Amount ₹ *'), '50000')
    await user.click(screen.getByRole('button', { name: 'Send OTP to farmer' }))
    await screen.findByLabelText("Farmer's OTP")

    await user.type(screen.getByLabelText('Amount ₹ *'), '1')
    expect(screen.queryByLabelText("Farmer's OTP")).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send OTP to farmer' })).toBeInTheDocument()
  })

  it('shows the error for a wrong OTP', async () => {
    mill.createPayment.mockRejectedValue({ response: { data: { error: 'Incorrect OTP. 4 attempt(s) left.' } } })
    const user = setup()
    await openPayment(user)
    await user.type(screen.getByLabelText('Amount ₹ *'), '50000')
    await user.click(screen.getByRole('button', { name: 'Send OTP to farmer' }))
    await user.type(await screen.findByLabelText("Farmer's OTP"), '000000')
    await user.click(screen.getByRole('button', { name: /Confirm OTP/ }))
    expect(await screen.findByText('Incorrect OTP. 4 attempt(s) left.')).toBeInTheDocument()
  })

  it('says when a purchase is fully paid', async () => {
    mill.getPurchases.mockResolvedValue([{ ...purchase, amountPaid: 190000, amountDue: 0, paymentStatus: 'PAID' }])
    const user = setup()
    await openPayment(user)
    expect(screen.getByText('This purchase is fully paid.')).toBeInTheDocument()
  })
})

describe('With the moisture_deduction feature switched off for the mill', () => {
  beforeEach(() => { flags.moisture = false })

  it('hides the moisture field and column and shows a plain total', async () => {
    const user = setup()
    expect(await screen.findByRole('cell', { name: 'Ramesh' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Moisture' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Record Purchase/ }))
    await screen.findByRole('option', { name: 'Ramesh' })
    expect(screen.queryByLabelText('Moisture % *')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Weight (Quintals) *'), '100')
    await user.type(screen.getByLabelText('Price per Quintal ₹ *'), '2000')
    expect(screen.getByTestId('price-breakdown')).toHaveTextContent('Total Amount: ₹200000.00')
    expect(getMoistureTable).not.toHaveBeenCalled()
  })

  it('records the purchase without moisture', async () => {
    const user = setup()
    await user.click(await screen.findByRole('button', { name: /Record Purchase/ }))
    await screen.findByRole('option', { name: 'Ramesh' })
    await user.selectOptions(screen.getByLabelText('Farmer *'), '1')
    fireEvent.change(screen.getByLabelText('Purchase Date *'), { target: { value: '2026-11-01' } })
    await user.type(screen.getByLabelText('Weight (Quintals) *'), '100')
    await user.type(screen.getByLabelText('Price per Quintal ₹ *'), '2000')
    await user.click(submitPurchase())

    await waitFor(() => expect(mill.createPurchase).toHaveBeenCalledTimes(1))
    expect(mill.createPurchase.mock.calls[0][0].moisturePct).toBeNull()
  })
})

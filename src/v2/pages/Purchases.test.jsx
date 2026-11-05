import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Purchases from './Purchases'
import * as mill from '../../shared/api/mill'
import { getMoistureTable } from '../../shared/api/moisture'
import { renderV2 } from '../test/render'

vi.mock('../../shared/api/mill', () => ({
  getPurchases: vi.fn(), createPurchase: vi.fn(), getFarmers: vi.fn(), getPayments: vi.fn(), createPayment: vi.fn(), sendPaymentOtp: vi.fn(),
}))
vi.mock('../../shared/api/moisture', () => ({ getMoistureTable: vi.fn() }))
const flags = vi.hoisted(() => ({ moisture: true }))
vi.mock('../../shared/features/useFeatures', () => ({
  useFeatures: () => ({ isLoading: false, flag: (k) => ({ showInMenu: true, enabled: k === 'moisture_deduction' ? flags.moisture : true }) }),
}))

const ranges = [{ fromPct: 0, toPct: 15, deductionPct: 0 }, { fromPct: 15, toPct: 17, deductionPct: 5 }, { fromPct: 17, toPct: null, deductionPct: 20 }]
const purchase = { id: 12, farmerId: 1, farmerName: 'Ramesh', purchaseDate: '2026-11-04', weightQuintals: 100, pricePerQuintal: 2000,
  moisturePct: 16.2, deductionPct: 5, deductionAmount: 10000, totalAmount: 190000, amountPaid: 40000, amountDue: 150000, paymentStatus: 'PARTIAL' }

beforeEach(() => {
  vi.clearAllMocks()
  flags.moisture = true
  mill.getPurchases.mockResolvedValue([purchase])
  mill.getFarmers.mockResolvedValue([{ id: 1, name: 'Ramesh', phoneVerified: true }, { id: 2, name: 'Unverified', phoneVerified: false }])
  mill.getPayments.mockResolvedValue([{ id: 5, amount: 40000, paymentMode: 'UPI', paymentDate: '2026-11-04', otpVerifiedAt: '2026-11-04T10:00:00' }])
  mill.sendPaymentOtp.mockResolvedValue({ phone: '••••••0001' })
  mill.createPayment.mockResolvedValue({})
  mill.createPurchase.mockResolvedValue({})
  getMoistureTable.mockResolvedValue({ source: 'GLOBAL', ranges })
})

describe('v2 Purchases', () => {
  it('shows totals and the moisture deduction in the list', async () => {
    renderV2(<Purchases />)
    const row = (await screen.findByText('Ramesh', { selector: 'td' })).closest('tr')
    expect(row).toHaveTextContent('16.2%')
    expect(row).toHaveTextContent('−5%')
    expect(screen.getByText('Outstanding').parentElement).toHaveTextContent('₹1,50,000.00')
  })

  it.each([['14', '0'], ['16.2', '5'], ['18', '20']])('previews a %s%% moisture as a %s%% deduction', async (moisture, pct) => {
    const user = userEvent.setup()
    renderV2(<Purchases />)
    await user.click(await screen.findByRole('button', { name: /Record purchase/ }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/Weight/), '100')
    await user.type(within(dialog).getByLabelText(/Price per Qtl/), '2000')
    await user.type(within(dialog).getByLabelText(/Moisture %/), moisture)
    expect(within(dialog).getByTestId('price-breakdown')).toHaveTextContent(`Moisture deduction (${pct}%)`)
  })

  it('hides moisture entirely when the feature is off', async () => {
    flags.moisture = false
    const user = userEvent.setup()
    renderV2(<Purchases />)
    await user.click(await screen.findByRole('button', { name: /Record purchase/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByLabelText(/Moisture %/)).not.toBeInTheDocument()
    expect(getMoistureTable).not.toHaveBeenCalled()
  })

  it('releases a payment only with the farmer OTP for that amount', async () => {
    const user = userEvent.setup()
    renderV2(<Purchases />)
    await user.click(await screen.findByRole('button', { name: 'Pay Ramesh' }))
    const drawer = await screen.findByRole('dialog')
    expect(await within(drawer).findByLabelText('Confirmed by farmer OTP')).toBeInTheDocument()

    await user.type(within(drawer).getByLabelText(/Amount/), '150000.01')
    await user.click(within(drawer).getByRole('button', { name: /Send OTP to farmer/ }))
    expect(within(drawer).getByText('Amount exceeds the outstanding balance of ₹150000.00')).toBeInTheDocument()
    expect(mill.sendPaymentOtp).not.toHaveBeenCalled()

    await user.clear(within(drawer).getByLabelText(/Amount/))
    await user.type(within(drawer).getByLabelText(/Amount/), '50000')
    await user.click(within(drawer).getByRole('button', { name: /Send OTP to farmer/ }))
    await waitFor(() => expect(mill.sendPaymentOtp).toHaveBeenCalledWith(12, 50000))
    expect(await within(drawer).findByText(/sent to the farmer's mobile/)).toBeInTheDocument()

    const confirm = within(drawer).getByRole('button', { name: /Confirm OTP & release payment/ })
    expect(confirm).toBeDisabled()
    await user.type(within(drawer).getByLabelText('OTP digit 1'), '654321')
    await user.click(confirm)
    await waitFor(() => expect(mill.createPayment).toHaveBeenCalledTimes(1))
    expect(mill.createPayment.mock.calls[0][0]).toMatchObject({ purchaseId: 12, amount: 50000, otp: '654321', paymentMode: 'CASH' })
    expect(await screen.findByText('Payment released')).toBeInTheDocument()
  })

  it('changing the amount after sending requires a new OTP', async () => {
    const user = userEvent.setup()
    renderV2(<Purchases />)
    await user.click(await screen.findByRole('button', { name: 'Pay Ramesh' }))
    const drawer = await screen.findByRole('dialog')
    await user.type(within(drawer).getByLabelText(/Amount/), '50000')
    await user.click(within(drawer).getByRole('button', { name: /Send OTP to farmer/ }))
    await within(drawer).findByLabelText('OTP digit 1')
    fireEvent.change(within(drawer).getByLabelText(/Amount/), { target: { value: '50001' } })
    expect(within(drawer).queryByLabelText('OTP digit 1')).not.toBeInTheDocument()
  })
})

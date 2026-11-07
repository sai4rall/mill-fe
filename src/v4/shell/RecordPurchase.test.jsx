import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../shared/api/mill'
import { RecordPurchaseProvider, useRecordPurchase } from './RecordPurchase'
import { queuedPurchases } from '../lib/outbox'
import { renderV4 } from '../test/render'

vi.mock('../../shared/context/AuthContext', () => ({ useAuth: () => ({ user: { username: 'op1', role: 'MILL_OPERATOR' } }) }))
vi.mock('../../shared/features/useFeatures', () => ({
  useFeatures: () => ({ flag: (k) => ({ showInMenu: true, enabled: k !== 'moisture_deduction' }) }),
}))
vi.mock('../../shared/api/moisture', () => ({ getMoistureTable: vi.fn() }))
vi.mock('../../shared/api/mill', () => ({ getFarmers: vi.fn(), getPurchases: vi.fn(), createPurchase: vi.fn() }))

function Opener() {
  const { open } = useRecordPurchase()
  return <button type="button" onClick={open}>open</button>
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  api.getFarmers.mockResolvedValue([{ id: 1, name: 'Anil' }, { id: 2, name: 'Ravi Kumar' }])
  api.getPurchases.mockResolvedValue([{ id: 9, farmerId: 2, purchaseDate: '2026-11-01' }])
})

async function fill(u) {
  await u.click(screen.getByRole('button', { name: 'open' }))
  const sheet = await screen.findByRole('dialog')
  const farmer = within(sheet).getByRole('combobox', { name: /Farmer/ })
  await u.click(farmer)
  const options = await screen.findAllByRole('option')
  expect(options.map(o => o.textContent)).toEqual(['Ravi Kumar', 'Anil']) // recent farmers first
  await u.click(options[0])
  await u.type(within(sheet).getByLabelText(/^Weight/), '12.5')
  await u.type(within(sheet).getByLabelText(/^Rate/), '2000')
  return sheet
}

describe('v4 Record purchase sheet', () => {
  it('shows the live receipt and keeps date and rate on "Save and add another"', async () => {
    api.createPurchase.mockResolvedValue({ id: 10 })
    const u = userEvent.setup()
    renderV4(<RecordPurchaseProvider><Opener /></RecordPurchaseProvider>)
    const sheet = await fill(u)
    expect(within(sheet).getAllByTestId('price-breakdown')[0]).toHaveTextContent('₹25,000.00')
    await u.click(within(sheet).getByRole('button', { name: 'Save and add another' }))
    await waitFor(() => expect(api.createPurchase).toHaveBeenCalledWith(expect.objectContaining({ farmerId: 2, weightQuintals: 12.5, pricePerQuintal: 2000 })))
    expect(api.createPurchase.mock.calls[0][0]).not.toHaveProperty('__again')
    await waitFor(() => expect(within(sheet).getByLabelText(/^Weight/)).toHaveValue(''))
    expect(within(sheet).getByLabelText(/^Rate/)).toHaveValue('2000')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('queues the purchase on the device when there is no connection', async () => {
    api.createPurchase.mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }))
    const u = userEvent.setup()
    renderV4(<RecordPurchaseProvider><Opener /></RecordPurchaseProvider>)
    const sheet = await fill(u)
    await u.click(within(sheet).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(queuedPurchases()).toHaveLength(1))
    expect(queuedPurchases()[0].payload ?? queuedPurchases()[0]).toMatchObject({ farmerId: 2, weightQuintals: 12.5 })
  })

  it('opens with the N shortcut', async () => {
    const u = userEvent.setup()
    renderV4(<RecordPurchaseProvider><Opener /></RecordPurchaseProvider>)
    await u.keyboard('n')
    expect(await screen.findByRole('dialog')).toHaveTextContent('Record purchase')
  })
})

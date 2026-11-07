import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../shared/api/mill'
import RejectedLorries from './RejectedLorries'
import { renderV4 } from '../test/render'

vi.mock('../../shared/api/mill', () => ({
  getRejectedLorries: vi.fn(), createRejectedLorry: vi.fn(), updateRejectedLorry: vi.fn(), deleteRejectedLorry: vi.fn(), getFarmers: vi.fn(),
}))

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

beforeEach(() => {
  vi.clearAllMocks()
  api.getFarmers.mockResolvedValue([{ id: 2, name: 'Agent Anil', type: 'AGENT' }])
  api.getRejectedLorries.mockResolvedValue([
    { id: 1, rejectionDate: today(), truckNumber: 'AP07CD1234', farmerId: 2, farmerName: 'Agent Anil', farmerType: 'AGENT', approxWeightQuintals: 120.5, moisturePct: 24, reason: 'HIGH_MOISTURE', recordedBy: 'p_mill' },
    { id: 2, rejectionDate: today(), truckNumber: 'TS09XY1', reason: 'POOR_QUALITY', notes: 'Broken grains', recordedBy: 'op1' },
  ])
})

describe('v4 Rejected lorries', () => {
  it('lists rejected lorries with who brought them and why, and filters by reason', async () => {
    const u = userEvent.setup()
    renderV4(<RejectedLorries />)
    const table = await screen.findByRole('grid', { name: 'Rejected lorries' })
    const row = within(table).getByText('AP07CD1234').closest('[role="row"]')
    expect(row).toHaveTextContent('Agent Anil')
    expect(row).toHaveTextContent('120.50 Qtl')
    expect(row).toHaveTextContent('High moisture')
    await u.click(within(screen.getByRole('group', { name: 'Status' })).getByRole('button', { name: /^Poor quality/ }))
    const filtered = screen.getByRole('grid', { name: 'Rejected lorries' })
    expect(within(filtered).queryByText('AP07CD1234')).toBeNull()
    expect(within(filtered).getByText('TS09XY1')).toBeInTheDocument()
  })

  it('records a rejected lorry and asks for notes when the reason is Other', async () => {
    api.createRejectedLorry.mockResolvedValue({ id: 3 })
    const u = userEvent.setup()
    renderV4(<RejectedLorries />)
    await u.click(await screen.findByRole('button', { name: 'Record rejected lorry' }))
    const sheet = await screen.findByRole('dialog')
    await u.click(within(sheet).getByRole('button', { name: 'Save' }))
    expect(await within(sheet).findByText('Truck number is required')).toBeInTheDocument()
    await u.type(within(sheet).getByLabelText(/Truck number/), 'ap 09 ab 77')
    await u.type(within(sheet).getByLabelText(/^Approx. weight/), '80')
    await u.click(within(sheet).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(api.createRejectedLorry).toHaveBeenCalled())
    expect(api.createRejectedLorry.mock.calls[0][0]).toMatchObject({
      rejectionDate: today(), truckNumber: 'AP09AB77', farmerId: null, approxWeightQuintals: 80, moisturePct: null, reason: 'HIGH_MOISTURE', notes: null,
    })
  })

  it('deletes an entry only after confirming', async () => {
    api.deleteRejectedLorry.mockResolvedValue({})
    const u = userEvent.setup()
    renderV4(<RejectedLorries />)
    await u.click(await screen.findByRole('button', { name: 'Delete TS09XY1' }))
    expect(api.deleteRejectedLorry).not.toHaveBeenCalled()
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(api.deleteRejectedLorry).toHaveBeenCalledWith(2))
  })
})

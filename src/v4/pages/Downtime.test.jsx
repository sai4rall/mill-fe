import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../shared/api/mill'
import Downtime from './Downtime'
import { renderV4 } from '../test/render'

vi.mock('../../shared/api/mill', () => ({ getDowntime: vi.fn(), createDowntime: vi.fn(), updateDowntime: vi.fn(), deleteDowntime: vi.fn() }))
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

beforeEach(() => {
  vi.clearAllMocks()
  api.getDowntime.mockResolvedValue([
    { id: 1, downtimeDate: today(), shift: 'NIGHT', machine: 'Main line', startTime: '23:30:00', endTime: '01:00:00', durationMinutes: 90, reason: 'POWER_CUT', recordedBy: 'op1' },
    { id: 2, downtimeDate: today(), shift: 'MORNING', machine: 'Husker', startTime: '09:15:00', endTime: '10:00:00', durationMinutes: 45, reason: 'BREAKDOWN', recordedBy: 'op1' },
  ])
})

describe('v4 Machine downtime', () => {
  it('lists stoppages with totals per shift', async () => {
    renderV4(<Downtime />)
    const table = await screen.findByRole('grid', { name: 'Machine downtime' })
    expect(within(table).getByText('Main line').closest('[role="row"]')).toHaveTextContent('23:30 – 01:00')
    expect(screen.getByText('2 h 15 min')).toBeInTheDocument()
    expect(screen.getByText('Night shift').closest('div').parentElement).toHaveTextContent('1 h 30 min')
  })

  it('records a stoppage that runs past midnight', async () => {
    api.createDowntime.mockResolvedValue({ id: 3 })
    const u = userEvent.setup()
    renderV4(<Downtime />)
    await u.click(await screen.findByRole('button', { name: 'Record downtime' }))
    const sheet = await screen.findByRole('dialog')
    await u.click(within(sheet).getByRole('button', { name: 'Save' }))
    expect(await within(sheet).findByText('Machine is required')).toBeInTheDocument()
    await u.click(within(sheet).getByRole('button', { name: 'Polisher' }))
    await u.type(within(sheet).getByLabelText(/Stopped at/), '23:00')
    await u.type(within(sheet).getByLabelText(/Restarted at/), '00:30')
    expect(within(sheet).getByText('Duration: 1 h 30 min')).toBeInTheDocument()
    await u.click(within(sheet).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(api.createDowntime).toHaveBeenCalled())
    expect(api.createDowntime.mock.calls[0][0]).toMatchObject({ downtimeDate: today(), machine: 'Polisher', startTime: '23:00', endTime: '00:30', reason: 'BREAKDOWN' })
    expect(['MORNING', 'AFTERNOON', 'NIGHT']).toContain(api.createDowntime.mock.calls[0][0].shift)
  })
})

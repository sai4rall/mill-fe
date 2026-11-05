import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MoistureSettings from './MoistureSettings'
import GlobalMoisture from '../admin/GlobalMoisture'
import * as api from '../../../shared/api/moisture'
import { renderWithProviders } from '../../test/renderWithProviders'

vi.mock('../../../shared/api/moisture', () => ({
  getMoistureTable: vi.fn(), saveMillMoisture: vi.fn(), resetMillMoisture: vi.fn(),
  getGlobalMoisture: vi.fn(), saveGlobalMoisture: vi.fn(),
}))

const global = [{ fromPct: 0, toPct: 15, deductionPct: 0 }, { fromPct: 15, toPct: null, deductionPct: 5 }]
const own = [{ fromPct: 16, toPct: null, deductionPct: 10 }]

beforeEach(() => vi.clearAllMocks())

describe('Mill admin moisture settings', () => {
  it('starts from a copy of the global defaults and saves them as the mill override', async () => {
    api.getMoistureTable.mockResolvedValue({ source: 'GLOBAL', ranges: global, millRanges: [], globalRanges: global })
    api.saveMillMoisture.mockResolvedValue({ source: 'MILL', ranges: global, millRanges: global, globalRanges: global })
    const user = userEvent.setup()
    renderWithProviders(<MoistureSettings />)

    expect(await screen.findByText(/global defaults/)).toBeInTheDocument()
    expect(screen.getByLabelText('Range 2 deduction')).toHaveValue('5')
    await user.clear(screen.getByLabelText('Range 2 deduction'))
    await user.type(screen.getByLabelText('Range 2 deduction'), '8')
    await user.click(screen.getByRole('button', { name: 'Override for my mill' }))

    await waitFor(() => expect(api.saveMillMoisture).toHaveBeenCalledWith([
      { fromPct: 0, toPct: 15, deductionPct: 0 }, { fromPct: 15, toPct: null, deductionPct: 8 },
    ]))
    expect(await screen.findByText(/its own ranges/)).toBeInTheDocument()
  })

  it('shows the mill override with the global defaults and can reset to global', async () => {
    api.getMoistureTable.mockResolvedValue({ source: 'MILL', ranges: own, millRanges: own, globalRanges: global })
    api.resetMillMoisture.mockResolvedValue({ source: 'GLOBAL', ranges: global, millRanges: [], globalRanges: global })
    const user = userEvent.setup()
    renderWithProviders(<MoistureSettings />)

    expect(await screen.findByText(/its own ranges/)).toBeInTheDocument()
    expect(screen.getByText(/Global defaults: 0% – below 15% → 0%, 15% and above → 5%/)).toBeInTheDocument()
    expect(screen.getByLabelText('Range 1 from')).toHaveValue('16')

    await user.click(screen.getByRole('button', { name: 'Reset to global defaults' }))
    await waitFor(() => expect(api.resetMillMoisture).toHaveBeenCalled())
    expect(await screen.findByText(/global defaults/)).toBeInTheDocument()
    expect(screen.getByLabelText('Range 1 to')).toHaveValue('15')
  })

  it('explains when no ranges exist anywhere', async () => {
    api.getMoistureTable.mockResolvedValue({ source: 'NONE', ranges: [], millRanges: [], globalRanges: [] })
    renderWithProviders(<MoistureSettings />)
    expect(await screen.findByText(/No ranges are set/)).toHaveTextContent('purchases get no deduction')
  })

  it('shows the server error when saving fails', async () => {
    api.getMoistureTable.mockResolvedValue({ source: 'GLOBAL', ranges: global, millRanges: [], globalRanges: global })
    api.saveMillMoisture.mockRejectedValue({ response: { data: { error: 'Range 15%: overlaps the previous range' } } })
    const user = userEvent.setup()
    renderWithProviders(<MoistureSettings />)
    await user.click(await screen.findByRole('button', { name: 'Override for my mill' }))
    expect(await screen.findByText('Range 15%: overlaps the previous range')).toBeInTheDocument()
  })
})

describe('Super admin global moisture defaults', () => {
  it('edits and saves the global table', async () => {
    api.getGlobalMoisture.mockResolvedValue(global)
    api.saveGlobalMoisture.mockImplementation(async (r) => r)
    const user = userEvent.setup()
    renderWithProviders(<GlobalMoisture />)

    await user.click(await screen.findByRole('button', { name: 'Remove range 1' }))
    await user.click(screen.getByRole('button', { name: 'Save global ranges' }))
    await waitFor(() => expect(api.saveGlobalMoisture).toHaveBeenCalledWith([{ fromPct: 15, toPct: null, deductionPct: 5 }]))
    expect(await screen.findByText('Saved.')).toBeInTheDocument()
  })
})

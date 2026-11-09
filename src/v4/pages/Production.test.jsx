import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import * as api from '../../shared/api/mill'
import Production from './Production'
import { renderV4 } from '../test/render'

vi.mock('../../shared/context/AuthContext', () => ({ useAuth: () => ({ user: { username: 'a', role: 'MILL_ADMIN' } }) }))
vi.mock('../../shared/api/mill', () => ({ getProduction: vi.fn() }))
vi.mock('../../shared/api/mills', () => ({ getMillProduction: vi.fn(), getMills: vi.fn() }))

const row = (key, o = {}) => ({ key, batches: 0, paddyInQuintals: 0, riceQuintals: 0, brokenRiceQuintals: 0, branQuintals: 0, huskQuintals: 0,
  unaccountedQuintals: 0, shortfallQuintals: 0, downtimeMinutes: 0, recoveryPct: null, unaccountedPct: null, ...o })

beforeEach(() => {
  localStorage.clear()
  api.getProduction.mockResolvedValue({
    from: '2026-11-08', to: '2026-11-08', batchesInProgress: 1,
    totals: row('TOTAL', { batches: 2, paddyInQuintals: 300, riceQuintals: 185, unaccountedQuintals: 32, unaccountedPct: 10.67, shortfallQuintals: 3, recoveryPct: 61.67, downtimeMinutes: 135 }),
    days: [row('2026-11-08', { batches: 2, paddyInQuintals: 300, riceQuintals: 185, recoveryPct: 61.67, downtimeMinutes: 135 })],
    shifts: [row('MORNING', { batches: 1, paddyInQuintals: 100, riceQuintals: 65, recoveryPct: 65, downtimeMinutes: 45 }), row('AFTERNOON'),
      row('NIGHT', { batches: 1, paddyInQuintals: 200, riceQuintals: 120, recoveryPct: 60, downtimeMinutes: 90 })],
    downtimeByReason: [{ key: 'POWER_CUT', stoppages: 1, minutes: 90 }, { key: 'BREAKDOWN', stoppages: 1, minutes: 45 }],
    downtimeByMachine: [{ key: 'Main line', stoppages: 1, minutes: 90 }, { key: 'Husker', stoppages: 1, minutes: 45 }],
  })
})

describe('v4 Production', () => {
  it('shows output, recovery, losses, downtime and the shift comparison', async () => {
    renderV4(<Production />)
    expect((await screen.findByText('Machine downtime')).closest('div').parentElement).toHaveTextContent('2 h 15 min')
    expect(screen.getByText('Recovery 61.67%')).toBeInTheDocument()
    expect(screen.getByText(/10.67% of paddy · 3.00 Qtl short of expected/)).toBeInTheDocument()
    expect(screen.getByText(/Best recovery:/)).toHaveTextContent('Best recovery: Morning (65.00%) · lowest: Night (60.00%)')
    const shifts = screen.getByRole('grid', { name: 'Shift comparison' })
    expect(within(shifts).getByText('Night').closest('[role="row"]')).toHaveTextContent('1 h 30 min')
    expect(screen.getByText('Power cut')).toBeInTheDocument()
    expect(screen.getByText('Main line')).toBeInTheDocument()
    expect(api.getProduction).toHaveBeenCalledTimes(1)
  })
})

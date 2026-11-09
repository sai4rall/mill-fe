import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../shared/api/mill'
import MillOperations from './MillOperations'
import { renderV4 } from '../test/render'

vi.mock('../../shared/api/mill', () => ({ getBatches: vi.fn(), createBatch: vi.fn(), completeBatch: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  api.getBatches.mockResolvedValue([
    { id: 7, batchDate: '2026-11-08', shift: 'MORNING', paddyInputQuintals: 100, expectedRiceQuintals: 68, status: 'IN_PROGRESS' },
    { id: 6, batchDate: '2026-11-07', shift: 'NIGHT', paddyInputQuintals: 200, actualRiceQuintals: 120, conversionRate: 60, huskQuintals: 50, unaccountedQuintals: 30, status: 'COMPLETED' },
  ])
})

describe('v4 Batches — shifts and by-products', () => {
  it('shows the shift and losses on batches', async () => {
    renderV4(<MillOperations />)
    expect(await screen.findByText(/· Morning/)).toBeInTheDocument()
    expect(screen.getByText(/· Night/)).toBeInTheDocument()
    expect(screen.getByText('30.00 Qtl')).toBeInTheDocument() // unaccounted on the completed batch
  })

  it('records by-products when completing and previews recovery and loss', async () => {
    api.completeBatch.mockResolvedValue({})
    const u = userEvent.setup()
    renderV4(<MillOperations />)
    await u.click(await screen.findByRole('button', { name: /Complete batch/ }))
    const sheet = await screen.findByRole('dialog')
    await u.type(within(sheet).getByLabelText(/^Rice out/), '65')
    await u.type(within(sheet).getByLabelText(/^Broken rice/), '5')
    await u.type(within(sheet).getByLabelText(/^Bran/), '8')
    await u.type(within(sheet).getByLabelText(/^Husk/), '20')
    const preview = within(sheet).getByTestId('batch-preview')
    expect(preview).toHaveTextContent('65.00%')
    expect(preview).toHaveTextContent('2.00 Qtl')
    await u.click(within(sheet).getByRole('button', { name: 'Mark complete' }))
    await waitFor(() => expect(api.completeBatch).toHaveBeenCalledWith(7, expect.objectContaining({
      actualRiceQuintals: 65, brokenRiceQuintals: 5, branQuintals: 8, huskQuintals: 20,
    })))
  })

  it('refuses outputs heavier than the paddy input', async () => {
    const u = userEvent.setup()
    renderV4(<MillOperations />)
    await u.click(await screen.findByRole('button', { name: /Complete batch/ }))
    const sheet = await screen.findByRole('dialog')
    await u.type(within(sheet).getByLabelText(/^Rice out/), '90')
    await u.type(within(sheet).getByLabelText(/^Husk/), '20')
    await u.click(within(sheet).getByRole('button', { name: 'Mark complete' }))
    expect(await within(sheet).findByText('Rice and by-products cannot weigh more than the paddy input')).toBeInTheDocument()
    expect(api.completeBatch).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../../shared/api/mill'
import MillOperations from './MillOperations'
import { renderWithProviders } from '../../test/renderWithProviders'

vi.mock('../../../shared/api/mill', () => ({ getBatches: vi.fn(), createBatch: vi.fn(), completeBatch: vi.fn(), getPurchases: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  api.getPurchases.mockResolvedValue([])
  api.getBatches.mockResolvedValue([{ id: 7, batchDate: '2026-11-08', shift: 'MORNING', paddyInputQuintals: 100, status: 'IN_PROGRESS' }])
})

describe('Classic mill operations — shifts and by-products', () => {
  it('starts a batch with a shift', async () => {
    api.createBatch.mockResolvedValue({})
    const user = userEvent.setup()
    renderWithProviders(<MillOperations />)
    expect((await screen.findByText('2026-11-08')).closest('tr')).toHaveTextContent('Morning')
    await user.click(screen.getByRole('button', { name: /Start Batch/ }))
    await user.selectOptions(screen.getByLabelText('Shift *'), 'NIGHT')
    await user.type(screen.getAllByRole('spinbutton')[0], '50')
    await user.click(screen.getAllByRole('button', { name: /Start Batch/ }).at(-1))
    await waitFor(() => expect(api.createBatch).toHaveBeenCalled())
    expect(api.createBatch.mock.calls[0][0]).toMatchObject({ shift: 'NIGHT', paddyInputQuintals: 50 })
  })

  it('completes a batch with by-products and shows recovery and loss', async () => {
    api.completeBatch.mockResolvedValue({})
    const user = userEvent.setup()
    renderWithProviders(<MillOperations />)
    await user.click(await screen.findByRole('button', { name: /Complete/ }))
    const dialog = screen.getByRole('heading', { name: 'Complete Batch' }).closest('div').parentElement
    const [rice] = within(dialog).getAllByRole('spinbutton')
    await user.type(rice, '65')
    await user.type(within(dialog).getByLabelText('Husk'), '20')
    await user.type(within(dialog).getByLabelText('Bran'), '8')
    expect(within(dialog).getByTestId('batch-preview')).toHaveTextContent('65.00%')
    expect(within(dialog).getByTestId('batch-preview')).toHaveTextContent('7.00 Qtl')
    await user.click(within(dialog).getByRole('button', { name: 'Mark Complete' }))
    await waitFor(() => expect(api.completeBatch).toHaveBeenCalledWith(7, expect.objectContaining({ actualRiceQuintals: 65, huskQuintals: 20, branQuintals: 8, brokenRiceQuintals: null })))
  })
})

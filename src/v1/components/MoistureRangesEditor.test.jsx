import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MoistureRangesEditor from './MoistureRangesEditor'

const initial = [{ fromPct: 0, toPct: 15, deductionPct: 0 }, { fromPct: 15, toPct: null, deductionPct: 5 }]

function setup(props = {}) {
  const onSave = vi.fn()
  const user = userEvent.setup()
  render(<MoistureRangesEditor initial={initial} onSave={onSave} {...props} />)
  return { user, onSave }
}

describe('MoistureRangesEditor', () => {
  it('shows the initial ranges', () => {
    setup()
    expect(screen.getByLabelText('Range 1 from')).toHaveValue('0')
    expect(screen.getByLabelText('Range 2 to')).toHaveValue('')
    expect(screen.getByLabelText('Range 2 deduction')).toHaveValue('5')
  })

  it('saves the edited table as numbers sorted by from', async () => {
    const { user, onSave } = setup()
    await user.clear(screen.getByLabelText('Range 2 to'))
    await user.type(screen.getByLabelText('Range 2 to'), '17')
    await user.click(screen.getByRole('button', { name: 'Add range' }))
    // new row starts at the previous row's "to"
    expect(screen.getByLabelText('Range 3 from')).toHaveValue('17')
    await user.type(screen.getByLabelText('Range 3 deduction'), '20')
    await user.click(screen.getByRole('button', { name: 'Save ranges' }))

    expect(onSave).toHaveBeenCalledWith([
      { fromPct: 0, toPct: 15, deductionPct: 0 },
      { fromPct: 15, toPct: 17, deductionPct: 5 },
      { fromPct: 17, toPct: null, deductionPct: 20 },
    ])
  })

  it('blocks saving and shows per-row errors for overlaps and bad values', async () => {
    const { user, onSave } = setup()
    await user.click(screen.getByRole('button', { name: 'Add range' }))
    await user.type(screen.getByLabelText('Range 3 from'), '16')
    await user.type(screen.getByLabelText('Range 3 deduction'), '10')
    await user.click(screen.getByRole('button', { name: 'Save ranges' }))

    expect(screen.getByText('Overlaps another range')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()

    // fixing it clears the error live
    await user.click(screen.getByRole('button', { name: 'Remove range 3' }))
    expect(screen.queryByText('Overlaps another range')).not.toBeInTheDocument()
  })

  it('can save an empty table (no deduction)', async () => {
    const { user, onSave } = setup()
    await user.click(screen.getByRole('button', { name: 'Remove range 2' }))
    await user.click(screen.getByRole('button', { name: 'Remove range 1' }))
    expect(screen.getByText(/No ranges/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save ranges' }))
    expect(onSave).toHaveBeenCalledWith([])
  })

  it('shows a server error', () => {
    setup({ serverError: 'Range 15%: overlaps the previous range' })
    expect(screen.getByText('Range 15%: overlaps the previous range')).toBeInTheDocument()
  })
})

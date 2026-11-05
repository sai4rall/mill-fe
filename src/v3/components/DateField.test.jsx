import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DateField from './DateField'
import { renderV3 } from '../test/render'
import { todayISO } from '../../shared/utils/dates'

function Harness({ onChange = vi.fn(), initial = '', ...props }) {
  const [v, setV] = useState(initial)
  return <DateField id="d" value={v} onChange={(x) => { setV(x); onChange(x) }} {...props} />
}

const now = new Date()
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
// react-day-picker labels day buttons with the full date; match on the day number inside the grid.
const dayButton = (grid, n) => within(grid).getAllByRole('button').find(b => b.textContent === String(n) && !b.closest('[data-outside]'))

const open = async (u) => {
  await u.click(screen.getByRole('button', { name: /pick a date|\d{4}/i }))
  return screen.findByRole('grid')
}

describe('v3 DateField', () => {
  it('disables days after today', async () => {
    const u = userEvent.setup()
    renderV3(<Harness />)
    const grid = await open(u)
    expect(dayButton(grid, now.getDate())).not.toBeDisabled()
    if (now.getDate() < lastDay) expect(dayButton(grid, now.getDate() + 1)).toBeDisabled()
    if (now.getDate() > 1) expect(dayButton(grid, now.getDate() - 1)).not.toBeDisabled()
  })

  it('does not allow moving to a future month', async () => {
    const u = userEvent.setup()
    renderV3(<Harness />)
    await open(u)
    expect(screen.getByRole('button', { name: /next month/i })).toHaveAttribute('aria-disabled', 'true')
  })

  it('emits YYYY-MM-DD when a day is picked and shows it', async () => {
    const onChange = vi.fn()
    const u = userEvent.setup()
    renderV3(<Harness onChange={onChange} />)
    const grid = await open(u)
    await u.click(dayButton(grid, now.getDate()))
    expect(onChange).toHaveBeenLastCalledWith(todayISO())
    expect(screen.getByRole('button', { name: new RegExp(String(now.getFullYear())) })).toBeInTheDocument()
  })

  it('allows future days only when asked', async () => {
    if (now.getDate() === lastDay) return
    const u = userEvent.setup()
    renderV3(<Harness allowFuture />)
    const grid = await open(u)
    expect(dayButton(grid, now.getDate() + 1)).not.toBeDisabled()
  })
})

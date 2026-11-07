import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateInput } from './fields'
import { renderV4 } from '../test/render'
import { todayISO } from '../../shared/utils/dates'

function Harness({ onChange = vi.fn(), ...props }) {
  const [v, setV] = useState(todayISO())
  return <DateInput label="Purchase date" value={v} onChange={(x) => { setV(x); onChange(x) }} {...props} />
}

const now = new Date()
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
const openCalendar = async (u) => { await u.click(await screen.findByRole('button', { name: /calendar/i })); return screen.findByRole('grid') }
const cell = (grid, n) => within(grid).getAllByRole('gridcell').find(c => c.textContent.trim() === String(n) && !c.querySelector('[data-outside-month]'))
const isDisabled = (c) => [c, ...c.querySelectorAll('*')].some(e => e.getAttribute('aria-disabled') === 'true' || e.hasAttribute('data-disabled'))

describe('v4 DateInput', () => {
  it('disables days after today in the calendar', async () => {
    const u = userEvent.setup()
    renderV4(<Harness />)
    const grid = await openCalendar(u)
    expect(isDisabled(cell(grid, now.getDate()))).toBe(false)
    if (now.getDate() < lastDay) expect(isDisabled(cell(grid, now.getDate() + 1))).toBe(true)
  })

  it('allows future days only when asked', async () => {
    if (now.getDate() === lastDay) return
    const u = userEvent.setup()
    renderV4(<Harness allowFuture />)
    const grid = await openCalendar(u)
    expect(isDisabled(cell(grid, now.getDate() + 1))).toBe(false)
  })
})

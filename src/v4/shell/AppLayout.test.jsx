import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppLayout from './AppLayout'
import { asPhone, renderV4 } from '../test/render'

const auth = vi.hoisted(() => ({ user: { username: 'admin1', fullName: 'Ramesh Rao', role: 'MILL_ADMIN' } }))
vi.mock('../../shared/context/AuthContext', () => ({ useAuth: () => ({ user: auth.user, logout: vi.fn(), refreshSession: vi.fn() }) }))
vi.mock('../../shared/features/useFeatures', () => ({ useFeatures: () => ({ isLoading: false, flag: () => ({ showInMenu: true, enabled: true }) }) }))
vi.mock('../../shared/api/mill', () => ({
  getBranding: vi.fn().mockResolvedValue(null), getMillLogo: vi.fn(), getFarmers: vi.fn().mockResolvedValue([]),
  getPurchases: vi.fn().mockResolvedValue([]), createPurchase: vi.fn(),
}))
vi.mock('../../shared/api/moisture', () => ({ getMoistureTable: vi.fn().mockResolvedValue({ ranges: [], source: 'NONE' }) }))

let restore
beforeEach(() => { localStorage.clear(); auth.user = { username: 'admin1', fullName: 'Ramesh Rao', role: 'MILL_ADMIN' } })
afterEach(() => { restore?.(); restore = null })

describe('v4 AppLayout', () => {
  it('groups pages around the mill day and shows the pages of the current group', () => {
    renderV4(<AppLayout><p>page</p></AppLayout>, { route: '/v4/farmers' })
    const main = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(main).getAllByRole('link').map(a => a.textContent)).toEqual(['Today', 'Procurement', 'Milling', 'Sales', 'Settings'])
    expect(within(main).getByRole('link', { name: 'Procurement' })).toHaveAttribute('aria-current', 'page')
    const section = screen.getByRole('navigation', { name: 'Section' })
    expect(within(section).getAllByRole('link').map(a => a.textContent)).toEqual(['Purchases', 'Farmers', 'Rejected lorries', 'Money'])
    expect(within(section).getByRole('link', { name: 'Farmers' })).toHaveAttribute('aria-current', 'page')
  })

  it('has a Record purchase action that opens the entry sheet', async () => {
    const u = userEvent.setup()
    renderV4(<AppLayout><p>page</p></AppLayout>, { route: '/v4/today' })
    await u.click(screen.getByRole('button', { name: /Record purchase/ }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Record purchase')
  })

  it('keeps the classic view in the account menu, next to change password, with theme and language', async () => {
    const u = userEvent.setup()
    renderV4(<AppLayout><p>page</p></AppLayout>, { route: '/v4/today' })
    expect(screen.queryByText(/classic view/i)).toBeNull()
    await u.click(screen.getByRole('button', { name: 'Account menu' }))
    const items = (await screen.findAllByRole('menuitem')).map(i => i.textContent.trim())
    expect(items).toEqual(['Change password', 'Classic view', 'Logout'])
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument()
    await u.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeInTheDocument()
  })

  it('opens change password from the account menu', async () => {
    const u = userEvent.setup()
    renderV4(<AppLayout><p>page</p></AppLayout>, { route: '/v4/today' })
    await u.click(screen.getByRole('button', { name: 'Account menu' }))
    await u.click(await screen.findByRole('menuitem', { name: 'Change password' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Change password')
  })

  it('gives admins Today, Purchases, Batches, Money on the phone bar and the rest under More', async () => {
    restore = asPhone()
    const u = userEvent.setup()
    renderV4(<AppLayout><p>page</p></AppLayout>, { route: '/v4/operators' })
    const bar = screen.getAllByRole('navigation', { name: 'Main navigation' }).at(-1)
    expect(within(bar).getAllByRole('link').map(a => a.textContent)).toEqual(['Today', 'Purchases', 'Batches', 'Money'])
    expect(screen.getByRole('button', { name: 'Record purchase' })).toBeInTheDocument()
    await u.click(within(bar).getByRole('button', { name: 'More pages' }))
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByRole('link', { name: 'Operators' })).toHaveAttribute('aria-current', 'page')
    expect(within(sheet).queryByText(/classic view/i)).toBeNull()
  })

  it('gives operators Record first on the phone bar', () => {
    auth.user = { username: 'op1', fullName: 'Kiran', role: 'MILL_OPERATOR' }
    restore = asPhone()
    renderV4(<AppLayout><p>page</p></AppLayout>, { route: '/v4/purchases' })
    const bar = screen.getAllByRole('navigation', { name: 'Main navigation' }).at(-1)
    expect(within(bar).getAllByRole('button')[0]).toHaveAccessibleName('Record purchase')
    expect(within(bar).getAllByRole('link').map(a => a.textContent)).toEqual(['Purchases', 'Batches', 'Farmers'])
  })
})

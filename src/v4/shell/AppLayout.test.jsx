import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppLayout from './AppLayout'
import { asPhone, renderV4 } from '../test/render'

vi.mock('../../shared/context/AuthContext', () => ({ useAuth: () => ({ user: { username: 'admin1', fullName: 'Ramesh Rao', role: 'MILL_ADMIN' }, logout: vi.fn(), refreshSession: vi.fn() }) }))
vi.mock('../../shared/features/useFeatures', () => ({ useFeatures: () => ({ isLoading: false, flag: () => ({ showInMenu: true, enabled: true }) }) }))
vi.mock('../../shared/api/mill', () => ({ getBranding: vi.fn().mockResolvedValue(null), getMillLogo: vi.fn() }))

let restore
afterEach(() => restore?.())

describe('v4 AppLayout', () => {
  it('shows every page as a top tab and marks the current one', () => {
    renderV4(<AppLayout><p>page</p></AppLayout>, { route: '/v4/farmers' })
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(10)
    links.forEach(a => expect(a.getAttribute('href')).toMatch(/^\/v4\//))
    expect(within(nav).getByRole('link', { name: 'Farmers' })).toHaveAttribute('aria-current', 'page')
  })

  it('offers the classic view only in the account menu, next to change password', async () => {
    const u = userEvent.setup()
    renderV4(<AppLayout><p>page</p></AppLayout>, { route: '/v4/dashboard' })
    expect(screen.queryByText(/classic view/i)).toBeNull()
    await u.click(screen.getByRole('button', { name: 'Account menu' }))
    const items = (await screen.findAllByRole('menuitem')).map(i => i.textContent.trim())
    expect(items).toEqual(['Change password', 'Classic view', 'Logout'])
    expect(screen.getAllByText(/classic view/i)).toHaveLength(1)
  })

  it('opens change password from the account menu', async () => {
    const u = userEvent.setup()
    renderV4(<AppLayout><p>page</p></AppLayout>, { route: '/v4/dashboard' })
    await u.click(screen.getByRole('button', { name: 'Account menu' }))
    await u.click(await screen.findByRole('menuitem', { name: 'Change password' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Change password')
  })

  it('uses a bottom tab bar with a "More" sheet on phones', async () => {
    restore = asPhone()
    const u = userEvent.setup()
    renderV4(<AppLayout><p>page</p></AppLayout>, { route: '/v4/operators' })
    const bar = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(bar).getAllByRole('link')).toHaveLength(4)
    await u.click(within(bar).getByRole('button', { name: 'More pages' }))
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByRole('link', { name: 'Operators' })).toHaveAttribute('aria-current', 'page')
    expect(within(sheet).queryByText(/classic view/i)).toBeNull()
  })
})

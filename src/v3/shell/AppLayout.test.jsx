import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppLayout from './AppLayout'
import { renderV3 } from '../test/render'

vi.mock('../../shared/context/AuthContext', () => ({ useAuth: () => ({ user: { username: 'admin1', fullName: 'Ramesh Rao', role: 'MILL_ADMIN' }, logout: vi.fn(), refreshSession: vi.fn() }) }))
vi.mock('../../shared/features/useFeatures', () => ({ useFeatures: () => ({ isLoading: false, flag: () => ({ showInMenu: true, enabled: true }) }) }))
vi.mock('../../shared/api/mill', () => ({ getBranding: vi.fn().mockResolvedValue(null), getMillLogo: vi.fn() }))

describe('v3 AppLayout', () => {
  it('links only to v3 pages and titles the current page', async () => {
    renderV3(<AppLayout><p>page</p></AppLayout>, { route: '/v3/farmers' })
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    const hrefs = within(nav).getAllByRole('link').map(a => a.getAttribute('href'))
    expect(hrefs.length).toBe(10)
    hrefs.forEach(h => expect(h).toMatch(/^\/v3\//))
    expect(screen.getByRole('banner')).toHaveTextContent('Farmers')
    expect(screen.queryByText(/Classic UI|new UI/i)).toBeNull()
  })

  it('offers change password in the account menu', async () => {
    const u = userEvent.setup()
    renderV3(<AppLayout><p>page</p></AppLayout>, { route: '/v3/dashboard' })
    await u.click(screen.getByRole('button', { name: 'Account menu' }))
    await u.click(await screen.findByRole('menuitem', { name: 'Change password' }))
    expect(await screen.findByRole('dialog', { name: 'Change password' })).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Layout from './Layout'
import { getFeatures } from '../api/features'
import { renderWithProviders } from '../test/renderWithProviders'

const auth = vi.hoisted(() => ({ user: null }))
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: auth.user, logout: vi.fn() }) }))
vi.mock('../api/features', () => ({ getFeatures: vi.fn() }))
vi.mock('./MillBrand', () => ({ default: () => <div>brand</div> }))

const ALL_KEYS = ['dashboard', 'farmers', 'purchases', 'mill_operations', 'export_orders', 'shipments', 'truck_tracking', 'stock_report', 'operators', 'moisture_deduction']
const ALL_LABELS = ['Dashboard', 'Farmers', 'Purchases', 'Mill Operations', 'Export Orders', 'Shipments', 'Truck Tracking', 'Stock Report', 'Moisture Deductions', 'Operators']
const flags = (overrides = {}) =>
  ALL_KEYS.map(key => ({ key, name: key, showInMenu: true, enabled: true, ...overrides[key] }))

const menu = async () => {
  const nav = await screen.findByRole('navigation')
  await within(nav).findByText('Dashboard')
  return nav
}
const menuLabels = (nav) => within(nav).getAllByRole('link').map(a => a.textContent.replace('Soon', '').trim())

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = { username: 'admin1', role: 'MILL_ADMIN', millId: 1 }
})

describe('Layout menu feature flags', () => {
  it('shows every module when all flags are on', async () => {
    getFeatures.mockResolvedValue(flags())
    renderWithProviders(<Layout><p>page</p></Layout>)
    expect(menuLabels(await menu())).toEqual(ALL_LABELS)
  })

  it('hides a module whose showInMenu flag is off', async () => {
    getFeatures.mockResolvedValue(flags({ truck_tracking: { showInMenu: false }, farmers: { showInMenu: false } }))
    renderWithProviders(<Layout><p>page</p></Layout>)
    const labels = menuLabels(await menu())
    expect(labels).not.toContain('Truck Tracking')
    expect(labels).not.toContain('Farmers')
    expect(labels).toContain('Purchases')
  })

  it('keeps a shown-but-disabled module in the menu with a "Soon" badge', async () => {
    getFeatures.mockResolvedValue(flags({ farmers: { enabled: false } }))
    renderWithProviders(<Layout><p>page</p></Layout>)
    const nav = await menu()
    const farmers = await within(nav).findByRole('link', { name: /Farmers/ })
    expect(within(farmers).getByText('Soon')).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /Purchases/ })).not.toHaveTextContent('Soon')
  })

  it('hides a module that is both hidden and disabled', async () => {
    getFeatures.mockResolvedValue(flags({ stock_report: { showInMenu: false, enabled: false } }))
    renderWithProviders(<Layout><p>page</p></Layout>)
    expect(menuLabels(await menu())).not.toContain('Stock Report')
  })

  it('still applies role rules: operators never see admin-only modules', async () => {
    auth.user = { username: 'op1', role: 'MILL_OPERATOR', millId: 1 }
    getFeatures.mockResolvedValue(flags())
    renderWithProviders(<Layout><p>page</p></Layout>)
    const labels = menuLabels(await menu())
    expect(labels).not.toContain('Truck Tracking')
    expect(labels).not.toContain('Operators')
    expect(labels).not.toContain('Moisture Deductions')
  })

  it('hides Moisture Deductions with its own moisture_deduction flag, independently of Purchases', async () => {
    getFeatures.mockResolvedValue(flags({ moisture_deduction: { showInMenu: false } }))
    renderWithProviders(<Layout><p>page</p></Layout>)
    const labels = menuLabels(await menu())
    expect(labels).not.toContain('Moisture Deductions')
    expect(labels).toContain('Purchases')
  })

  it('shows modules missing from the API response (fail open)', async () => {
    getFeatures.mockResolvedValue([{ key: 'farmers', name: 'Farmers', showInMenu: false, enabled: true }])
    renderWithProviders(<Layout><p>page</p></Layout>)
    const labels = menuLabels(await menu())
    expect(labels).not.toContain('Farmers')
    expect(labels).toContain('Purchases')
  })

  it('shows the full menu if the flags API fails', async () => {
    getFeatures.mockRejectedValue(new Error('network'))
    renderWithProviders(<Layout><p>page</p></Layout>)
    expect(menuLabels(await menu())).toEqual(ALL_LABELS)
  })

  it('shows the super admin menu according to the global flags', async () => {
    auth.user = { username: 'superadmin', role: 'SUPER_ADMIN', millId: null }
    getFeatures.mockResolvedValue(flags())
    renderWithProviders(<Layout><p>page</p></Layout>)
    const nav = await screen.findByRole('navigation')
    await within(nav).findByText('Moisture Deductions')
    expect(menuLabels(nav)).toEqual(['Mills', 'Moisture Deductions'])
  })

  it('hides the super admin moisture screen when moisture is switched off globally', async () => {
    auth.user = { username: 'superadmin', role: 'SUPER_ADMIN', millId: null }
    getFeatures.mockResolvedValue(flags({ moisture_deduction: { showInMenu: false, enabled: false } }))
    renderWithProviders(<Layout><p>page</p></Layout>)
    const nav = await screen.findByRole('navigation')
    await waitFor(() => expect(getFeatures).toHaveBeenCalled())
    await waitFor(() => expect(menuLabels(nav)).toEqual(['Mills']))
  })

  it('shows only the Dev Console for the dev admin, without loading mill flags', async () => {
    auth.user = { username: 'devadmin', role: 'DEV_ADMIN', millId: null }
    renderWithProviders(<Layout><p>page</p></Layout>)
    const nav = await screen.findByRole('navigation')
    expect(menuLabels(nav)).toEqual(['Dev Console'])
    expect(screen.getByText('DEV ADMIN')).toBeInTheDocument()
    expect(getFeatures).not.toHaveBeenCalled()
  })
})

describe('Layout on small screens (sidebar drawer)', () => {
  const sidebar = () => document.getElementById('app-sidebar')
  const isOpen = () => sidebar().className.includes('translate-x-0') && !sidebar().className.includes('-translate-x-full')
  beforeEach(() => getFeatures.mockResolvedValue(flags()))

  it('starts closed and opens with the menu button', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Layout><p>page</p></Layout>)
    await menu()
    const toggle = screen.getByRole('button', { name: 'Open menu' })
    expect(isOpen()).toBe(false)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(isOpen()).toBe(true)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes with the close button, the backdrop and Escape', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Layout><p>page</p></Layout>)
    await menu()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(isOpen()).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    fireEvent.click(document.querySelector('[aria-hidden="true"].fixed'))
    expect(isOpen()).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.keyboard('{Escape}')
    expect(isOpen()).toBe(false)
  })

  it('closes after navigating to another page', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Layout><p>page</p></Layout>, { route: '/dashboard' })
    const nav = await menu()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(within(nav).getByRole('link', { name: /Farmers/ }))
    expect(isOpen()).toBe(false)
  })
})

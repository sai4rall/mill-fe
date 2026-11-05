import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DevConsole from './DevConsole'
import * as dev from '../../api/dev'
import { renderWithProviders } from '../../test/renderWithProviders'

vi.mock('../../api/dev', () => ({
  getGlobalFlags: vi.fn(), updateGlobalFlag: vi.fn(), getMillFlags: vi.fn(), setMillFlag: vi.fn(),
  getDevMills: vi.fn(), getDevMillLogo: vi.fn(), uploadMillLogo: vi.fn(), deleteMillLogo: vi.fn(),
  getSuperAdmins: vi.fn(), createSuperAdmin: vi.fn(), toggleSuperAdmin: vi.fn(), resetSuperAdminPassword: vi.fn(),
}))

const mills = [
  { millId: 1, millName: 'Sri Lakshmi Rice Mill', location: 'Nalgonda', status: 'ACTIVE', logoUpdatedAt: '2026-11-01T10:00:00' },
  { millId: 2, millName: 'Sai Test', location: null, status: 'ACTIVE', logoUpdatedAt: null },
]
const globalFlags = [
  { key: 'farmers', name: 'Farmers', showInMenu: true, enabled: true },
  { key: 'truck_tracking', name: 'Truck Tracking', showInMenu: true, enabled: false },
]
const millFlags = [
  { key: 'farmers', name: 'Farmers', globalShowInMenu: true, globalEnabled: true, overrideShowInMenu: null, overrideEnabled: false, showInMenu: true, enabled: false },
  { key: 'truck_tracking', name: 'Truck Tracking', globalShowInMenu: true, globalEnabled: false, overrideShowInMenu: null, overrideEnabled: null, showInMenu: true, enabled: false },
]

function setup() {
  const user = userEvent.setup()
  renderWithProviders(<DevConsole />)
  return user
}

beforeEach(() => {
  vi.clearAllMocks()
  dev.getDevMills.mockResolvedValue(mills)
  dev.getGlobalFlags.mockResolvedValue(globalFlags)
  dev.getMillFlags.mockResolvedValue(millFlags)
  dev.updateGlobalFlag.mockResolvedValue({})
  dev.setMillFlag.mockResolvedValue({})
  dev.getDevMillLogo.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  dev.uploadMillLogo.mockResolvedValue({})
  dev.deleteMillLogo.mockResolvedValue({})
  dev.getSuperAdmins.mockResolvedValue([
    { id: 1, username: 'superadmin', fullName: 'Super Administrator', active: true },
    { id: 7, username: 'ops_super', fullName: null, active: false },
  ])
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:logo')
  globalThis.URL.revokeObjectURL = vi.fn()
})

describe('Dev Console — feature flags', () => {
  it('shows global toggles reflecting current values', async () => {
    setup()
    expect(await screen.findByRole('switch', { name: 'Farmers enabled' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('switch', { name: 'Truck Tracking enabled' })).toHaveAttribute('aria-checked', 'false')
  })

  it('updates only the toggled global flag', async () => {
    const user = setup()
    await user.click(await screen.findByRole('switch', { name: 'Truck Tracking enabled' }))
    await waitFor(() => expect(dev.updateGlobalFlag).toHaveBeenCalledWith('truck_tracking', { enabled: true }))

    await user.click(screen.getByRole('switch', { name: 'Farmers show in menu' }))
    await waitFor(() => expect(dev.updateGlobalFlag).toHaveBeenCalledWith('farmers', { showInMenu: false }))
  })

  it('switches to a mill and shows inherit/on/off overrides with effective values', async () => {
    const user = setup()
    await screen.findByRole('option', { name: 'Sri Lakshmi Rice Mill' })
    await user.selectOptions(screen.getByLabelText('Apply to'), '1')

    const enabledSelect = await screen.findByRole('combobox', { name: 'Farmers enabled' })
    expect(dev.getMillFlags).toHaveBeenCalledWith('1')
    expect(enabledSelect).toHaveValue('off')
    expect(screen.getByRole('combobox', { name: 'Farmers show in menu' })).toHaveValue('inherit')
    expect(within(screen.getByRole('combobox', { name: 'Truck Tracking enabled' })).getByRole('option', { name: 'Inherit (Off)' })).toBeInTheDocument()
    expect(screen.getAllByText('Not enabled').length).toBe(2)
  })

  it('sends both override fields so the untouched one is preserved', async () => {
    const user = setup()
    await screen.findByRole('option', { name: 'Sri Lakshmi Rice Mill' })
    await user.selectOptions(screen.getByLabelText('Apply to'), '1')
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Farmers show in menu' }), 'off')

    await waitFor(() => expect(dev.setMillFlag).toHaveBeenCalledWith('1', 'farmers', { showInMenu: false, enabled: false }))
  })

  it('choosing "Inherit" clears that field of the override', async () => {
    const user = setup()
    await screen.findByRole('option', { name: 'Sri Lakshmi Rice Mill' })
    await user.selectOptions(screen.getByLabelText('Apply to'), '1')
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Farmers enabled' }), 'inherit')

    await waitFor(() => expect(dev.setMillFlag).toHaveBeenCalledWith('1', 'farmers', { showInMenu: null, enabled: null }))
  })

  it('shows the server error if an update fails', async () => {
    dev.updateGlobalFlag.mockRejectedValue({ response: { data: { error: 'Feature not found: farmers' } } })
    const user = setup()
    await user.click(await screen.findByRole('switch', { name: 'Farmers enabled' }))
    expect(await screen.findByText('Feature not found: farmers')).toBeInTheDocument()
  })
})

describe('Dev Console — mill logos', () => {
  async function openLogos(user) {
    await user.click(screen.getByRole('tab', { name: /Mill Logos/ }))
    return screen.findByTestId('mill-logo-1')
  }

  it('lists every mill with its current logo or a placeholder', async () => {
    const user = setup()
    const withLogo = await openLogos(user)
    expect(await within(withLogo).findByAltText('Sri Lakshmi Rice Mill logo')).toHaveAttribute('src', 'blob:logo')
    expect(within(withLogo).getByRole('button', { name: /Replace logo/ })).toBeInTheDocument()

    const without = screen.getByTestId('mill-logo-2')
    expect(within(without).getByLabelText('No logo')).toBeInTheDocument()
    expect(within(without).getByRole('button', { name: /Upload logo/ })).toBeInTheDocument()
    expect(within(without).queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
  })

  it('uploads a valid logo for the chosen mill', async () => {
    const user = setup()
    await openLogos(user)
    const png = new File(['png'], 'logo.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Sai Test logo file'), png)
    await waitFor(() => expect(dev.uploadMillLogo).toHaveBeenCalledWith(2, png))
  })

  it.each([
    ['an SVG', new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }), 'Logo must be a PNG, JPEG or WebP image'],
    ['a file over 1 MB', new File([new Uint8Array(1024 * 1024 + 1)], 'big.png', { type: 'image/png' }), 'Logo must be 1 MB or smaller'],
  ])('rejects %s before uploading', async (_, file, message) => {
    const user = userEvent.setup({ applyAccept: false })
    renderWithProviders(<DevConsole />)
    await openLogos(user)
    await user.upload(screen.getByLabelText('Sai Test logo file'), file)
    expect(await within(screen.getByTestId('mill-logo-2')).findByText(message)).toBeInTheDocument()
    expect(dev.uploadMillLogo).not.toHaveBeenCalled()
  })

  it('shows the server error if the upload is rejected', async () => {
    dev.uploadMillLogo.mockRejectedValue({ response: { data: { error: 'Logo must be a PNG, JPEG or WebP image' } } })
    const user = setup()
    await openLogos(user)
    await user.upload(screen.getByLabelText('Sai Test logo file'), new File(['x'], 'fake.png', { type: 'image/png' }))
    expect(await within(screen.getByTestId('mill-logo-2')).findByRole('alert')).toHaveTextContent('Logo must be a PNG, JPEG or WebP image')
  })

  it('removes a logo', async () => {
    const user = setup()
    await openLogos(user)
    await user.click(screen.getByRole('button', { name: 'Remove Sri Lakshmi Rice Mill logo' }))
    await waitFor(() => expect(dev.deleteMillLogo).toHaveBeenCalledWith(1))
  })
})

describe('Dev Console — super admins', () => {
  async function openSupers(user) {
    await user.click(screen.getByRole('tab', { name: /Super Admins/ }))
    await screen.findByRole('cell', { name: 'ops_super' })
  }

  it('lists super admins with their status', async () => {
    const user = setup()
    await openSupers(user)
    expect(screen.getByRole('cell', { name: 'superadmin' }).closest('tr')).toHaveTextContent('Active')
    expect(screen.getByRole('cell', { name: 'ops_super' }).closest('tr')).toHaveTextContent('Disabled')
  })

  it('validates the form before creating', async () => {
    const user = setup()
    await openSupers(user)
    await user.click(screen.getByRole('button', { name: /Add Super Admin/ }))
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByText('Username is required')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Username *'), 'a b')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByText(/3-50 characters/)).toBeInTheDocument()
    expect(dev.createSuperAdmin).not.toHaveBeenCalled()
  })

  it('creates a super admin and shows the one-time password', async () => {
    dev.createSuperAdmin.mockResolvedValue({ id: 9, username: 'new_super', generatedPassword: 'Xy7#pQ2!aB9z' })
    const user = setup()
    await openSupers(user)
    await user.click(screen.getByRole('button', { name: /Add Super Admin/ }))
    await user.type(screen.getByLabelText('Username *'), ' new_super ')
    await user.type(screen.getByLabelText('Full name'), 'New Super')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(dev.createSuperAdmin).toHaveBeenCalledWith({ username: 'new_super', fullName: 'New Super' }))
    expect(await screen.findByRole('heading', { name: 'Super admin created' })).toBeInTheDocument()
    expect(screen.getByText(/Password for new_super/)).toBeInTheDocument()
  })

  it('shows the server error for a duplicate username', async () => {
    dev.createSuperAdmin.mockRejectedValue({ response: { data: { error: "Username 'superadmin' is already taken" } } })
    const user = setup()
    await openSupers(user)
    await user.click(screen.getByRole('button', { name: /Add Super Admin/ }))
    await user.type(screen.getByLabelText('Username *'), 'superadmin')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(await screen.findByText("Username 'superadmin' is already taken")).toBeInTheDocument()
  })

  it('enables/disables and resets passwords', async () => {
    dev.toggleSuperAdmin.mockResolvedValue({})
    dev.resetSuperAdminPassword.mockResolvedValue({ generatedPassword: 'N3w#Passw0rd' })
    const user = setup()
    await openSupers(user)

    await user.click(screen.getByRole('button', { name: 'Enable ops_super' }))
    await waitFor(() => expect(dev.toggleSuperAdmin).toHaveBeenCalledWith(7))

    await user.click(screen.getByRole('button', { name: 'Reset password for superadmin' }))
    await waitFor(() => expect(dev.resetSuperAdminPassword).toHaveBeenCalledWith(1))
    expect(await screen.findByText(/New password for superadmin/)).toBeInTheDocument()
  })
})

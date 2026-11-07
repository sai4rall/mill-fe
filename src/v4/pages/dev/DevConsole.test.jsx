import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as dev from '../../../shared/api/dev'
import DevConsole from './DevConsole'
import { renderV4 } from '../../test/render'

vi.mock('../../../shared/context/AuthContext', () => ({ useAuth: () => ({ user: { username: 'devadmin', role: 'DEV_ADMIN' } }) }))
vi.mock('../../../shared/api/dev', () => ({
  getGlobalFlags: vi.fn(), updateGlobalFlag: vi.fn(), getMillFlags: vi.fn(), setMillFlag: vi.fn(),
  getDevMills: vi.fn(), getDevMillLogo: vi.fn(), uploadMillLogo: vi.fn(), deleteMillLogo: vi.fn(),
  getSuperAdmins: vi.fn(), createSuperAdmin: vi.fn(), toggleSuperAdmin: vi.fn(), resetSuperAdminPassword: vi.fn(),
  setMillStatus: vi.fn(), deleteMill: vi.fn(), assignMillOwner: vi.fn(), deleteSuperAdmin: vi.fn(), getAllUsers: vi.fn(), resetUserPassword: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  dev.getGlobalFlags.mockResolvedValue([])
  dev.getDevMills.mockResolvedValue([{ millId: 2, millName: 'Sai Test', status: 'ACTIVE', logoUpdatedAt: null }])
  dev.getSuperAdmins.mockResolvedValue([{ id: 7, username: 'ops_super', active: true }])
  dev.getAllUsers.mockResolvedValue([
    { id: 8, username: 'devadmin', role: 'DEV_ADMIN', active: true },
    { id: 20, username: 'op_ravi', role: 'MILL_OPERATOR', millName: 'Sai Test', millStatus: 'ACTIVE', active: true },
  ])
})

describe('v4 Dev Console', () => {
  it('deactivates a mill and deletes it only after the name is typed', async () => {
    dev.setMillStatus.mockResolvedValue({})
    dev.deleteMill.mockResolvedValue({})
    const u = userEvent.setup()
    renderV4(<DevConsole />)
    await u.click(screen.getByRole('tab', { name: /Mills/ }))
    await u.click(await screen.findByRole('button', { name: 'Deactivate Sai Test' }))
    await waitFor(() => expect(dev.setMillStatus).toHaveBeenCalledWith(2, 'INACTIVE'))

    await u.click(screen.getByRole('button', { name: 'Delete Sai Test' }))
    const dialog = await screen.findByRole('dialog')
    const confirm = within(dialog).getByRole('button', { name: 'Delete mill permanently' })
    expect(confirm).toBeDisabled()
    await u.type(within(dialog).getByLabelText(/to confirm/), 'Sai Test')
    await u.click(confirm)
    await waitFor(() => expect(dev.deleteMill).toHaveBeenCalledWith(2, 'Sai Test'))
  })

  it('shows the owning company and warns about mills no company owns', async () => {
    dev.getDevMills.mockResolvedValue([
      { millId: 2, millName: 'Sai Test', status: 'ACTIVE', ownerId: 7, ownerUsername: 'ops_super' },
      { millId: 3, millName: 'Orphan Mill', status: 'ACTIVE', ownerId: null },
    ])
    const u = userEvent.setup()
    renderV4(<DevConsole />)
    await u.click(screen.getByRole('tab', { name: /Mills/ }))
    const owned = await screen.findByTestId('mill-logo-2')
    await waitFor(() => expect(within(owned).getAllByText('ops_super').length).toBeGreaterThan(0))
    expect(within(screen.getByTestId('mill-logo-3')).getByText(/no super admin can see it/)).toBeInTheDocument()
  })

  it('deletes a super admin after confirming', async () => {
    dev.deleteSuperAdmin.mockResolvedValue({})
    const u = userEvent.setup()
    renderV4(<DevConsole />)
    await u.click(screen.getByRole('tab', { name: /Super Admins/ }))
    await u.click(await screen.findByRole('button', { name: 'Delete ops_super' }))
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(dev.deleteSuperAdmin).toHaveBeenCalledWith(7))
  })

  it('resets any account password except your own', async () => {
    dev.resetUserPassword.mockResolvedValue({ generatedPassword: 'Op#New9pass' })
    const u = userEvent.setup()
    renderV4(<DevConsole />)
    await u.click(screen.getByRole('tab', { name: /Accounts/ }))
    expect(await screen.findByText('You · use Change password')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset password for devadmin' })).toBeNull()
    await u.click(screen.getByRole('button', { name: 'Reset password for op_ravi' }))
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Reset password' }))
    await waitFor(() => expect(dev.resetUserPassword).toHaveBeenCalledWith(20))
    await u.click(await screen.findByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('Generated password')).toHaveTextContent('Op#New9pass')
  })
})

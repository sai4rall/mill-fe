import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChangePasswordDialog from './ChangePasswordDialog'
import { changePassword } from '../../shared/api/auth'
import { renderV4 } from '../test/render'

const refreshSession = vi.fn()
vi.mock('../../shared/api/auth', () => ({ changePassword: vi.fn() }))
vi.mock('../../shared/context/AuthContext', () => ({ useAuth: () => ({ user: { username: 'ramesh' }, refreshSession }) }))

const fill = async (current, next, confirm = next) => {
  const u = userEvent.setup()
  await u.type(screen.getByLabelText(/^Current password/), current)
  await u.type(screen.getByLabelText(/^New password/), next)
  await u.type(screen.getByLabelText(/^Confirm new password/), confirm)
  await u.click(screen.getByRole('button', { name: 'Change password' }))
}

beforeEach(() => vi.clearAllMocks())

describe('v4 ChangePasswordDialog', () => {
  it('changes the password, refreshes the session and closes', async () => {
    changePassword.mockResolvedValue({ token: 'fresh' })
    const onClose = vi.fn()
    renderV4(<ChangePasswordDialog open onClose={onClose} />)
    await fill('OldPass123', 'NewPass456')
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(changePassword).toHaveBeenCalledWith({ currentPassword: 'OldPass123', newPassword: 'NewPass456' })
    expect(refreshSession).toHaveBeenCalledWith({ token: 'fresh' })
  })

  it('validates locally before calling the API', async () => {
    renderV4(<ChangePasswordDialog open onClose={vi.fn()} />)
    await fill('OldPass123', 'ramesh123', 'ramesh123')
    expect(await screen.findByText('New password must not contain your username')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })
})

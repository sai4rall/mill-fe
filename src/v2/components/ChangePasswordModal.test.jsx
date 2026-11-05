import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChangePasswordModal from './ChangePasswordModal'
import { changePassword } from '../../shared/api/auth'
import { renderV2 } from '../test/render'

const refreshSession = vi.fn()
vi.mock('../../shared/api/auth', () => ({ changePassword: vi.fn() }))
vi.mock('../../shared/context/AuthContext', () => ({ useAuth: () => ({ user: { username: 'ramesh' }, refreshSession }) }))

beforeEach(() => vi.clearAllMocks())

describe('ChangePasswordModal (v2)', () => {
  it('changes the password and closes', async () => {
    changePassword.mockResolvedValue({ token: 'fresh' })
    const onClose = vi.fn()
    renderV2(<ChangePasswordModal opened onClose={onClose} />)
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Current password'), 'OldPass123')
    await u.type(screen.getByLabelText('New password'), 'NewPass456')
    await u.type(screen.getByLabelText('Confirm new password'), 'NewPass456')
    await u.click(screen.getByRole('button', { name: 'Change password' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(refreshSession).toHaveBeenCalledWith({ token: 'fresh' })
  })

  it('shows policy errors without calling the API', async () => {
    renderV2(<ChangePasswordModal opened onClose={vi.fn()} />)
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Current password'), 'OldPass123')
    await u.type(screen.getByLabelText('New password'), 'ramesh123')
    await u.type(screen.getByLabelText('Confirm new password'), 'ramesh123')
    await u.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('New password must not contain your username')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })
})

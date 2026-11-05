import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChangePasswordModal from './ChangePasswordModal'
import { changePassword } from '../../shared/api/auth'

const refreshSession = vi.fn()
vi.mock('../../shared/api/auth', () => ({ changePassword: vi.fn() }))
vi.mock('../../shared/context/AuthContext', () => ({ useAuth: () => ({ user: { username: 'ramesh' }, refreshSession }) }))

const fill = async (current, next, confirm = next) => {
  const u = userEvent.setup()
  if (current) await u.type(screen.getByLabelText('Current password'), current)
  if (next) await u.type(screen.getByLabelText('New password'), next)
  if (confirm) await u.type(screen.getByLabelText('Confirm new password'), confirm)
  await u.click(screen.getByRole('button', { name: 'Change password' }))
}

beforeEach(() => vi.clearAllMocks())

describe('ChangePasswordModal (classic)', () => {
  it('validates before calling the API', async () => {
    render(<ChangePasswordModal onClose={vi.fn()} />)
    await fill('', '')
    expect(screen.getByText('Current password is required')).toBeInTheDocument()
    expect(screen.getByText('New password is required')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('rejects a mismatched confirmation', async () => {
    render(<ChangePasswordModal onClose={vi.fn()} />)
    await fill('OldPass123', 'NewPass456', 'NewPass457')
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('submits, refreshes the session and reports success', async () => {
    const res = { token: 'fresh', username: 'ramesh', role: 'MILL_ADMIN' }
    changePassword.mockResolvedValue(res)
    const onChanged = vi.fn()
    render(<ChangePasswordModal onClose={vi.fn()} onChanged={onChanged} />)
    await fill('OldPass123', 'NewPass456')
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(changePassword).toHaveBeenCalledWith({ currentPassword: 'OldPass123', newPassword: 'NewPass456' })
    expect(refreshSession).toHaveBeenCalledWith(res)
  })

  it('shows a wrong current password on that field', async () => {
    changePassword.mockRejectedValue({ response: { status: 400, data: { error: 'Current password is incorrect' } } })
    render(<ChangePasswordModal onClose={vi.fn()} />)
    await fill('Wrong1234', 'NewPass456')
    expect(await screen.findByText('Current password is incorrect')).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toHaveAttribute('aria-invalid', 'true')
    expect(refreshSession).not.toHaveBeenCalled()
  })
})

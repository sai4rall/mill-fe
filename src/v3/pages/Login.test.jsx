import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'
import { renderV3 } from '../test/render'

const login = vi.fn()
const navigate = vi.fn()
vi.mock('../../shared/context/AuthContext', () => ({ useAuth: () => ({ login }) }))
vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => navigate }))

beforeEach(() => vi.clearAllMocks())

describe('v3 Login', () => {
  it('signs in and goes to the role home', async () => {
    login.mockResolvedValue({ role: 'SUPER_ADMIN' })
    renderV3(<Login />)
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Username'), '  superadmin ')
    await u.type(screen.getByLabelText('Password'), 'Admin@123')
    await u.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/v3/admin'))
    expect(login).toHaveBeenCalledWith('superadmin', 'Admin@123')
  })

  it('shows the server error', async () => {
    login.mockRejectedValue({ response: { data: { error: 'Invalid username or password' } } })
    renderV3(<Login />)
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Username'), 'x')
    await u.type(screen.getByLabelText('Password'), 'y')
    await u.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('does not link to the other UIs', () => {
    renderV3(<Login />)
    expect(screen.queryByRole('link')).toBeNull()
  })
})

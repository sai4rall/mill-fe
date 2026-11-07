import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'
import { renderV4 } from '../test/render'

const login = vi.fn()
const navigate = vi.fn()
vi.mock('../../shared/context/AuthContext', () => ({ useAuth: () => ({ login }) }))
vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => navigate }))

beforeEach(() => vi.clearAllMocks())

describe('v4 Login', () => {
  it('signs in and goes to the role home', async () => {
    login.mockResolvedValue({ role: 'MILL_ADMIN' })
    renderV4(<Login />)
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Username'), ' admin1 ')
    await u.type(screen.getByLabelText('Password'), 'Admin@123')
    await u.click(screen.getByRole('button', { name: /Sign in/ }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/v4/dashboard'))
    expect(login).toHaveBeenCalledWith('admin1', 'Admin@123')
  })

  it('shows the server error', async () => {
    login.mockRejectedValue({ response: { data: { error: 'Invalid username or password' } } })
    renderV4(<Login />)
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Username'), 'x')
    await u.type(screen.getByLabelText('Password'), 'y')
    await u.click(screen.getByRole('button', { name: /Sign in/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password')
  })

  it('links back to the classic view', () => {
    renderV4(<Login />)
    expect(screen.getByRole('link', { name: 'Use the classic view' })).toHaveAttribute('href', '/login')
  })
})

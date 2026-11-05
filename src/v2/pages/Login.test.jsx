import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import Login from './Login'
import { renderV2 } from '../test/render'

const auth = vi.hoisted(() => ({ login: vi.fn() }))
vi.mock('../../shared/context/AuthContext', () => ({ useAuth: () => ({ login: auth.login }) }))

beforeEach(() => vi.clearAllMocks())

function setup() {
  const user = userEvent.setup()
  renderV2(<Routes>
    <Route path="/v2/login" element={<Login />} />
    <Route path="/v2/dashboard" element={<p>v2 dashboard</p>} />
    <Route path="/v2/dev" element={<p>v2 dev console</p>} />
  </Routes>, { route: '/v2/login' })
  return user
}

describe('v2 login', () => {
  it('signs in and lands on the role home inside /v2', async () => {
    auth.login.mockResolvedValue({ role: 'MILL_ADMIN' })
    const user = setup()
    await user.type(screen.getByLabelText(/Username/), '  ramesh_admin ')
    await user.type(screen.getByLabelText(/Password/), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('ramesh_admin', 'secret'))
    expect(await screen.findByText('v2 dashboard')).toBeInTheDocument()
  })

  it('sends the dev admin to the v2 Dev Console', async () => {
    auth.login.mockResolvedValue({ role: 'DEV_ADMIN' })
    const user = setup()
    await user.type(screen.getByLabelText(/Username/), 'devadmin')
    await user.type(screen.getByLabelText(/Password/), 'x')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('v2 dev console')).toBeInTheDocument()
  })

  it('shows the server error for bad credentials', async () => {
    auth.login.mockRejectedValue({ response: { data: { error: 'Invalid username or password' } } })
    const user = setup()
    await user.type(screen.getByLabelText(/Username/), 'x')
    await user.type(screen.getByLabelText(/Password/), 'y')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument()
  })

  it('links back to the classic UI', () => {
    setup()
    expect(screen.getByRole('link', { name: 'Use the classic UI' })).toHaveAttribute('href', '/login')
  })
})

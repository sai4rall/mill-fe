import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { logout as apiLogout } from '../api/auth'

vi.mock('../api/auth', () => ({ login: vi.fn(), logout: vi.fn().mockResolvedValue({}) }))

let auth
function Probe() { auth = useAuth(); return null }

beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

describe('AuthContext logout', () => {
  it('clears the session immediately and revokes the token on the server', () => {
    localStorage.setItem('token', 'tok-1'); localStorage.setItem('user', JSON.stringify({ username: 'a' })); localStorage.setItem('ui-pref', 'x')
    render(<AuthProvider><Probe /></AuthProvider>)
    act(() => auth.logout())
    expect(auth.user).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('ui-pref')).toBe('x') // other preferences survive
    expect(apiLogout).toHaveBeenCalledWith('tok-1')
  })

  it('does not call the server when nobody is signed in', () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    act(() => auth.logout())
    expect(apiLogout).not.toHaveBeenCalled()
  })
})

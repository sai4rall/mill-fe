import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from './client'

// Exercise the response interceptor directly.
const reject = api.interceptors.response.handlers[0].rejected
const err = (status, url) => ({ response: { status }, config: { url } })

const addToken = api.interceptors.request.handlers[0].fulfilled

describe('API client request token', () => {
  it('attaches the session token, except on the sign-in request', () => {
    localStorage.setItem('token', 'stale')
    expect(addToken({ url: '/farmers', headers: {} }).headers.Authorization).toBe('Bearer stale')
    expect(addToken({ url: '/auth/login', headers: {} }).headers.Authorization).toBeUndefined()
    expect(addToken({ url: '/auth/logout', headers: { Authorization: 'Bearer explicit' } }).headers.Authorization).toBe('Bearer explicit')
    localStorage.clear()
  })
})

describe('API client session handling', () => {
  beforeEach(() => {
    localStorage.clear()
    delete window.location
    window.location = { pathname: '/v4/farmers', href: '/v4/farmers' }
  })

  it('sends the user to their UI login page when a stored session ends', async () => {
    localStorage.setItem('token', 't'); localStorage.setItem('user', '{}'); localStorage.setItem('other', 'kept')
    await expect(reject(err(401, '/farmers'))).rejects.toBeTruthy()
    expect(window.location.href).toBe('/v4/login')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('other')).toBe('kept')
  })

  it('does not redirect on a failed login, so the screen can show the error', async () => {
    localStorage.setItem('token', 't')
    await expect(reject(err(401, '/auth/login'))).rejects.toBeTruthy()
    expect(window.location.href).toBe('/v4/farmers')
    expect(localStorage.getItem('token')).toBe('t')
  })

  it('does not redirect when nobody is signed in', async () => {
    await expect(reject(err(401, '/farmers'))).rejects.toBeTruthy()
    expect(window.location.href).toBe('/v4/farmers')
  })

  it('leaves 403 and other errors to the screen', async () => {
    localStorage.setItem('token', 't')
    await expect(reject(err(403, '/farmers'))).rejects.toBeTruthy()
    expect(window.location.href).toBe('/v4/farmers')
    vi.restoreAllMocks()
  })
})

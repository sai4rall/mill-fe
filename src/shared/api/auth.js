import api from './client'

export const login = (data) => api.post('/auth/login', data).then(r => r.data)
export const changePassword = (data) => api.post('/auth/change-password', data).then(r => r.data)

/** Revokes the token on the server. The token is passed explicitly because the session is cleared at the same time. */
export const logout = (token) => api.post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } })

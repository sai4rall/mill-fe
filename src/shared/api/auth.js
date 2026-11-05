import api from './client'

export const login = (data) => api.post('/auth/login', data).then(r => r.data)
export const changePassword = (data) => api.post('/auth/change-password', data).then(r => r.data)

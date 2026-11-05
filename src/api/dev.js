import api from './client'

// Feature flags
export const getGlobalFlags = () => api.get('/dev/features').then(r => r.data)
export const updateGlobalFlag = (key, data) => api.put(`/dev/features/${key}`, data).then(r => r.data)
export const getMillFlags = (millId) => api.get(`/dev/mills/${millId}/features`).then(r => r.data)
export const setMillFlag = (millId, key, data) => api.put(`/dev/mills/${millId}/features/${key}`, data).then(r => r.data)

// Mills & logos
export const getDevMills = () => api.get('/dev/mills').then(r => r.data)
export const getDevMillLogo = (millId, version) =>
  api.get(`/dev/mills/${millId}/logo`, { params: { v: version }, responseType: 'blob' }).then(r => r.data)
export const uploadMillLogo = (millId, file) => {
  const body = new FormData()
  body.append('file', file)
  return api.put(`/dev/mills/${millId}/logo`, body).then(r => r.data)
}
export const deleteMillLogo = (millId) => api.delete(`/dev/mills/${millId}/logo`)

// Super admins
export const getSuperAdmins = () => api.get('/dev/super-admins').then(r => r.data)
export const createSuperAdmin = (data) => api.post('/dev/super-admins', data).then(r => r.data)
export const toggleSuperAdmin = (id) => api.patch(`/dev/super-admins/${id}/status`).then(r => r.data)
export const resetSuperAdminPassword = (id) => api.post(`/dev/super-admins/${id}/reset-password`).then(r => r.data)

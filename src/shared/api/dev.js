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

// Mills: deactivate / delete (delete needs the mill's exact name as confirmation).
export const setMillStatus = (millId, status) => api.patch(`/dev/mills/${millId}/status`, { status }).then(r => r.data)
export const deleteMill = (millId, confirm) => api.delete(`/dev/mills/${millId}`, { params: { confirm } }).then(r => r.data)
export const deleteSuperAdmin = (id) => api.delete(`/dev/super-admins/${id}`)

// Every account (all roles): list and reset any password (not your own).
export const getAllUsers = () => api.get('/dev/users').then(r => r.data)
export const resetUserPassword = (id) => api.post(`/dev/users/${id}/reset-password`).then(r => r.data)
export const assignMillOwner = (millId, ownerId) => api.put(`/dev/mills/${millId}/owner`, { ownerId }).then(r => r.data)

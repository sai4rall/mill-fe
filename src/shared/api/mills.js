import api, { API_BASE } from './client'

export const getMills = () => api.get('/admin/mills').then(r => r.data)
export const createMill = (data) => api.post('/admin/mills', data).then(r => r.data)
export const updateMill = (id, data) => api.put(`/admin/mills/${id}`, data).then(r => r.data)
export const toggleMillStatus = (id) => api.patch(`/admin/mills/${id}/status`).then(r => r.data)
export const resetMillPassword = (id) => api.post(`/admin/mills/${id}/reset-password`).then(r => r.data)
export const getMillStock = (millId) =>
  api.get('/stock/summary', { headers: { 'X-Mill-Id': millId } }).then(r => r.data)

export const getMillStockStatement = (millId, fromDate, toDate) => {
  const params = {}
  if (fromDate) params.fromDate = fromDate
  if (toDate) params.toDate = toDate
  return api.get('/stock/statement', { headers: { 'X-Mill-Id': millId }, params }).then(r => r.data)
}

export const getMillStockExcelUrl = (millId, millName, fromDate, toDate) => {
  const params = new URLSearchParams({ millName })
  if (fromDate) params.append('fromDate', fromDate)
  if (toDate) params.append('toDate', toDate)
  return `${API_BASE}/stock/statement/export/excel?${params.toString()}`
}

// Super admin: production of each mill of my company for a period.
export const getProductionComparison = (from, to) => api.get('/admin/production', { params: { from, to } }).then(r => r.data)
// Super admin: one of my mills' production report.
export const getMillProduction = (millId, from, to) =>
  api.get('/production', { headers: { 'X-Mill-Id': millId }, params: { from, to } }).then(r => r.data)

// Company quality standards (grade limits A+ … C per product), applied to all of the super admin's mills.
export const getCompanyQualityStandards = () => api.get('/admin/quality-standards').then(r => r.data)
export const saveCompanyQualityStandard = (product, data) => api.put(`/admin/quality-standards/${product}`, data).then(r => r.data)
export const resetCompanyQualityStandard = (product) => api.delete(`/admin/quality-standards/${product}`).then(r => r.data)

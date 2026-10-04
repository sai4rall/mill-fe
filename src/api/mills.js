import api from './client'

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
  return `/api/stock/statement/export/excel?${params.toString()}`
}

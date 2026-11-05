import api from './client'

// Mill (effective table; mill admin may override)
export const getMoistureTable = () => api.get('/moisture-deductions').then(r => r.data)
export const saveMillMoisture = (ranges) => api.put('/moisture-deductions', ranges).then(r => r.data)
export const resetMillMoisture = () => api.delete('/moisture-deductions').then(r => r.data)

// Global (super admin)
export const getGlobalMoisture = () => api.get('/admin/moisture-deductions').then(r => r.data)
export const saveGlobalMoisture = (ranges) => api.put('/admin/moisture-deductions', ranges).then(r => r.data)

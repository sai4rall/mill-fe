import api from './client'

export const getFeatures = () => api.get('/features').then(r => r.data)

import api from './client'

export const getFarmers = () => api.get('/farmers').then(r => r.data)
export const createFarmer = (data) => api.post('/farmers', data).then(r => r.data)
export const updateFarmer = (id, data) => api.put(`/farmers/${id}`, data).then(r => r.data)
export const deleteFarmer = (id) => api.delete(`/farmers/${id}`)

export const getPurchases = () => api.get('/purchases').then(r => r.data)
export const createPurchase = (data) => api.post('/purchases', data).then(r => r.data)

export const getPayments = (purchaseId) => api.get(`/payments?purchaseId=${purchaseId}`).then(r => r.data)
export const createPayment = (data) => api.post('/payments', data).then(r => r.data)

export const getBatches = () => api.get('/mill-batches').then(r => r.data)
export const createBatch = (data) => api.post('/mill-batches', data).then(r => r.data)
export const completeBatch = (id, data) => api.put(`/mill-batches/${id}/complete`, data).then(r => r.data)

export const getCustomers = () => api.get('/customers').then(r => r.data)
export const createCustomer = (data) => api.post('/customers', data).then(r => r.data)
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data).then(r => r.data)

export const getOrders = () => api.get('/orders').then(r => r.data)
export const createOrder = (data) => api.post('/orders', data).then(r => r.data)

export const getShipments = (orderId) => api.get(`/shipments?orderId=${orderId}`).then(r => r.data)
export const createShipment = (data) => api.post('/shipments', data).then(r => r.data)

export const getStock = () => api.get('/stock/summary').then(r => r.data)

export const getTrucks = () => api.get('/trucks').then(r => r.data)
export const getTruckNumbers = () => api.get('/trucks/numbers').then(r => r.data)
export const getTruckPath = (truckNumber, fromDate, toDate) => {
  const params = {}
  if (fromDate) params.fromDate = fromDate
  if (toDate) params.toDate = toDate
  return api.get(`/trucks/${encodeURIComponent(truckNumber)}/path`, { params }).then(r => r.data)
}

export const getOperators = () => api.get('/mill/operators').then(r => r.data)
export const createOperator = (data) => api.post('/mill/operators', data).then(r => r.data)
export const toggleOperatorStatus = (id) => api.patch(`/mill/operators/${id}/status`).then(r => r.data)
export const resetOperatorPassword = (id) => api.post(`/mill/operators/${id}/reset-password`).then(r => r.data)

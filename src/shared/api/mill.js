import api from './client'

export const getFarmers = () => api.get('/farmers').then(r => r.data)
export const createFarmer = (data) => api.post('/farmers', data).then(r => r.data)
export const updateFarmer = (id, data) => api.put(`/farmers/${id}`, data).then(r => r.data)
export const deleteFarmer = (id) => api.delete(`/farmers/${id}`)
export const sendFarmerOtp = (phone) => api.post('/farmers/otp/send', { phone }).then(r => r.data)
export const verifyFarmerOtp = (phone, otp) => api.post('/farmers/otp/verify', { phone, otp }).then(r => r.data)
export const getFarmerPhoto = (id, version) =>
  api.get(`/farmers/${id}/photo`, { params: { v: version }, responseType: 'blob' }).then(r => r.data)
export const uploadFarmerPhoto = (id, file) => {
  const body = new FormData()
  body.append('file', file)
  return api.put(`/farmers/${id}/photo`, body).then(r => r.data)
}
export const deleteFarmerPhoto = (id) => api.delete(`/farmers/${id}/photo`)

export const getPurchases = () => api.get('/purchases').then(r => r.data)
export const createPurchase = (data) => api.post('/purchases', data).then(r => r.data)

export const getPayments = (purchaseId) => api.get(`/payments?purchaseId=${purchaseId}`).then(r => r.data)
export const createPayment = (data) => api.post('/payments', data).then(r => r.data)
export const sendPaymentOtp = (purchaseId, amount) => api.post('/payments/otp/send', { purchaseId, amount }).then(r => r.data)

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

export const getBranding = () => api.get('/mill/branding').then(r => r.data || null)
export const getMillLogo = (version) =>
  api.get('/mill/logo', { params: { v: version }, responseType: 'blob' }).then(r => r.data)

// All shipments of the mill (Shipments page).
export const getAllShipments = () => api.get('/shipments').then(r => r.data)

// GPS device key (mill admin): devices send it as the X-Device-Key header.
export const getGpsKeyStatus = () => api.get('/mill/gps-key').then(r => r.data)
export const rotateGpsKey = () => api.post('/mill/gps-key/rotate').then(r => r.data)

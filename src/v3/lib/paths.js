// All v3 routes live under /v3.
export const V3 = '/v3'
export const v3 = (path = '') => `${V3}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/$/, '') || V3
export const v3HomeFor = (role) =>
  role === 'DEV_ADMIN' ? v3('/dev') : role === 'SUPER_ADMIN' ? v3('/admin') : v3('/dashboard')

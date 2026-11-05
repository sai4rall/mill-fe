// All v4 routes live under /v4.
export const V4 = '/v4'
export const v4 = (path = '') => `${V4}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/$/, '') || V4
export const v4HomeFor = (role) =>
  role === 'DEV_ADMIN' ? v4('/dev') : role === 'SUPER_ADMIN' ? v4('/admin') : v4('/dashboard')

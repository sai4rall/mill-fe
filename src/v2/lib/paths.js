// All v2 routes live under /v2.
export const V2 = '/v2'
export const v2 = (path = '') => `${V2}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/$/, '') || V2
export const v2HomeFor = (role) =>
  role === 'DEV_ADMIN' ? v2('/dev') : role === 'SUPER_ADMIN' ? v2('/admin') : v2('/dashboard')

// Landing page for each role after login.
export const homePathFor = (role) =>
  role === 'DEV_ADMIN' ? '/dev' : role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'

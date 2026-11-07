import axios from 'axios'

// Backend location, fixed at build time:
//  - VITE_API_URL unset/empty → same origin ("/api"): Vite dev proxy locally, nginx BACKEND_URL proxy in Docker.
//  - VITE_API_URL=https://backend.example.com → the browser calls the backend directly (backend must allow CORS).
export const API_BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api`

const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  // Never send a (possibly stale) session token with the sign-in request itself.
  const token = /\/auth\/login$/.test(config.url || '') ? null : localStorage.getItem('token')
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Calls whose 401 means "wrong credentials", not "your session ended": the screen shows the error instead.
const CREDENTIAL_CALLS = /\/auth\/(login|logout)$/

export function clearSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const sessionEnded = err.response?.status === 401 && !CREDENTIAL_CALLS.test(err.config?.url || '') && localStorage.getItem('token')
    if (sessionEnded) {
      clearSession()
      // Stay in whichever UI the user is using (classic, /v2, /v3 or /v4).
      const ui = window.location.pathname.match(/^\/(v2|v3|v4)(\/|$)/)?.[1]
      window.location.href = ui ? `/${ui}/login` : '/login'
    }
    return Promise.reject(err)
  }
)

export default api

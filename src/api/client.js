import axios from 'axios'

// Backend location, fixed at build time:
//  - VITE_API_URL unset/empty → same origin ("/api"): Vite dev proxy locally, nginx BACKEND_URL proxy in Docker.
//  - VITE_API_URL=https://backend.example.com → the browser calls the backend directly (backend must allow CORS).
export const API_BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api`

const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

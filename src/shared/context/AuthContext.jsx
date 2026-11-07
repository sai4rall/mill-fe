import { createContext, useContext, useState } from 'react'
import { login as apiLogin, logout as apiLogout } from '../api/auth'
import { clearSession } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  // Stores a login response. Also used after a password change, which returns a fresh token.
  const refreshSession = (data) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data))
    setUser(data)
    return data
  }

  const login = async (username, password) => refreshSession(await apiLogin({ username, password }))

  // Signs out here at once and revokes the token on the server in the background (so a copied token stops working).
  const logout = () => {
    const token = localStorage.getItem('token')
    clearSession()
    setUser(null)
    if (token) apiLogout(token).catch(() => {})
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

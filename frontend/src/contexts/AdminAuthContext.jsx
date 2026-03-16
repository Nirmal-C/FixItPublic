import { createContext, useContext, useState, useCallback } from 'react'
import apiClient from '../api/client'

const ACCESS_KEY  = 'pfmrs_access_token'
const REFRESH_KEY = 'pfmrs_refresh_token'

const AdminAuthContext = createContext(null)

function decodePayload(token) {
  try { return JSON.parse(atob(token.split('.')[1])) }
  catch { return null }
}

export function AdminAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem(ACCESS_KEY)
  )
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem(ACCESS_KEY)
    return token ? decodePayload(token) : null
  })

  const login = useCallback(async (username, password) => {
    const res = await apiClient.post('/api/auth/token/', { username, password })
    const { access, refresh } = res.data
    const payload = decodePayload(access)

    if (!['admin', 'superuser'].includes(payload?.role)) {
      throw new Error('You do not have admin access.')
    }

    localStorage.setItem(ACCESS_KEY,  access)
    localStorage.setItem(REFRESH_KEY, refresh)
    setIsAuthenticated(true)
    setUser(payload)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    setIsAuthenticated(false)
    setUser(null)
  }, [])

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, login, logout, user }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>')
  return ctx
}
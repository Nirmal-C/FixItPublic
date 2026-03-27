import { createContext, useContext, useState, useCallback } from 'react'
import apiClient from '../api/client'
import { decodePayload, isTokenExpired, clearAuthTokens } from '../utils/authUtils'

const ACCESS_KEY  = 'pfmrs_access_token'
const REFRESH_KEY = 'pfmrs_refresh_token'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem(ACCESS_KEY)
    if (!token) return false
    const payload = decodePayload(token)
    if (!payload || isTokenExpired(payload)) {
      localStorage.removeItem(ACCESS_KEY)
      localStorage.removeItem(REFRESH_KEY)
      return false
    }
    return true
  })
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem(ACCESS_KEY)
    if (!token) return null
    const payload = decodePayload(token)
    if (!payload || isTokenExpired(payload)) return null
    return payload
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
    clearAuthTokens(ACCESS_KEY, REFRESH_KEY)
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
import { createContext, useContext, useState, useCallback } from 'react'
import apiClient, { authApi } from '../api/client'
import { decodePayload, isTokenExpired, clearAuthTokens } from '../utils/authUtils'

const ACCESS_KEY  = 'pfmrs_access_token'
const REFRESH_KEY = 'pfmrs_refresh_token'

const AdminAuthContext = createContext(null)

// Hydrate admin user from localStorage on initial render.
// Enforces that only admin/superuser tokens are accepted — citizen tokens
// are silently cleared so the admin portal never shows a stale citizen session.
function loadUser() {
  const token = localStorage.getItem(ACCESS_KEY)
  if (!token) return null

  const payload = decodePayload(token)

  if (!payload || isTokenExpired(payload)) {
    clearAuthTokens(ACCESS_KEY, REFRESH_KEY)
    return null
  }

  if (!['admin', 'superuser'].includes(payload?.role)) {
    clearAuthTokens(ACCESS_KEY, REFRESH_KEY)
    return null
  }

  return payload
}

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(loadUser)
  const isAuthenticated = !!user

  const _setFromTokens = useCallback((access, refresh) => {
    const payload = decodePayload(access)

    if (!['admin', 'superuser'].includes(payload?.role)) {
      throw new Error('You do not have admin access.')
    }

    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
    setUser(payload)
  }, [])

  const login = useCallback(async (username, password) => {
    const res = await apiClient.post('/api/auth/token/', { username, password })
    const { access, refresh } = res.data
    _setFromTokens(access, refresh)
  }, [_setFromTokens])

  const loginWithGoogle = useCallback(async (googleIdToken) => {
    const res = await authApi.googleAuth(googleIdToken)
    const { access, refresh } = res.data
    _setFromTokens(access, refresh)
    return res.data
  }, [_setFromTokens])

  const logout = useCallback(() => {
    clearAuthTokens(ACCESS_KEY, REFRESH_KEY)
    setUser(null)
  }, [])

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, user, login, loginWithGoogle, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>')
  return ctx
}

import { createContext, useContext, useState, useCallback } from 'react'
import apiClient, { authApi } from '../api/client'

const ACCESS_KEY  = 'pfmrs_access_token'
const REFRESH_KEY = 'pfmrs_refresh_token'

const AdminAuthContext = createContext(null)

// Safer decode (handles unicode)
function decodePayload(token) {
  try {
    const base64 = token.split('.')[1]
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

function isTokenExpired(payload) {
  if (!payload?.exp) return true
  return Date.now() / 1000 > payload.exp - 30
}

// Single loader (cleaner + reusable)
function loadUser() {
  const token = localStorage.getItem(ACCESS_KEY)
  if (!token) return null

  const payload = decodePayload(token)

  if (!payload || isTokenExpired(payload)) {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    return null
  }

  // Ensure only admin roles persist
  if (!['admin', 'superuser'].includes(payload?.role)) {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    return null
  }

  return payload
}

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(loadUser)
  const isAuthenticated = !!user

  const _setFromTokens = useCallback((access, refresh) => {
    const payload = decodePayload(access)

    // Admin-only enforcement
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

  // Google login (clean + no duplicate role logic)
  const loginWithGoogle = useCallback(async (googleIdToken) => {
    const res = await authApi.googleAuth(googleIdToken)
    const { access, refresh } = res.data
    _setFromTokens(access, refresh)
    return res.data
  }, [_setFromTokens])

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    setUser(null)
  }, [])

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        loginWithGoogle, // included
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) {
    throw new Error('useAdminAuth must be used inside <AdminAuthProvider>')
  }
  return ctx
}
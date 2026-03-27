import { createContext, useContext, useState, useCallback } from 'react'
import { authApi } from '../api/client'

const C_ACCESS  = 'pfmrs_citizen_access'
const C_REFRESH = 'pfmrs_citizen_refresh'
const C_PROFILE = 'pfmrs_citizen_profile' // profile overrides not in JWT

const CitizenAuthContext = createContext(null)

// Safer JWT decode (handles unicode)
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
  // 30s buffer for clock skew
  return Date.now() / 1000 > payload.exp - 30
}

function loadUser() {
  const token = localStorage.getItem(C_ACCESS)
  if (!token) return null

  const payload = decodePayload(token)

  if (!payload || isTokenExpired(payload)) {
    localStorage.removeItem(C_ACCESS)
    localStorage.removeItem(C_REFRESH)
    localStorage.removeItem(C_PROFILE)
    return null
  }

  // Merge stored profile overrides
  try {
    const overrides = JSON.parse(localStorage.getItem(C_PROFILE) || 'null') || {}
    return { ...payload, ...overrides }
  } catch {
    return payload
  }
}

export function CitizenAuthProvider({ children }) {
  const [user, setUser] = useState(loadUser)

  const isAuthenticated = !!user

  const _setFromToken = useCallback((access) => {
    localStorage.setItem(C_ACCESS, access)
    setUser(decodePayload(access))
  }, [])

  const handlePostLogin = useCallback((access, refresh) => {
    const payload = decodePayload(access)

    //  Block admin/superuser from citizen portal
    if (['admin', 'superuser'].includes(payload?.role)) {
      const err = new Error('ADMIN_ROLE')
      err.isAdminRole = true
      throw err
    }

    localStorage.setItem(C_REFRESH, refresh)
    localStorage.removeItem(C_PROFILE) // clear previous user overrides
    _setFromToken(access)
  }, [_setFromToken])

  const login = useCallback(async (username, password) => {
    const res = await authApi.login({ username, password })
    const { access, refresh } = res.data
    handlePostLogin(access, refresh)
  }, [handlePostLogin])

  const register = useCallback(async (data) => {
    await authApi.register(data)
    await login(data.username, data.password)
  }, [login])

  // Google login added 
  const loginWithGoogle = useCallback(async (googleIdToken) => {
    const res = await authApi.googleAuth(googleIdToken)
    const { access, refresh } = res.data
    handlePostLogin(access, refresh)
    return res.data
  }, [handlePostLogin])

  const logout = useCallback(() => {
    localStorage.removeItem(C_ACCESS)
    localStorage.removeItem(C_REFRESH)
    localStorage.removeItem(C_PROFILE)
    setUser(null)
  }, [])

  /**
   * Persist profile updates (e.g. email_notifications)
   */
  const updateProfile = useCallback(async (changes) => {
    const res = await authApi.updateProfile(changes)

    try {
      const existing = JSON.parse(localStorage.getItem(C_PROFILE) || 'null') || {}
      localStorage.setItem(C_PROFILE, JSON.stringify({ ...existing, ...changes }))
    } catch {
      // ignore storage errors
    }

    setUser(prev => (prev ? { ...prev, ...changes } : prev))
    return res
  }, [])

  /**
   * Cache avatar URL locally (JWT doesn't include it)
   */
  const cacheAvatar = useCallback((avatarUrl) => {
    try {
      const existing = JSON.parse(localStorage.getItem(C_PROFILE) || 'null') || {}
      localStorage.setItem(C_PROFILE, JSON.stringify({ ...existing, avatar_url: avatarUrl }))
    } catch {
      // ignore storage errors
    }

    setUser(prev => (prev ? { ...prev, avatar_url: avatarUrl } : prev))
  }, [])

  return (
    <CitizenAuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        register,
        loginWithGoogle, 
        logout,
        updateProfile,
        cacheAvatar,
      }}
    >
      {children}
    </CitizenAuthContext.Provider>
  )
}

export function useCitizenAuth() {
  const ctx = useContext(CitizenAuthContext)
  if (!ctx) {
    throw new Error('useCitizenAuth must be used inside <CitizenAuthProvider>')
  }
  return ctx
}
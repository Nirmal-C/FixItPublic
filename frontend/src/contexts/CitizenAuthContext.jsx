import { createContext, useContext, useState, useCallback } from 'react'
import { authApi } from '../api/client'
import { decodePayload, isTokenExpired, clearAuthTokens } from '../utils/authUtils'

const C_ACCESS  = 'pfmrs_citizen_access'
const C_REFRESH = 'pfmrs_citizen_refresh'
const C_PROFILE = 'pfmrs_citizen_profile'

const CitizenAuthContext = createContext(null)

// Hydrate citizen user from localStorage on initial render.
// Merges persisted profile overrides (avatar, email_notifications) that
// are not included in the JWT but must survive page refreshes.
function loadUser() {
  const token = localStorage.getItem(C_ACCESS)
  if (!token) return null

  const payload = decodePayload(token)

  if (!payload || isTokenExpired(payload)) {
    clearAuthTokens(C_ACCESS, C_REFRESH, C_PROFILE)
    return null
  }

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

    // Block admin/superuser accounts from the citizen portal
    if (['admin', 'superuser'].includes(payload?.role)) {
      const err = new Error('ADMIN_ROLE')
      err.isAdminRole = true
      throw err
    }

    localStorage.setItem(C_REFRESH, refresh)
    localStorage.removeItem(C_PROFILE)
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

  const loginWithGoogle = useCallback(async (googleIdToken) => {
    const res = await authApi.googleAuth(googleIdToken)
    const { access, refresh } = res.data
    handlePostLogin(access, refresh)
    return res.data
  }, [handlePostLogin])

  const logout = useCallback(() => {
    clearAuthTokens(C_ACCESS, C_REFRESH, C_PROFILE)
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (changes) => {
    const res = await authApi.updateProfile(changes)
    try {
      const existing = JSON.parse(localStorage.getItem(C_PROFILE) || 'null') || {}
      localStorage.setItem(C_PROFILE, JSON.stringify({ ...existing, ...changes }))
    } catch { /* ignore storage errors */ }
    setUser((prev) => prev ? { ...prev, ...changes } : prev)
    return res
  }, [])

  const cacheAvatar = useCallback((avatarUrl) => {
    try {
      const existing = JSON.parse(localStorage.getItem(C_PROFILE) || 'null') || {}
      localStorage.setItem(C_PROFILE, JSON.stringify({ ...existing, avatar_url: avatarUrl }))
    } catch { /* ignore storage errors */ }
    setUser((prev) => prev ? { ...prev, avatar_url: avatarUrl } : prev)
  }, [])

  return (
    <CitizenAuthContext.Provider value={{
      isAuthenticated, user,
      login, register, loginWithGoogle, logout, updateProfile, cacheAvatar,
    }}>
      {children}
    </CitizenAuthContext.Provider>
  )
}

export function useCitizenAuth() {
  const ctx = useContext(CitizenAuthContext)
  if (!ctx) throw new Error('useCitizenAuth must be used inside <CitizenAuthProvider>')
  return ctx
}

import { createContext, useContext, useState, useCallback } from 'react'
import { authApi } from '../api/client'

const C_ACCESS  = 'pfmrs_citizen_access'
const C_REFRESH = 'pfmrs_citizen_refresh'
const C_PROFILE = 'pfmrs_citizen_profile' // profile overrides not in JWT

const CitizenAuthContext = createContext(null)

function decodePayload(token) {
  try { return JSON.parse(atob(token.split('.')[1])) }
  catch { return null }
}

function isTokenExpired(payload) {
  if (!payload?.exp) return true
  // exp is seconds since epoch — give a 30-second buffer for clock skew
  return Date.now() / 1000 > payload.exp - 30
}

function loadUser() {
  const token = localStorage.getItem(C_ACCESS)
  if (!token) return null
  const payload = decodePayload(token)
  if (!payload || isTokenExpired(payload)) {
    // Stale token — clear storage so we start fresh
    localStorage.removeItem(C_ACCESS)
    localStorage.removeItem(C_REFRESH)
    localStorage.removeItem(C_PROFILE)
    return null
  }
  // Merge profile overrides saved after the JWT was issued (e.g. toggled email_notifications)
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

  const login = useCallback(async (username, password) => {
    const res = await authApi.login({ username, password })
    const { access, refresh } = res.data
    const payload = decodePayload(access)

    // Block admin/superuser accounts from the citizen portal.
    // LoginPage checks err.isAdminRole to show the "use Admin Portal" redirect banner.
    if (['admin', 'superuser'].includes(payload?.role)) {
      const err = new Error('ADMIN_ROLE')
      err.isAdminRole = true
      throw err
    }

    localStorage.setItem(C_REFRESH, refresh)
    _setFromToken(access)
  }, [_setFromToken])

  const register = useCallback(async (data) => {
    await authApi.register(data)
    await login(data.username, data.password)
  }, [login])

  const logout = useCallback(() => {
    localStorage.removeItem(C_ACCESS)
    localStorage.removeItem(C_REFRESH)
    localStorage.removeItem(C_PROFILE)
    setUser(null)
  }, [])

  /**
   * Persist a partial profile update (e.g. toggling email_notifications)
   * via PATCH /api/auth/profile/ then merge changes into local user state.
   * The JWT is not reissued on profile updates so we also persist the changes
   * in localStorage so they survive page refreshes.
   */
  const updateProfile = useCallback(async (changes) => {
    await authApi.updateProfile(changes)
    try {
      const existing = JSON.parse(localStorage.getItem(C_PROFILE) || 'null') || {}
      localStorage.setItem(C_PROFILE, JSON.stringify({ ...existing, ...changes }))
    } catch { /* ignore storage errors */ }
    setUser((prev) => prev ? { ...prev, ...changes } : prev)
  }, [])

  return (
    <CitizenAuthContext.Provider value={{
      isAuthenticated, user,
      login, register, logout, updateProfile,
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

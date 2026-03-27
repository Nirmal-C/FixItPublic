import { createContext, useContext, useState, useCallback } from 'react'
import { authApi } from '../api/client'
import { decodePayload, isTokenExpired, loadStoredUser, clearAuthTokens } from '../utils/authUtils'

const C_ACCESS  = 'pfmrs_citizen_access'
const C_REFRESH = 'pfmrs_citizen_refresh'
const C_PROFILE = 'pfmrs_citizen_profile' // profile overrides not in JWT

const CitizenAuthContext = createContext(null)

/**
 * Hydrate the user from localStorage on initial render.
 * Delegates token decoding, expiry checking, and profile-override
 * merging to the shared authUtils module.
 */
function loadUser() {
  const user = loadStoredUser(C_ACCESS, C_PROFILE)
  // If the stored token is missing or expired, ensure all related keys are wiped
  if (!user) clearAuthTokens(C_REFRESH, C_PROFILE)
  return user
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
    localStorage.removeItem(C_PROFILE) // clear any cached profile overrides from a previous user
    _setFromToken(access)
  }, [_setFromToken])

  const register = useCallback(async (data) => {
    await authApi.register(data)
    await login(data.username, data.password)
  }, [login])

  const logout = useCallback(() => {
    clearAuthTokens(C_ACCESS, C_REFRESH, C_PROFILE)
    setUser(null)
  }, [])

  /**
   * Persist a partial profile update (e.g. toggling email_notifications)
   * via PATCH /api/auth/profile/ then merge changes into local user state.
   * The JWT is not reissued on profile updates so we also persist the changes
   * in localStorage so they survive page refreshes.
   */
  const updateProfile = useCallback(async (changes) => {
    const res = await authApi.updateProfile(changes)
    try {
      const existing = JSON.parse(localStorage.getItem(C_PROFILE) || 'null') || {}
      localStorage.setItem(C_PROFILE, JSON.stringify({ ...existing, ...changes }))
    } catch { /* ignore storage errors */ }
    setUser((prev) => prev ? { ...prev, ...changes } : prev)
    return res
  }, [])

  /**
   * Cache the avatar URL in localStorage after a successful upload.
   * The JWT doesn't include avatar_url, so we persist it in C_PROFILE
   * so it survives page refreshes.
   */
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
      login, register, logout, updateProfile, cacheAvatar,
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

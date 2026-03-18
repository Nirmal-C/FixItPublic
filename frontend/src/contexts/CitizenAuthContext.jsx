import { createContext, useContext, useState, useCallback } from 'react'
import { authApi } from '../api/client'

const C_ACCESS  = 'pfmrs_citizen_access'
const C_REFRESH = 'pfmrs_citizen_refresh'

const CitizenAuthContext = createContext(null)

function decodePayload(token) {
  try { return JSON.parse(atob(token.split('.')[1])) }
  catch { return null }
}

export function CitizenAuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem(C_ACCESS)
    return token ? decodePayload(token) : null
  })

  const isAuthenticated = !!user

  const login = useCallback(async (username, password) => {
    const res = await authApi.login({ username, password })
    const { access, refresh } = res.data
    localStorage.setItem(C_ACCESS, access)
    localStorage.setItem(C_REFRESH, refresh)
    setUser(decodePayload(access))
  }, [])

  const register = useCallback(async (data) => {
    await authApi.register(data)
    await login(data.username, data.password)
  }, [login])

  const logout = useCallback(() => {
    localStorage.removeItem(C_ACCESS)
    localStorage.removeItem(C_REFRESH)
    setUser(null)
  }, [])

  return (
    <CitizenAuthContext.Provider value={{ isAuthenticated, user, login, register, logout }}>
      {children}
    </CitizenAuthContext.Provider>
  )
}

export function useCitizenAuth() {
  const ctx = useContext(CitizenAuthContext)
  if (!ctx) throw new Error('useCitizenAuth must be used inside <CitizenAuthProvider>')
  return ctx
}

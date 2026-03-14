import { createContext, useContext, useState, useCallback } from 'react'

const ADMIN_PASSWORD = 'admin123'
const SESSION_KEY = 'pfmrs_admin_authed'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  // Read sessionStorage on first render so a page refresh doesn't log the admin out.
  // sessionStorage clears automatically when the browser tab is closed.
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'true'
  )

  // Check the password and persist the session flag so a refresh keeps the admin logged in.
  // Returns true on success so the login page can decide whether to redirect.
  const login = useCallback((password) => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setIsAuthenticated(true)
      return true
    }
    return false
  }, [])

  // Clear the session flag and update state — both are needed, otherwise
  // the UI would still show the authenticated state until the next page load.
  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setIsAuthenticated(false)
  }, [])

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>')
  return ctx
}

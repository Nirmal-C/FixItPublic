import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  // Lazy initialiser so we read localStorage before the very first render —
  // avoids a flash of the wrong theme on page load.
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('fixitpublic-theme') || 'dark'
  })

  useEffect(() => {
    // Tailwind's dark mode is class-based, so we toggle on <html>.
    // All CSS variables in index.css are scoped to .light or .dark,
    // so swapping the class is all it takes to re-skin the whole app.
    const root = document.documentElement
    if (theme === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
      root.classList.remove('light')
    }
    localStorage.setItem('fixitpublic-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}

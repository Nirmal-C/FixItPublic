import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './Navbar'
import { Github, Heart } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export default function Layout() {
  const { pathname } = useLocation()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  // Scroll back to top whenever the user navigates to a different route.
  // Without this, React keeps the scroll position from the previous page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  return (
    <div
      className="flex flex-col min-h-screen transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <Navbar />

      {/* Decorative background orbs — fixed so they don't scroll with the page.
          pointer-events-none and -z-10 make sure they never block clicks. */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div
          className="orb-1 absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
          style={{
            background: isLight
              ? 'radial-gradient(circle, rgba(102,126,234,0.08) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          className="orb-2 absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full"
          style={{
            background: isLight
              ? 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          className="orb-3 absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full"
          style={{
            background: isLight
              ? 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
          }}
        />
      </div>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer
        className="mt-16 transition-colors duration-300"
        style={{ borderTop: `1px solid var(--divider)` }}
      >
        <div className="section-container py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} FixItPublic — MSE800 Group Project
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <span>Built with</span>
              <Heart size={13} className="text-rose-500" fill="currentColor" />
              <span>by Rukshan &amp; Nirmal</span>
            </div>
            <a
              href="https://github.com/Nirmal-C/FixItPublic"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Github size={14} />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

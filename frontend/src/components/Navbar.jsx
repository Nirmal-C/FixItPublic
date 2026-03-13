import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Menu, X, Wrench, AlertCircle, Sun, Moon } from 'lucide-react'
import { NAV_LINKS } from '../utils/constants'
import { useTheme } from '../contexts/ThemeContext'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const isLight = theme === 'light'

  // React Router passes { isActive } into the className function — we use it
  // to highlight whichever route the user is currently on.
  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-150 px-1 py-0.5 rounded
     ${isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-100'}`

  return (
    <nav className="navbar">
      <div className="section-container">
        <div className="flex items-center justify-between h-16">

          <Link to="/" className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 0 16px rgba(102,126,234,0.4)',
              }}
            >
              <Wrench size={16} className="text-white" />
            </div>
            <div className="leading-none">
              <span className="text-sm font-bold text-slate-100 group-hover:text-white transition-colors">
                FixIt
              </span>
              <span
                className="text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, #818cf8, #67e8f9)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Public
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.path} to={link.path} end={link.path === '/'} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/requests" className="btn-ghost text-xs gap-1.5">
              <AlertCircle size={14} />
              View Reports
            </Link>

            <button
              onClick={toggleTheme}
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              className="relative w-14 h-7 rounded-full flex items-center px-1 transition-all duration-300 border"
              style={{
                background: isLight
                  ? 'linear-gradient(135deg, #e0e7ff, #c7d2fe)'
                  : 'linear-gradient(135deg, #1e1b4b, #312e81)',
                borderColor: isLight ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.4)',
                boxShadow: isLight
                  ? '0 0 12px rgba(99,102,241,0.2)'
                  : '0 0 12px rgba(99,102,241,0.35)',
              }}
            >
              <Sun
                size={11}
                className="absolute left-1.5 transition-opacity duration-200"
                style={{ color: '#f59e0b', opacity: isLight ? 1 : 0.3 }}
              />
              <Moon
                size={11}
                className="absolute right-1.5 transition-opacity duration-200"
                style={{ color: '#818cf8', opacity: isLight ? 0.3 : 1 }}
              />
              {/* Sliding thumb — translateX(27px) moves it to the right end of the 56px track */}
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-all duration-300 z-10"
                style={{
                  transform: isLight ? 'translateX(27px)' : 'translateX(0px)',
                  background: isLight
                    ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                    : 'linear-gradient(135deg, #818cf8, #6366f1)',
                  boxShadow: isLight
                    ? '0 0 8px rgba(245,158,11,0.6)'
                    : '0 0 8px rgba(129,140,248,0.6)',
                }}
              >
                {isLight
                  ? <Sun size={10} className="text-white" />
                  : <Moon size={10} className="text-white" />
                }
              </span>
            </button>

            <Link to="/report" className="btn-primary text-xs px-4 py-2">
              + Report Issue
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="btn-ghost p-2"
            >
              {isLight
                ? <Sun size={18} className="text-amber-400" />
                : <Moon size={18} className="text-indigo-400" />
              }
            </button>
            <button
              className="btn-ghost p-2"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="md:hidden border-t border-white/[0.06] animate-slide-down"
          style={{ background: isLight ? 'rgba(241,245,249,0.97)' : 'rgba(10,15,30,0.97)' }}
        >
          <div className="section-container py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-xl text-sm font-medium transition-colors
                   ${isActive
                     ? 'text-indigo-400 bg-indigo-400/10'
                     : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                   }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="pt-3 border-t border-white/[0.06] mt-2">
              <Link
                to="/report"
                onClick={() => setMobileOpen(false)}
                className="btn-primary w-full justify-center"
              >
                + Report Issue
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

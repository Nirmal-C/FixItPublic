import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Menu, X, Sun, Moon, Building2, AlertCircle } from 'lucide-react'
import { NAV_LINKS } from '../utils/constants'
import { useTheme } from '../contexts/ThemeContext'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  // Active link: gold text + gold bottom border; inactive: muted white
  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-all duration-150 px-1 pb-0.5 border-b-2 ${
      isActive
        ? 'text-amber-300 border-amber-300'
        : 'text-white/75 border-transparent hover:text-white hover:border-white/40'
    }`

  return (
    <nav className="navbar">
      {/* ── Authority strip ── */}
      <div style={{ backgroundColor: '#001428', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="section-container">
          <div className="flex items-center gap-2 py-1">
            <Building2 size={10} className="text-white/40" />
            <span className="text-[10px] text-white/40 font-medium tracking-widest uppercase">
              Aotearoa New Zealand · Public Infrastructure Services — Master of Software Engineering · Yoobee College Auckland
            </span>
          </div>
        </div>
      </div>

      {/* ── Main navigation bar ── */}
      <div className="section-container">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div
              className="w-8 h-8 rounded flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#FFC72C' }}
            >
              <Building2 size={16} style={{ color: '#002040' }} />
            </div>
            <div className="leading-none">
              <div>
                <span className="text-sm font-bold text-white">FixIt</span>
                <span className="text-sm font-bold" style={{ color: '#FFC72C' }}>Public</span>
              </div>
              <div className="text-[9px] text-white/35 font-normal tracking-widest uppercase mt-0.5 hidden sm:block">
                Pūrongo · Aroturuki · Otinga
              </div>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === '/'}
                className={navLinkClass}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            {/* Theme toggle — compact icon button */}
            <button
              onClick={toggleTheme}
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              className="flex items-center justify-center w-8 h-8 rounded transition-all duration-150"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              {isLight
                ? <Sun  size={14} className="text-amber-300" />
                : <Moon size={14} className="text-white/60" />
              }
            </button>

            <Link
              to="/requests"
              className="text-xs font-medium px-3 py-1.5 rounded transition-all duration-150 flex items-center gap-1.5"
              style={{ color: 'rgba(255,255,255,0.65)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.background = 'transparent' }}
            >
              <AlertCircle size={13} />
              View Reports
            </Link>

            {/* Primary CTA — government gold */}
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition-all duration-150"
              style={{ background: '#FFC72C', color: '#002040' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#FFD45C'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#FFC72C'}
            >
              + Report Issue
            </Link>
          </div>

          {/* Mobile controls */}
          <div className="md:hidden flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 text-white/60 hover:text-white transition-colors"
            >
              {isLight ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              className="p-2 text-white/70 hover:text-white transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div
          className="md:hidden animate-slide-down"
          style={{ backgroundColor: '#001E3C', borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="section-container py-4 flex flex-col gap-0.5">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-amber-300 bg-white/6'
                      : 'text-white/65 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="pt-3 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <Link
                to="/report"
                onClick={() => setMobileOpen(false)}
                className="w-full inline-flex items-center justify-center py-2.5 rounded text-sm font-bold"
                style={{ background: '#FFC72C', color: '#002040' }}
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

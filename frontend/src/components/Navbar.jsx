import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { Menu, X, Sun, Moon, Building2, AlertCircle, LogIn, UserCircle, LogOut, ChevronDown, Bell, BellOff, LayoutDashboard } from 'lucide-react'
import { NAV_LINKS } from '../utils/constants'
import { useTheme } from '../contexts/ThemeContext'
import { useCitizenAuth } from '../contexts/CitizenAuthContext'

export default function Navbar() {
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { theme, toggleTheme }        = useTheme()
  const { isAuthenticated, user, logout, updateProfile } = useCitizenAuth()
  const navigate = useNavigate()
  const menuRef  = useRef(null)
  const isLight  = theme === 'light'
  const [togglingNotif, setTogglingNotif] = useState(false)

  const handleToggleNotifications = async (e) => {
    e.stopPropagation()
    if (togglingNotif) return
    setTogglingNotif(true)
    try {
      await updateProfile({ email_notifications: !user?.email_notifications })
    } finally {
      setTogglingNotif(false)
    }
  }

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { logout(); setUserMenuOpen(false); navigate('/') }

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

            {/* Auth — Sign In or user menu */}
            {isAuthenticated ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all duration-150"
                  style={{ color: 'rgba(255,255,255,0.75)', background: userMenuOpen ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                >
                  <UserCircle size={15} />
                  {user?.username || 'Account'}
                  <ChevronDown size={12} style={{ transform: userMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl py-1 z-50"
                    style={{ background: '#001E3C', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                  >
                    <Link
                      to="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <LayoutDashboard size={13} /> My Dashboard
                    </Link>
                    <Link
                      to="/track"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <AlertCircle size={13} /> My Reports
                    </Link>
                    <button
                      onClick={handleToggleNotifications}
                      disabled={togglingNotif}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2">
                        {user?.email_notifications
                          ? <Bell size={13} className="text-indigo-400" />
                          : <BellOff size={13} />
                        }
                        Email updates
                      </span>
                      <span
                        className="w-7 h-4 rounded-full flex items-center transition-colors duration-200 shrink-0"
                        style={{ background: user?.email_notifications ? '#6366f1' : 'rgba(255,255,255,0.15)', padding: '2px' }}
                      >
                        <span
                          className="w-3 h-3 rounded-full bg-white transition-transform duration-200"
                          style={{ transform: user?.email_notifications ? 'translateX(12px)' : 'translateX(0)' }}
                        />
                      </span>
                    </button>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '2px 0' }} />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-white/5 transition-colors"
                    >
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all duration-150"
                style={{ color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.15)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
              >
                <LogIn size={13} /> Sign In
              </Link>
            )}

            {/* Primary CTA */}
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
          className="md:hidden"
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
            <div className="pt-3 mt-2 flex flex-col gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <Link
                to="/report"
                onClick={() => setMobileOpen(false)}
                className="w-full inline-flex items-center justify-center py-2.5 rounded text-sm font-bold"
                style={{ background: '#FFC72C', color: '#002040' }}
              >
                + Report Issue
              </Link>
              {isAuthenticated ? (
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false) }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded text-sm font-medium text-rose-400"
                  style={{ border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded text-sm font-medium"
                  style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)' }}
                >
                  <LogIn size={14} /> Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

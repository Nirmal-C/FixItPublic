import { useState } from 'react'
import { Outlet, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Ticket, BrainCircuit, LogOut,
  Menu, X, ChevronLeft, ChevronRight, Sun, Moon, Building2,
} from 'lucide-react'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { useTheme } from '../../contexts/ThemeContext'

const ADMIN_NAV = [
  { path: '/admin',         label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/tickets', label: 'Tickets',   icon: Ticket },
  { path: '/admin/ai-log',  label: 'AI Log',    icon: BrainCircuit },
]

const PAGE_TITLES = {
  '/admin':         'Dashboard',
  '/admin/tickets': 'Tickets',
  '/admin/ai-log':  'AI Log',
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed,  setCollapsed]  = useState(false)

  const { isAuthenticated, logout } = useAdminAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const isLight = theme === 'light'

  // Guard — redirect unauthenticated visitors
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const W = collapsed ? 64 : 256
  const pageTitle = PAGE_TITLES[pathname] || 'Admin'

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed to the left, always dark navy regardless of light/dark mode */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          width: `${W}px`,
          backgroundColor: '#001E3C',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Logo / header row */}
        <div
          className="flex items-center h-14 px-4 shrink-0"
          style={{ borderBottom: '3px solid #FFC72C' }}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-7 h-7 rounded flex items-center justify-center shrink-0"
                style={{ backgroundColor: '#FFC72C' }}
              >
                <Building2 size={13} style={{ color: '#001E3C' }} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-white truncate block">Admin Portal</span>
                <span className="text-[9px] text-white/35 uppercase tracking-widest">Restricted Access</span>
              </div>
            </div>
          )}
          {/* Collapse toggle (desktop) */}
          <button
            onClick={() => { setCollapsed((v) => !v); setMobileOpen(false) }}
            className="p-1.5 hidden md:flex shrink-0 text-white/30 hover:text-white/70 transition-colors rounded"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight size={15} />
              : <ChevronLeft  size={15} />
            }
          </button>
          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 md:hidden text-white/50 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {ADMIN_NAV.map(({ path, label, icon: Icon, exact }) => (
            <NavLink
              key={path}
              to={path}
              end={exact}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'text-amber-300 bg-white/10'
                    : 'text-white/55 hover:text-white hover:bg-white/5'
                }`
              }
              style={({ isActive }) => ({
                paddingLeft: collapsed ? '1.25rem' : '1rem',
                paddingRight: '1rem',
                borderLeft: `3px solid ${isActive ? '#FFC72C' : 'transparent'}`,
              })}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle + bottom */}
        <div
          className="px-3 py-4 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm
                       text-white/40 hover:text-white/80 hover:bg-white/5 transition-all duration-150"
            title={collapsed ? (isLight ? 'Switch to dark' : 'Switch to light') : undefined}
          >
            {isLight
              ? <Sun  size={16} className="shrink-0 text-amber-300" />
              : <Moon size={16} className="shrink-0 text-white/40" />
            }
            {!collapsed && <span>{isLight ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        </div>
      </aside>

      {/* Main content area — shifts right by the sidebar width to avoid overlap */}
      <div
        className="flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: `${W}px` }}
      >
        {/* Top header bar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-6 h-14 shrink-0"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--divider)',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="btn-ghost p-2 md:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            {/* Page title with accent stripe */}
            <div className="flex items-center gap-2">
              <div
                className="w-1 h-5 rounded-full"
                style={{ backgroundColor: 'var(--accent)' }}
              />
              <h1
                className="text-sm font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {pageTitle}
              </h1>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded
                       transition-all duration-150"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.07)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

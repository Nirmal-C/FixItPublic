import { useState } from 'react'
import { Outlet, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Ticket, BrainCircuit, LogOut,
  Menu, X, ChevronLeft, ChevronRight, Sun, Moon, Wrench,
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
  const [collapsed, setCollapsed] = useState(false)

  const { isAuthenticated, logout } = useAdminAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isLight = theme === 'light'

  // Guard — any child of this layout is protected
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const W = collapsed ? 64 : 256
  const pageTitle = PAGE_TITLES[pathname] || 'Admin'

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'text-indigo-400 bg-indigo-400/10'
        : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
    }`

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          width: `${W}px`,
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--card-border)',
        }}
      >
        {/* Logo row */}
        <div
          className="flex items-center h-16 px-4 shrink-0"
          style={{ borderBottom: '1px solid var(--divider)' }}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                <Wrench size={13} className="text-white" />
              </div>
              <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                Admin Panel
              </span>
            </div>
          )}
          <button
            onClick={() => { setCollapsed((v) => !v); setMobileOpen(false) }}
            className="btn-ghost p-1.5 hidden md:flex shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight size={15} className="text-slate-400" />
              : <ChevronLeft size={15} className="text-slate-400" />
            }
          </button>
          {/* Mobile close */}
          <button onClick={() => setMobileOpen(false)} className="btn-ghost p-1.5 md:hidden">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {ADMIN_NAV.map(({ path, label, icon: Icon, exact }) => (
            <NavLink
              key={path}
              to={path}
              end={exact}
              onClick={() => setMobileOpen(false)}
              className={navLinkClass}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle */}
        <div className="px-3 py-4 shrink-0" style={{ borderTop: '1px solid var(--divider)' }}>
          <button
            onClick={toggleTheme}
            className="btn-ghost w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-100"
            title={collapsed ? (isLight ? 'Switch to dark' : 'Switch to light') : undefined}
          >
            {isLight
              ? <Sun size={17} className="shrink-0 text-amber-400" />
              : <Moon size={17} className="shrink-0 text-indigo-400" />
            }
            {!collapsed && <span>{isLight ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        </div>
      </aside>

      {/* Main — offset by sidebar on desktop */}
      <div
        className="flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: `${W}px` }}
      >
        {/* Top header */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-6 h-16 shrink-0"
          style={{
            background: isLight ? 'rgba(241,245,249,0.92)' : 'rgba(10,15,30,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--divider)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="btn-ghost p-2 md:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {pageTitle}
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="btn-ghost flex items-center gap-2 text-sm text-slate-400 hover:text-rose-400 transition-colors"
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

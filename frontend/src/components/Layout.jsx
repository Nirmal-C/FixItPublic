import { Outlet, useLocation, Link } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './Navbar'
import { Github, Building2, ExternalLink } from 'lucide-react'

export default function Layout() {
  const { pathname } = useLocation()

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  return (
    <div
      className="flex flex-col min-h-screen transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <Navbar />

      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Government-style footer ── */}
      <footer style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '3px solid var(--accent)' }}>

        {/* Main footer grid */}
        <div className="section-container py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">

            {/* Brand / About */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded flex items-center justify-center"
                  style={{ backgroundColor: '#FFC72C' }}
                >
                  <Building2 size={14} style={{ color: '#002040' }} />
                </div>
                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  FixItPublic
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Auckland City Infrastructure Services — a public facility reporting platform
                connecting residents with local councils.
              </p>
              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                Ngā Ratonga Hanganga o Tāmaki Makaurau
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Master of Software Engineering · Yoobee College Auckland
              </p>
            </div>

            {/* Quick links */}
            <div className="flex flex-col gap-2">
              <h4
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Quick Links <span className="font-normal opacity-60 normal-case tracking-normal">· Ara Tere</span>
              </h4>
              {[
                { to: '/',         label: 'Home · Kāinga' },
                { to: '/report',   label: 'Report an Issue · Pūrongo' },
                { to: '/requests', label: 'View Reports · Tirohia' },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-xs transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Credits / Contact */}
            <div className="flex flex-col gap-2">
              <h4
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Project
              </h4>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Developed by Rukshan &amp; Nirmal
              </span>
              <a
                href="https://github.com/Nirmal-C/FixItPublic"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs inline-flex items-center gap-1.5 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <Github size={12} />
                GitHub Repository
                <ExternalLink size={10} />
              </a>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Sprint 2 — Public Reporting Platform
              </span>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-6"
            style={{ borderTop: '1px solid var(--divider)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              &copy; {new Date().getFullYear()} FixItPublic. All rights reserved.
            </p>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              For academic purposes only — not an official government service.{' '}
              <span className="italic">He kaupeka ako noa — ehara i te ratonga kāwanatanga ōkawa.</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

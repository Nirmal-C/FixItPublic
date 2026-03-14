import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, ArrowLeft, Building2, ShieldCheck } from 'lucide-react'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { useToast } from '../../components/Toast'

export default function AdminLoginPage() {
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error,        setError]        = useState(null)
  const [loading,      setLoading]      = useState(false)

  const { isAuthenticated, login } = useAdminAuth()
  const toast    = useToast()
  const navigate = useNavigate()

  if (isAuthenticated) return <Navigate to="/admin" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    await new Promise((r) => setTimeout(r, 400))
    const ok = login(password)
    if (ok) {
      toast.success('Welcome back, Admin', { title: 'Logged in' })
      navigate('/admin')
    } else {
      setError('Incorrect password. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="w-full max-w-sm animate-fade-in">

        {/* ── Government header banner ── */}
        <div
          className="rounded-t-lg px-8 py-6 text-center"
          style={{ backgroundColor: '#001E3C', borderBottom: '3px solid #FFC72C' }}
        >
          {/* Coat-of-arms style icon */}
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#FFC72C' }}
          >
            <Building2 size={26} style={{ color: '#001E3C' }} />
          </div>
          <h1 className="text-lg font-bold text-white">Admin Portal</h1>
          <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest font-medium">
            Restricted Access — Authorised Personnel Only
          </p>
        </div>

        {/* ── Login form card ── */}
        <div
          className="rounded-b-lg px-8 py-7 flex flex-col gap-5"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderTop: 'none',
          }}
        >
          {/* Service name */}
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              FixItPublic — Auckland City Infrastructure Services
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  className={`form-input pr-10 ${error ? 'error' : ''}`}
                  placeholder="Enter admin password"
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="btn-ghost absolute right-2 top-1/2 -translate-y-1/2 p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff size={15} />
                    : <Eye    size={15} />
                  }
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded text-sm animate-slide-down"
                style={{
                  background: 'rgba(220,38,38,0.08)',
                  border: '1px solid rgba(220,38,38,0.30)',
                  color: '#ef4444',
                }}
              >
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-2.5 justify-center"
              disabled={loading || !password}
            >
              {loading
                ? 'Signing in…'
                : <><ShieldCheck size={16} /> Sign In Securely</>
              }
            </button>
          </form>

          {/* Back link */}
          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <ArrowLeft size={14} />
            Back to public site
          </Link>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-[10px] mt-4" style={{ color: 'var(--text-muted)' }}>
          Unauthorised access to this system is prohibited. All activity is monitored.
        </p>
      </div>
    </div>
  )
}

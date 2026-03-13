import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../components/Toast'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const { isAuthenticated, login } = useAdminAuth()
  const { theme } = useTheme()
  const toast = useToast()
  const navigate = useNavigate()
  const isLight = theme === 'light'

  // Already logged in — skip the login page
  if (isAuthenticated) return <Navigate to="/admin" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    // Small delay so it doesn't feel instant — makes the auth feel more real
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
      className="min-h-screen flex items-center justify-center px-4 relative"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Same decorative background as the public Layout */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
          style={{
            background: isLight
              ? 'radial-gradient(circle, rgba(102,126,234,0.08) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full"
          style={{
            background: isLight
              ? 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="glass p-8 w-full max-w-sm animate-fade-in flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 0 20px rgba(102,126,234,0.4)',
            }}
          >
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
              Admin Panel
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">FixItPublic — restricted access</p>
          </div>
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
                  ? <EyeOff size={15} className="text-slate-400" />
                  : <Eye size={15} className="text-slate-400" />
                }
              </button>
            </div>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm animate-slide-down"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
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
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Back link */}
        <Link
          to="/"
          className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to public site
        </Link>
      </div>
    </div>
  )
}

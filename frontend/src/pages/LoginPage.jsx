import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { User, Lock, AlertCircle, Loader2, Building2, Eye, EyeOff } from 'lucide-react'
import { useCitizenAuth } from '../contexts/CitizenAuthContext'
import { useToast } from '../components/Toast'

export default function LoginPage() {
  const [form, setForm]         = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const { login } = useCitizenAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const toast     = useToast()

  const from = location.state?.from || '/'

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('Please enter your username and password.')
      return
    }
    setLoading(true)
    try {
      await login(form.username.trim(), form.password)
      toast.success(`Welcome back, ${form.username}!`, { title: 'Signed in' })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err?.userMessage || 'Invalid username or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md animate-slide-up">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFC72C' }}>
              <Building2 size={20} style={{ color: '#002040' }} />
            </div>
            <div>
              <span className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>FixIt</span>
              <span className="text-lg font-extrabold" style={{ color: '#FFC72C' }}>Public</span>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="glass p-8 flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Sign in</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Access your reports and track your submissions
            </p>
          </div>

          {error && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div>
              <label className="form-label">
                <User size={13} className="inline mr-1.5 text-indigo-400" />
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={set('username')}
                className="form-input"
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="form-label mb-0">
                  <Lock size={13} className="inline mr-1.5 text-indigo-400" />
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  className="form-input pr-10"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 mt-1 gap-2"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : 'Sign In'}
            </button>
          </form>

          <div className="text-center text-sm" style={{ borderTop: '1px solid var(--divider)', paddingTop: '1.25rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Create one
            </Link>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          Anonymous reporting is always available —{' '}
          <Link to="/report" className="text-indigo-400 hover:underline">
            submit without an account
          </Link>
        </p>
      </div>
    </div>
  )
}
